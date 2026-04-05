"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import type {
  IdLike,
  PinPhoto,
  PinPhotoGroup,
} from "@/shared/api/photos/types";
import type { AnyImageRef, ImageItem } from "@/features/properties/types/media";

/* ───────── utils & hydration ───────── */
import { useLocalImageState } from "./localState/useLocalImageState";
import { useInputRefs } from "./localState/useInputRefs";
import { hydrateInitial } from "./hydration/hydrateInitial";
import { getServerPhotoId } from "./utils/getServerPhotoId";

/* ───────── queue helpers ───────── */
import type { PendingGroupChange } from "./queue/groupQueue";
import {
  queueGroupTitle as queueGroupTitleImpl,
  queueGroupSortOrder as queueGroupSortOrderImpl,
} from "./queue/groupQueue";
import type { PendingPhotoChange } from "./queue/photoQueue";
import {
  queuePhotoCaption as queuePhotoCaptionImpl,
  queuePhotoSort as queuePhotoSortImpl,
  queuePhotoMove as queuePhotoMoveImpl,
  markCover,
} from "./queue/photoQueue";
import { queueDeleteIfServerItem } from "./queue/deleteQueue";

/* ───────── server helpers ───────── */
import { reloadGroupsImpl } from "./server/reloadGroups";

/* ───────── commit helpers ───────── */
import {
  hasImageChangesImpl,
  commitImageChangesImpl,
} from "./commit/commitChanges";
import { createGroupAndUploadImpl, uploadToGroupImpl } from "./server/upload";
import {
  MAX_FILES,
  MAX_PER_CARD,
} from "@/features/properties/components/constants";

/* ───────── 타입 ───────── */
type UseEditImagesArgs = {
  propertyId: string;
  initial: {
    _imageCardRefs?: AnyImageRef[][];
    _fileItemRefs?: AnyImageRef[];
    imageFolders?:
      | AnyImageRef[]
      | AnyImageRef[][]
      | Record<string, AnyImageRef[]>;
    imageCards?: AnyImageRef[][] | Record<string, AnyImageRef[]>;
    images?: AnyImageRef[];
    imageCardCounts?: number[];
    verticalImages?: AnyImageRef[] | Record<string, AnyImageRef>;
    imagesVertical?: AnyImageRef[] | Record<string, AnyImageRef>;
    fileItems?: AnyImageRef[] | Record<string, AnyImageRef>;
  } | null;
};

