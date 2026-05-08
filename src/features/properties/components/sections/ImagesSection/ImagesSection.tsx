"use client";

import type React from "react";
import { createRef, useEffect, useRef } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import ImageCarouselUpload from "@/components/organisms/ImageCarouselUpload/ImageCarouselUpload";
import { ImageItem, ResolvedFileItem } from "@/features/properties/types/media";
import ImageReorderModal from "@/components/organisms/ImageCarouselUpload/components/ImageReorderModal";
import { useState } from "react";
import { useMe } from "@/shared/api/auth/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";

export type PhotoFolder = {
  id: string;
  title: string;
  items: ImageItem[];
};

type Props = {
  /* 가로 폴더(카드형) */
  folders: PhotoFolder[];
  onChangeFolderTitle?: (folderIdx: number, nextTitle: string) => void;

  /** 새 시그니처: (idx, FileList|null) */
  onAddToFolder?: (
    folderIdx: number,
    files: FileList | null
  ) => void | Promise<void>;

  onAddFolder: () => void;
  onRemoveFolder?: (
    folderIdx: number,
    opts?: { keepAtLeastOne?: boolean }
  ) => void;

  maxPerCard: number;

  onChangeCaption?: (folderIdx: number, imageIdx: number, text: string) => void;
  onRemoveImage?: (folderIdx: number, imageIdx: number) => void;

  /* 세로형 파일 대기열(= 폴더 1개) */
  fileItems: ResolvedFileItem[];
  onAddFiles: (files: FileList | null) => void;

  /** 세로 폴더 제목 변경 → photo-group title 변경 */
  onChangeVerticalFolderTitle?: (nextTitle: string) => void;

  /** 필요하면 세로 이미지 개별 캡션 */
  onChangeFileItemCaption?: (index: number, text: string) => void;
  onRemoveFileItem?: (index: number) => void;
  maxFiles: number;

  /** ✅ 폴더 전체 순서 교체 (모달용) */
  onReorderFolder?: (folderIdx: number, nextItems: ImageItem[]) => void;
  onReorderVerticalFolder?: (nextItems: ImageItem[]) => void;

  /** 세로 폴더의 현재 제목 */
  verticalFolderTitle?: string;

  onSetCover?: (photoId: number | string | undefined) => void | Promise<void>;

  syncServer?: boolean;
};

