"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePropertyImages } from "./usePropertyImages";

import { uploadPhotosAndGetUrls } from "@/shared/api/photos/photoUpload";
import { createPhotoGroup } from "@/shared/api/photos/photoGroups";
import { createPhotosInGroup } from "@/shared/api/photos/photos";
import type { ImageItem } from "@/features/properties/types/media";

type RefEntry = {
  cb: (el: HTMLInputElement | null) => void;
  lastNode: HTMLInputElement | null;
};

type ImageHandlers = {
  openImagePicker: ReturnType<typeof usePropertyImages>["openImagePicker"];
  onPickFilesToFolder: ReturnType<
    typeof usePropertyImages
  >["onPickFilesToFolder"];
  addPhotoFolder: ReturnType<typeof usePropertyImages>["addPhotoFolder"];
  removePhotoFolder: ReturnType<typeof usePropertyImages>["removePhotoFolder"];
  onChangeImageCaption: ReturnType<
    typeof usePropertyImages
  >["onChangeImageCaption"];
  handleRemoveImage: ReturnType<typeof usePropertyImages>["handleRemoveImage"];
  onAddFiles: ReturnType<typeof usePropertyImages>["onAddFiles"];
  onChangeFileItemCaption: ReturnType<
    typeof usePropertyImages
  >["onChangeFileItemCaption"];
  handleRemoveFileItem: ReturnType<
    typeof usePropertyImages
  >["handleRemoveFileItem"];
};

const isUploadable = (u?: string) =>
  !!u && (/^blob:/.test(u) || /^data:/.test(u));