export function useEditImages({ propertyId, initial }: UseEditImagesArgs) {
  /* 로컬 이미지 상태 (가로/세로 + ref + blob cleanup) */
  const {
    imageFolders,
    setImageFolders,
    verticalImages,
    setVerticalImages,
    imageFoldersRef,
    verticalImagesRef,
  } = useLocalImageState();

  /* 서버 상태 */
  const [groups, setGroups] = useState<PinPhotoGroup[] | null>(null);
  const [photosByGroup, setPhotosByGroup] = useState<
    Record<string, PinPhoto[]>
  >({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const hasServerHydratedRef = useRef(false);
  const groupsRef = useRef<PinPhotoGroup[] | null>(null);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  /* input refs */
  const { imageInputRefs, registerImageInput, openImagePicker } =
    useInputRefs();

  /* queue refs */
  const pendingGroupMap = useRef<Map<string, PendingGroupChange>>(new Map());
  const pendingPhotoMap = useRef<Map<string, PendingPhotoChange>>(new Map());
  const pendingDeleteSet = useRef<Set<string>>(new Set());

  /* 서버 reload dedupe */
  const reloadMapRef = useRef<Map<string, Promise<void>>>(new Map());

  const [isMediaDirty, setIsMediaDirty] = useState(false);

  /* 업로드 dedupe */
  const uploadInFlightRef = useRef<Map<string, Promise<PinPhoto[]>>>(new Map());
  const createAndUploadRef = useRef<
    Map<string, Promise<{ group: PinPhotoGroup; photos: PinPhoto[] }>>
  >(new Map());

  /* 큐 래퍼들 */
  const markDirty = useCallback(() => setIsMediaDirty(true), []);

  /* (후략) */
  useEffect(() => {
    let mounted = true;

    const isMounted = () => mounted;

    (async () => {
      await hydrateInitial({
        initial,
        setImageFolders,
        setVerticalImages,
        hasServerHydratedRef,
        isMounted,
      });
    })();

    return () => {
      mounted = false;
    };
  }, [initial, setImageFolders, setVerticalImages]);

  /* queue 래퍼 */
  const queuePhotoCaption = useCallback(
    (photoId: IdLike, text: string | null) =>
      queuePhotoCaptionImpl(pendingPhotoMap.current, photoId, text),
    []
  );

  const queuePhotoSort = useCallback(
    (photoId: IdLike, sortOrder: number | null) =>
      queuePhotoSortImpl(pendingPhotoMap.current, photoId, sortOrder),
    []
  );

  const queuePhotoMove = useCallback(
    (photoId: IdLike, destGroupId: IdLike | null) =>
      queuePhotoMoveImpl(pendingPhotoMap.current, photoId, destGroupId),
    []
  );

  const queueGroupTitle = useCallback(
    (groupId: IdLike, title: string | null) =>
      queueGroupTitleImpl(pendingGroupMap.current, groupId, title),
    []
  );

  const queueGroupSortOrder = useCallback(
    (groupId: IdLike, sortOrder: number | null) =>
      queueGroupSortOrderImpl(pendingGroupMap.current, groupId, sortOrder),
    []
  );

  const queueDeleteIfServer = useCallback((item?: ImageItem) => {
    queueDeleteIfServerItem(pendingDeleteSet.current, item);
  }, []);

  /* 서버 연동: reload */
  const reloadGroups = useCallback(
    async (pinId: IdLike) =>
      reloadGroupsImpl({
        pinId,
        setGroups,
        setPhotosByGroup,
        setMediaLoading,
        setMediaError,
        setImageFolders,
        setVerticalImages,
        groupsRef,
        hasServerHydratedRef,
        pendingGroupMap,
        pendingPhotoMap,
        pendingDeleteSet,
        reloadMap: reloadMapRef.current,
      }),
    [
      setGroups,
      setPhotosByGroup,
      setMediaLoading,
      setMediaError,
      setImageFolders,
      setVerticalImages,
    ]
  );

  /* 서버 연동: upload */
  const uploadToGroup = useCallback(
    async (
      groupId: IdLike,
      files: File[] | FileList,
      opts?: { domain?: "map" | "contracts" | "board" | "profile" | "etc" }
    ) => uploadToGroupImpl(groupId, files, uploadInFlightRef.current, opts),
    []
  );

  const createGroupAndUpload = useCallback(
    async (
      pinId: IdLike,
      title: string,
      files: File[] | FileList,
      sortOrder?: number | null
    ) =>
      createGroupAndUploadImpl(
        pinId,
        title,
        files,
        sortOrder,
        uploadInFlightRef.current,
        createAndUploadRef.current
      ),
    []
  );

  /* 카드형 파일 추가/삭제 */
  const onPickFilesToFolder = useCallback(
    async (idx: number, files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArr = Array.from(files);

      const tempItems: ImageItem[] = fileArr.map((f) => ({
        file: f,
        name: f.name,
        url: URL.createObjectURL(f),
      }));

      setImageFolders((prev) => {
        const next = prev.map((folder, i) =>
          i === idx ? [...folder, ...tempItems].slice(0, MAX_PER_CARD) : folder
        );
        markDirty();
        return next;
      });
    },
    [setImageFolders]
  );

  const addPhotoFolder = useCallback(() => {
    setImageFolders((prev) => [...prev, []]);
    markDirty();
  }, [setImageFolders, markDirty]);

  const removePhotoFolder = useCallback(
    (folderIdx: number, opts?: { keepAtLeastOne?: boolean }) => {
      const keepAtLeastOne = opts?.keepAtLeastOne ?? true;

      setImageFolders((prev) => {
        const target = prev[folderIdx] ?? [];

        target.forEach((img) => queueDeleteIfServer(img));

        target.forEach((img) => {
          if (img?.url?.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(img.url);
            } catch {}
          }
        });

        const next = prev.map((arr) => [...arr]);
        next.splice(folderIdx, 1);

        if (next.length === 0 && keepAtLeastOne) next.push([]);
        markDirty();
        return next;
      });
    },
    [queueDeleteIfServer, setImageFolders, markDirty]
  );

  const handleRemoveImage = useCallback(
    (folderIdx: number, imageIdx: number) => {
      setImageFolders((prev) => {
        const next = prev.map((arr) => [...arr]);
        const removed = next[folderIdx]?.splice(imageIdx, 1)?.[0];

        queueDeleteIfServer(removed);

        if (removed?.url?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(removed.url);
          } catch {}
        }
        markDirty();
        return next;
      });
    },
    [queueDeleteIfServer, setImageFolders, markDirty]
  );

  /* 세로형 삭제/추가/캡션 */
  const handleRemoveFileItem = useCallback(
    (index: number) => {
      setVerticalImages((prev) => {
        const next = [...prev];
        const [removed] = next.splice(index, 1);

        queueDeleteIfServer(removed);

        if (removed?.url?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(removed.url);
          } catch {}
        }
        markDirty();
        return next;
      });
    },
    [queueDeleteIfServer, setVerticalImages, markDirty]
  );

  const onAddFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const items: ImageItem[] = [];
      for (const f of Array.from(files)) {
        items.push({
          file: f,
          url: URL.createObjectURL(f),
          name: f.name,
        });
      }
      setVerticalImages((prev) => {
        const next = [...prev, ...items].slice(0, MAX_FILES);
        markDirty();
        return next;
      });
    },
    [setVerticalImages, markDirty]
  );

  const onChangeFileItemCaption = useCallback(
    (index: number, text: string) => {
      let target: ImageItem | undefined;

      setVerticalImages((prev) => {
        const next = prev.map((f, i) => {
          if (i !== index) return f;
          const updated = { ...f, caption: text };
          target = updated;
          return updated;
        });

        const pid = getServerPhotoId(target);
        if (pid != null) queuePhotoCaption(pid, text ?? null);

        markDirty();
        return next;
      });
    },
    [setVerticalImages, queuePhotoCaption, markDirty]
  );

  const onChangeImageCaption = useCallback(
    (folderIdx: number, imageIdx: number, text: string) => {
      let target: ImageItem | undefined;

      setImageFolders((prev) => {
        const next = prev.map((arr, i) => {
          if (i !== folderIdx) return arr;
          return arr.map((img, j) => {
            if (j !== imageIdx) return img;
            const updated = { ...img, caption: text };
            target = updated;
            return updated;
          });
        });

        const pid = getServerPhotoId(target);
        if (pid != null) queuePhotoCaption(pid, text ?? null);

        markDirty();
        return next;
      });
    },
    [setImageFolders, queuePhotoCaption, markDirty]
  );

  /** ✅ 폴더 내 이미지 순서 변경 (+ 서버 정렬 큐잉) */
  const moveImageInFolder = useCallback(
    (folderIdx: number, fromIdx: number, toIdx: number) => {
      setImageFolders((prev) => {
        if (folderIdx < 0 || folderIdx >= prev.length) return prev;
        const next = prev.map((arr) => [...arr]);
        const folder = next[folderIdx];
        if (
          fromIdx < 0 ||
          fromIdx >= folder.length ||
          toIdx < 0 ||
          toIdx >= folder.length
        ) {
          return prev;
        }

        // 1) 로컬 배열 순서 교체 (불변성 유지)
        const [target] = folder.splice(fromIdx, 1);
        folder.splice(toIdx, 0, target);
        next[folderIdx] = [...folder]; // 새 참조 할당으로 리렌더링 보장
        
        imageFoldersRef.current = next;
        markDirty();

        // 2) 폴더 내 모든 사진의 서버 sortOrder 업데이트 예약
        next[folderIdx].forEach((img, i) => {
          const pid = getServerPhotoId(img);
          if (pid != null) {
            // eslint-disable-next-line no-console
            console.log(`[moveImageInFolder] Queueing Photo ${pid} at sortOrder ${i + 1}`);
            queuePhotoSort(pid, i + 1);
          }
        });

        return next;
      });
    },
    [setImageFolders, queuePhotoSort, imageFoldersRef, markDirty]
  );

  /** ✅ 폴더 전체 순서 교체 (모달용) */
  const reorderFolder = useCallback(
    (folderIdx: number, nextItems: ImageItem[]) => {
      // eslint-disable-next-line no-console
      console.log("[reorderFolder] Starting", { folderIdx, count: nextItems.length });
      
      setImageFolders((prev) => {
        if (folderIdx < 0 || folderIdx >= prev.length) return prev;
        const next = prev.map((arr, i) => (i === folderIdx ? [...nextItems] : [...arr]));
        imageFoldersRef.current = next; // 즉시 Ref 동기화
        markDirty();
        return next;
      });

      // 서버 정렬 예약 (사전 예약)
      nextItems.forEach((img, i) => {
        const pid = getServerPhotoId(img);
        if (pid != null) {
          // eslint-disable-next-line no-console
          console.log(`[reorderFolder] Queueing Photo ${pid} at sortOrder ${i + 1}`);
          queuePhotoSort(pid, i + 1);
        }
      });
    },
    [setImageFolders, queuePhotoSort, imageFoldersRef, markDirty]
  );

  /** ✅ 세로 폴더 순서 변경 (모달용) */
  const reorderVerticalFolder = useCallback(
    (nextItems: ImageItem[]) => {
      // eslint-disable-next-line no-console
      console.log("[reorderVerticalFolder] Starting", { count: nextItems.length });

      const next = [...nextItems];
      setVerticalImages(next);
      verticalImagesRef.current = next; // 즉시 Ref 동기화
      markDirty();

      // 서버 정렬 예약
      next.forEach((img, i) => {
        const pid = getServerPhotoId(img);
        if (pid != null) {
          // eslint-disable-next-line no-console
          console.log(`[reorderVerticalFolder] Queueing Photo ${pid} at sortOrder ${i + 1}`);
          queuePhotoSort(pid, i + 1);
        }
      });
    },
    [setVerticalImages, queuePhotoSort, verticalImagesRef, markDirty]
  );

  /* 변경 여부 / 커밋 */
  const hasImageChanges = useCallback(
    () =>
      isMediaDirty ||
      hasImageChangesImpl({
        propertyId,
        imageFoldersRef,
        verticalImagesRef,
        pendingGroupMap,
        pendingPhotoMap,
        pendingDeleteSet,
        groupsRef,
        setGroups,
        uploadInFlightRef,
        createAndUploadRef,
      }),
    [
      isMediaDirty,
      propertyId,
      imageFoldersRef,
      verticalImagesRef,
      pendingGroupMap,
      pendingPhotoMap,
      pendingDeleteSet,
      groupsRef,
      setGroups,
      uploadInFlightRef,
      createAndUploadRef,
    ]
  );

  const commitImageChanges = useCallback(async () => {
    const result = await commitImageChangesImpl({
      propertyId,
      imageFoldersRef,
      verticalImagesRef,
      pendingGroupMap,
      pendingPhotoMap,
      pendingDeleteSet,
      groupsRef,
      setGroups,
      uploadInFlightRef,
      createAndUploadRef,
    });
    if (result) {
      setIsMediaDirty(false);
    }
    return result;
  }, [
    propertyId,
    imageFoldersRef,
    verticalImagesRef,
    pendingGroupMap,
    pendingPhotoMap,
    pendingDeleteSet,
    groupsRef,
    setGroups,
    uploadInFlightRef,
    createAndUploadRef,
  ]);

  const commitPending = commitImageChanges;

  /* 기타 큐 액션: makeCover, reorder, moveToGroup, deletePhotos */
  const makeCover = useCallback((photoId: IdLike) => {
    markCover(pendingPhotoMap.current, photoId);
  }, []);

  const reorder = useCallback(
    (photoId: IdLike, sortOrder: number) => {
      queuePhotoSort(photoId, sortOrder);
    },
    [queuePhotoSort]
  );

  const moveToGroup = useCallback(
    async (photoIds: IdLike[], destGroupId: IdLike) => {
      for (const pid of photoIds) queuePhotoMove(pid, destGroupId);
    },
    [queuePhotoMove]
  );

  const deletePhotos = useCallback(async (photoIds: IdLike[]) => {
    for (const pid of photoIds) pendingDeleteSet.current.add(String(pid));
  }, []);

  return {
    /* 로컬 상태/액션 */
    imageFolders,
    verticalImages,
    registerImageInput,
    openImagePicker,
    onPickFilesToFolder,
    addPhotoFolder,
    removePhotoFolder,
    onChangeImageCaption,
    handleRemoveImage,
    moveImageInFolder,
    reorderFolder,
    reorderVerticalFolder,
    onAddFiles,
    onChangeFileItemCaption,
    handleRemoveFileItem,

    /* 서버 상태 */
    groups,
    photosByGroup,
    mediaLoading,
    mediaError,

    /* 서버 액션 */
    reloadGroups,
    uploadToGroup,
    createGroupAndUpload,

    /* 큐잉 액션 */
    makeCover,
    reorder,
    moveToGroup,
    deletePhotos,
    queueGroupTitle,
    queueGroupSortOrder,
    queuePhotoCaption,
    queuePhotoSort,
    queuePhotoMove,

    /* 변경 여부/커밋 */
    hasImageChanges,
    commitImageChanges,
    commitPending,
  };
}

export type EditImagesAPI = ReturnType<typeof useEditImages>;