export default function ImagesSection({
  folders,
  onChangeFolderTitle,
  onAddToFolder,
  onAddFolder,
  onRemoveFolder,
  maxPerCard,
  onChangeCaption,
  onRemoveImage,
  fileItems,
  onAddFiles,
  onChangeVerticalFolderTitle,
  onChangeFileItemCaption,
  onRemoveFileItem,
  maxFiles,
  onReorderFolder,
  onReorderVerticalFolder,
  verticalFolderTitle,
}: Props) {
  const hasFolders = Array.isArray(folders) && folders.length > 0;

  useEffect(() => {
    if (!hasFolders) onAddFolder?.();
  }, [hasFolders, onAddFolder]);

  // ✅ 순서 변경 대상 상태
  const { data: me } = useMe();
  const isManager = me?.role === "admin" || me?.role === "manager";

  const [reorderIdx, setReorderIdx] = useState<number | "vertical" | null>(null);

  // ✅ 커스텀 알림 모달 상태
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // ✅ 속지/파일 폴더 노출 상태 (기존 파일이 있거나 사용자가 추가를 명시적으로 클릭한 경우)
  const [showVerticalFolder, setShowVerticalFolder] = useState(() => fileItems.length > 0);

  useEffect(() => {
    if (fileItems.length > 0) {
      setShowVerticalFolder(true);
    }
  }, [fileItems.length]);

  const handleRemoveVerticalAll = () => {
    if (!onRemoveFileItem) return;

    // 기존에 저장된 속지/첨부파일이 포함되어 있다면 삭제 제약
    const hasServerFiles = fileItems.some((it) => (it as any).id != null);
    if (hasServerFiles && !isManager) {
      showAlert("기존에 저장된 속지/첨부파일은 관리자(Manager) 이상만 삭제할 수 있습니다.");
      return;
    }

    // 역순으로 지워 인덱스 꼬임 방지
    for (let i = fileItems.length - 1; i >= 0; i--) {
      onRemoveFileItem(i);
    }
    setShowVerticalFolder(false);
  };

  const handleRemoveFile = (index: number) => {
    const item = fileItems[index];
    const isServerPhoto = (item as any)?.id != null;

    if (isServerPhoto && !isManager) {
      showAlert("기존에 저장된 속지 이미지는 관리자(Manager) 이상만 삭제할 수 있습니다.");
      return;
    }
    onRemoveFileItem?.(index);
  };

  const renderFolders: PhotoFolder[] = hasFolders
    ? folders
    : [{ id: "__placeholder__", title: "", items: [] }];

  const handleRemove = (folderIdx: number, imageIdx: number) => {
    const folder = folders[folderIdx];
    const item = folder?.items?.[imageIdx];
    const isServerPhoto = (item as any)?.id != null;

    if (isServerPhoto && !isManager) {
      showAlert("기존에 저장된 매물 사진은 관리자만 삭제할 수 있습니다.\n관리자에게 문의 해주세요");
      return;
    }
    onRemoveImage?.(folderIdx, imageIdx);
  };

  const handleRemoveFolder = (folderIdx: number) => {
    const folder = folders[folderIdx];
    const isServerFolder = folder && !String(folder.id).startsWith("folder-");
    const hasServerPhotos = folder?.items?.some((it) => (it as any).id != null);

    if ((isServerFolder || hasServerPhotos) && !isManager) {
      showAlert("기존에 저장된 매물 사진 폴더는 관리자만 삭제할 수 있습니다.\n관리자에게 문의 해주세요");
      return;
    }
    onRemoveFolder?.(folderIdx);
  };

  /* 가로 폴더 input refs (ImageCarouselUpload 에 넘길 RefObject) */
  const cardInputRefs = useRef<Array<React.RefObject<HTMLInputElement>>>([]);
  if (cardInputRefs.current.length !== renderFolders.length) {
    cardInputRefs.current = Array.from(
      { length: renderFolders.length },
      (_, i) => cardInputRefs.current[i] ?? createRef<HTMLInputElement>()
    );
  }

  /* 세로 폴더 input */
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section
      className="relative z-0 isolate flex flex-col gap-3"
      data-images-root
    >
      {/* 가로 폴더들 */}
      {renderFolders.map((folder, idx) => {
        const fallbackLabel = `사진 폴더 ${idx + 1}`;
        const titleForInput =
          !folder.title || /^사진\s*폴더\s*\d+$/i.test(folder.title.trim())
            ? ""
            : folder.title;

        return (
          <div
            key={`${folder.id ?? "folder"}-${idx}`}
            className="image-card rounded-xl border p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-700">
                {fallbackLabel}
              </div>
              {idx > 0 && hasFolders && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleRemoveFolder(idx)}
                >
                  폴더 삭제
                </Button>
              )}
            </div>

            <ImageCarouselUpload
              items={folder.items}
              maxCount={maxPerCard}
              layout="wide"
              wideAspectClass="aspect-video"
              objectFit="cover"
              captionAsFolderTitle
              folderTitle={titleForInput}
              onChangeFolderTitle={(text) => onChangeFolderTitle?.(idx, text)}
              onRemoveImage={(imageIdx) => handleRemove(idx, imageIdx)}
              onOpenPicker={() => cardInputRefs.current[idx]?.current?.click()}
              inputRef={cardInputRefs.current[idx]}
              onChangeFiles={(files) => onAddToFolder?.(idx, files)}
              onChangeCaption={(imageIdx, text) =>
                onChangeCaption?.(idx, imageIdx, text)
              }
              onOpenReorder={() => setReorderIdx(idx)}
            />
          </div>
        );
      })}

      {/* 추가 버튼 그룹 (사진 폴더 및 속지/파일 폴더 개별 추가) */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 justify-center gap-2 border-dashed bg-slate-50/50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 transition-all duration-200"
          onClick={onAddFolder}
        >
          <FolderPlus className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">사진 폴더 추가</span>
        </Button>

        {!showVerticalFolder && (
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 justify-center gap-2 border-dashed bg-slate-50/50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 transition-all duration-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={() => setShowVerticalFolder(true)}
          >
            <FolderPlus className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">속지 폴더 추가</span>
          </Button>
        )}
      </div>

      {/* 세로 폴더 (속지 이미지) */}
      {showVerticalFolder && (
        <div className="image-card rounded-xl border p-3 animate-in fade-in slide-in-from-bottom-2 duration-250">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              속지 폴더
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-7 px-2 text-[11px] text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20"
              onClick={handleRemoveVerticalAll}
            >
              폴더 삭제
            </Button>
          </div>

          <ImageCarouselUpload
            items={fileItems}
            maxCount={maxFiles}
            layout="tall"
            tallHeightClass="h-80"
            objectFit="cover"
            captionAsFolderTitle
            folderTitle={verticalFolderTitle ?? ""}
            onChangeFolderTitle={(text) => onChangeVerticalFolderTitle?.(text)}
            onRemoveImage={handleRemoveFile}
            onOpenPicker={() => fileInputRef.current?.click()}
            inputRef={fileInputRef}
            onChangeFiles={(files) => {
              onAddFiles(files);
            }}
            onChangeCaption={(index, text) =>
              onChangeFileItemCaption?.(index, text)
            }
            onOpenReorder={() => setReorderIdx("vertical")}
          />
        </div>
      )}

      {/* ✅ 순서 조정 모달 */}
      <ImageReorderModal
        open={reorderIdx !== null}
        onClose={() => setReorderIdx(null)}
        title={
          reorderIdx === "vertical"
            ? verticalFolderTitle || "파일 폴더"
            : folders[Number(reorderIdx)]?.title || `사진 폴더 ${Number(reorderIdx) + 1}`
        }
        items={
          reorderIdx === "vertical"
            ? (fileItems as any)
            : folders[Number(reorderIdx)]?.items || []
        }
        onApply={(newItems) => {
          if (reorderIdx === null) return;
          if (reorderIdx === "vertical") {
            onReorderVerticalFolder?.(newItems);
          } else {
            onReorderFolder?.(Number(reorderIdx), newItems);
          }
        }}
      />

      {/* 권한 경고 커스텀 다이얼로그 */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>권한 제한</DialogTitle>
            <DialogDescription asChild>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                {alertMessage}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-150"
            >
              확인
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
