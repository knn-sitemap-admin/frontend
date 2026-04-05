"use client";

import type React from "react";
import { createRef, useEffect, useRef } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import ImageCarouselUpload from "@/components/organisms/ImageCarouselUpload/ImageCarouselUpload";
import { ImageItem, ResolvedFileItem } from "@/features/properties/types/media";
import ImageReorderModal from "@/components/organisms/ImageCarouselUpload/components/ImageReorderModal";
import { useState } from "react";

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
  const [reorderIdx, setReorderIdx] = useState<number | "vertical" | null>(null);

  const renderFolders: PhotoFolder[] = hasFolders
    ? folders
    : [{ id: "__placeholder__", title: "", items: [] }];

  const handleRemove = (folderIdx: number, imageIdx: number) => {
    onRemoveImage?.(folderIdx, imageIdx);
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
            key={folder.id ?? idx}
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
                  onClick={() => onRemoveFolder?.(idx)}
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

      {/* 세로 폴더 */}
      <div className="image-card">
        <ImageCarouselUpload
          items={fileItems}
          maxCount={maxFiles}
          layout="tall"
          tallHeightClass="h-80"
          objectFit="cover"
          captionAsFolderTitle
          folderTitle={verticalFolderTitle ?? ""}
          onChangeFolderTitle={(text) => onChangeVerticalFolderTitle?.(text)}
          onRemoveImage={onRemoveFileItem}
          onOpenPicker={() => fileInputRef.current?.click()}
          inputRef={fileInputRef}
          onChangeFiles={(files) => {
            console.log("[ImagesSection] vertical onChangeFiles:", files);
            onAddFiles(files);
          }}
          onChangeCaption={(index, text) =>
            onChangeFileItemCaption?.(index, text)
          }
          onOpenReorder={() => setReorderIdx("vertical")}
        />
      </div>

      {/* 새 폴더 추가 버튼 */}
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full justify-start gap-2"
        onClick={onAddFolder}
      >
        <FolderPlus className="h-4 w-4" />
        사진 폴더 추가
      </Button>

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
    </section>
  );
}