export function useCreateMedia() {
  const {
    imageFolders,
    fileItems,
    registerImageInput: registerImageInputRaw,
    openImagePicker,
    onPickFilesToFolder,
    addPhotoFolder,
    removePhotoFolder,
    onChangeImageCaption,
    handleRemoveImage,
    onAddFiles,
    onChangeFileItemCaption,
    handleRemoveFileItem,
    groups,
    queueGroupTitle,
  } = usePropertyImages();

  /** ✅ 제목 + 사진이 있는 가로 폴더가 최소 1개라도 있는지 */
  const hasImageFolderWithTitle = useMemo(() => {
    const folders = imageFolders as any[];

    return folders.some((folder, idx) => {
      const hasImage = Array.isArray(folder) && folder.length > 0;
      if (!hasImage) return false;

      const titleFromMeta =
        groups.find((g) => g.id === `folder-${idx}`)?.title ?? "";
      return titleFromMeta.trim().length > 0;
    });
  }, [imageFolders, groups]);

  /** ───── ref 콜백 안정화 + detach 처리 + 지연 등록 ───── */
  const refCache = useRef<Map<number, RefEntry>>(new Map());

  const deferredRegister = (idx: number, node: HTMLInputElement) => {
    queueMicrotask(() => {
      const cur = refCache.current.get(idx);
      if (cur?.lastNode === node) {
        registerImageInputRaw(idx, node);
      }
    });
  };

  const registerImageInputCompat = useCallback(
    ((idx: number, el?: HTMLInputElement | null) => {
      if (arguments.length === 2) {
        const entry =
          refCache.current.get(idx) ??
          ({ cb: () => void 0, lastNode: null } as RefEntry);
        const node = el ?? null;

        if (node === null) {
          if (entry.lastNode !== null) {
            entry.lastNode = null;
            refCache.current.set(idx, entry);
          }
          return;
        }
        if (entry.lastNode === node) return;
        entry.lastNode = node;
        refCache.current.set(idx, entry);
        deferredRegister(idx, node);
        return;
      }

      let entry = refCache.current.get(idx);
      if (!entry) {
        const stable = (node: HTMLInputElement | null) => {
          const cur =
            refCache.current.get(idx) ??
            ({ cb: stable, lastNode: null } as RefEntry);
          if (node === null) {
            if (cur.lastNode !== null) {
              cur.lastNode = null;
              refCache.current.set(idx, cur);
            }
            return;
          }
          if (cur.lastNode === node) return;
          cur.lastNode = node;
          refCache.current.set(idx, cur);
          deferredRegister(idx, node);
        };
        entry = { cb: stable, lastNode: null };
        refCache.current.set(idx, entry);
      }
      return entry.cb;
    }) as {
      (idx: number): (el: HTMLInputElement | null) => void;
      (idx: number, el: HTMLInputElement | null): void;
    },
    [registerImageInputRaw]
  );

  /** ───── 이미지 핸들러 안정 래퍼 ───── */
  const handlersRef = useRef<ImageHandlers>({
    openImagePicker,
    onPickFilesToFolder,
    addPhotoFolder,
    removePhotoFolder,
    onChangeImageCaption,
    handleRemoveImage,
    onAddFiles,
    onChangeFileItemCaption,
    handleRemoveFileItem,
  });

  useEffect(() => {
    handlersRef.current = {
      openImagePicker,
      onPickFilesToFolder,
      addPhotoFolder,
      removePhotoFolder,
      onChangeImageCaption,
      handleRemoveImage,
      onAddFiles,
      onChangeFileItemCaption,
      handleRemoveFileItem,
    };
  }, [
    openImagePicker,
    onPickFilesToFolder,
    addPhotoFolder,
    removePhotoFolder,
    onChangeImageCaption,
    handleRemoveImage,
    onAddFiles,
    onChangeFileItemCaption,
    handleRemoveFileItem,
  ]);

  const stable_openImagePicker = useCallback(
    (...args: Parameters<ImageHandlers["openImagePicker"]>) =>
      handlersRef.current.openImagePicker(...args),
    []
  );
  const stable_onPickFilesToFolder = useCallback(
    (...args: Parameters<ImageHandlers["onPickFilesToFolder"]>) =>
      handlersRef.current.onPickFilesToFolder(...args),
    []
  );
  const stable_addPhotoFolder = useCallback(
    (...args: Parameters<ImageHandlers["addPhotoFolder"]>) =>
      handlersRef.current.addPhotoFolder(...args),
    []
  );
  const stable_removePhotoFolder = useCallback(
    (...args: Parameters<ImageHandlers["removePhotoFolder"]>) =>
      handlersRef.current.removePhotoFolder(...args),
    []
  );
  const stable_onChangeImageCaption = useCallback(
    (...args: Parameters<ImageHandlers["onChangeImageCaption"]>) =>
      handlersRef.current.onChangeImageCaption(...args),
    []
  );
  const stable_handleRemoveImage = useCallback(
    (...args: Parameters<ImageHandlers["handleRemoveImage"]>) =>
      handlersRef.current.handleRemoveImage(...args),
    []
  );
  const stable_onAddFiles = useCallback(
    (...args: Parameters<ImageHandlers["onAddFiles"]>) =>
      handlersRef.current.onAddFiles(...args),
    []
  );
  const stable_onChangeFileItemCaption = useCallback(
    (...args: Parameters<ImageHandlers["onChangeFileItemCaption"]>) =>
      handlersRef.current.onChangeFileItemCaption(...args),
    []
  );
  const stable_handleRemoveFileItem = useCallback(
    (...args: Parameters<ImageHandlers["handleRemoveFileItem"]>) =>
      handlersRef.current.handleRemoveFileItem(...args),
    []
  );

  /* ───────────── 업로드 대상 선별 & File 변환 ───────────── */
  const imageItemToFile = useCallback(
    async (img: ImageItem, fallbackName: string) => {
      const src = img?.dataUrl ?? img?.url ?? "";
      if (!isUploadable(src)) return null;
      const resp = await fetch(src);
      const blob = await resp.blob();
      const ext =
        (blob.type && blob.type.split("/")[1]) ||
        (img?.name?.split(".").pop() ?? "jpg");
      const name =
        (img?.name && img.name.trim()) || `${fallbackName}.${ext || "jpg"}`;
      return new File([blob], name, {
        type: blob.type || "application/octet-stream",
      });
    },
    []
  );

  /** 중복 방지: 카드별/세로파일 업로드 1회 보장 */
  const processedCardSetRef = useRef<Set<number>>(new Set());
  const processedVerticalRef = useRef<boolean>(false);

  /** 🔍 groups 에서 id 로 찾아오는 헬퍼 */
  const findGroupById = useCallback(
    (id: string) => {
      if (!Array.isArray(groups)) return undefined;
      return groups.find((g: any) => String(g?.id) === String(id));
    },
    [groups]
  );

  /** 카드 하나: 업로드 → urls 있으면 그룹 생성 → /photos 등록 */
  const persistOneCard = useCallback(
    async (pinId: string | number, folderIdx: number) => {
      if (processedCardSetRef.current.has(folderIdx)) return;
      processedCardSetRef.current.add(folderIdx);

      const folderAny = (imageFolders as any[])[folderIdx];
      const isFolderObject =
        folderAny && typeof folderAny === "object" && "items" in folderAny;

      const groupImages: ImageItem[] = isFolderObject
        ? (folderAny.items as ImageItem[]) ?? []
        : Array.isArray(folderAny)
          ? (folderAny as ImageItem[])
          : [];

      if (!groupImages.length) return;

      const pseudoId = `folder-${folderIdx}`;
      const groupMeta = findGroupById(pseudoId);

      const titleFromFolder =
        isFolderObject && typeof (folderAny as any).title === "string"
          ? String((folderAny as any).title).trim()
          : "";

      const titleFromGroup =
        groupMeta && typeof groupMeta.title === "string"
          ? String(groupMeta.title).trim()
          : "";

      const effectiveTitle =
        titleFromGroup || titleFromFolder || `카드 ${folderIdx + 1}`;

      try {
        const filePromises = groupImages.map((img, i) =>
          imageItemToFile(img, `card-${folderIdx + 1}-${i + 1}`)
        );
        const files = (await Promise.all(filePromises)).filter(
          (f): f is File => !!f
        );

        if (files.length === 0) return;

        const urls = await uploadPhotosAndGetUrls(files, { domain: "map" });
        if (!urls.length) return;

        const group = await createPhotoGroup({
          pinId,
          title: effectiveTitle,
          sortOrder: folderIdx,
          isDocument: false,
        });

        const sortOrders = urls.map((_, i) => i);
        await createPhotosInGroup(String(group.id), {
          urls,
          sortOrders,
          isCover: folderIdx === 0,
        });
      } catch (err) {
        console.warn("[persistOneCard] failed at folder", folderIdx, err);
      }
    },
    [imageFolders, imageItemToFile, findGroupById]
  );

  /** 세로 파일 처리 */
  const persistVerticalFiles = useCallback(
    async (pinId: string | number) => {
      if (processedVerticalRef.current) return;
      processedVerticalRef.current = true;

      try {
        const filePromises = fileItems.map((it, i) =>
          imageItemToFile(it, `file-${i + 1}`)
        );
        const files = (await Promise.all(filePromises)).filter(
          (f): f is File => !!f
        );

        if (files.length === 0) return;

        const urls = await uploadPhotosAndGetUrls(files, { domain: "map" });
        if (!urls.length) return;

        const verticalMeta = findGroupById("__vertical__");
        const verticalTitleFromMeta =
          verticalMeta && typeof verticalMeta.title === "string"
            ? String(verticalMeta.title).trim()
            : "";

        const effectiveVerticalTitle = verticalTitleFromMeta || "세로 파일";

        const group = await createPhotoGroup({
          pinId,
          title: effectiveVerticalTitle,
          sortOrder: (imageFolders as any[]).length,
          isDocument: true,
        });

        const sortOrders = urls.map((_, i) => i);
        await createPhotosInGroup(String(group.id), {
          urls,
          sortOrders,
          isCover: false,
        });
      } catch (err) {
        console.warn("[persistVerticalFiles] failed", err);
      }
    },
    [fileItems, imageFolders, imageItemToFile, findGroupById]
  );

  const imagesProp = useMemo(
    () => ({
      imageFolders,
      fileItems,
      registerImageInput: registerImageInputCompat,
      openImagePicker: stable_openImagePicker,
      onPickFilesToFolder: stable_onPickFilesToFolder,
      addPhotoFolder: stable_addPhotoFolder,
      removePhotoFolder: stable_removePhotoFolder,
      onChangeImageCaption: stable_onChangeImageCaption,
      handleRemoveImage: stable_handleRemoveImage,
      onAddFiles: stable_onAddFiles,
      onChangeFileItemCaption: stable_onChangeFileItemCaption,
      handleRemoveFileItem: stable_handleRemoveFileItem,
      groups,
      queueGroupTitle,
    }),
    [
      imageFolders,
      fileItems,
      registerImageInputCompat,
      stable_openImagePicker,
      stable_onPickFilesToFolder,
      stable_addPhotoFolder,
      stable_removePhotoFolder,
      stable_onChangeImageCaption,
      stable_handleRemoveImage,
      stable_onAddFiles,
      stable_onChangeFileItemCaption,
      stable_handleRemoveFileItem,
      groups,
      queueGroupTitle,
    ]
  );

  return {
    imageFolders,
    fileItems,
    imagesProp,
    hasImageFolderWithTitle,
    persistOneCard,
    persistVerticalFiles,
  };
}
