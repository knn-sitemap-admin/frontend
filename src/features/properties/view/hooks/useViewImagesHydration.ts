"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hydrateRefsToMedia } from "@/lib/media/refs";

/* 🔧 그룹/사진 API */
import { listGroupPhotos } from "@/shared/api/photos/photos";
import { listPhotoGroupsByPin } from "@/shared/api/photos/photoGroups";

/* ───────── 타입 ───────── */
export type HydratedImg = { url: string; name: string; caption?: string };

/** 화면에서 쓰기 편한 그룹 단위 (images 키로 통일) */
export type ImagesGroup = { title?: string | null; images: HydratedImg[] };

export function useViewImagesHydration({
  open,
  data,
  pinId: pinIdArg,
}: {
  open: boolean;
  data: any;
  /** 명시적 pinId가 있으면 사용, 없으면 data에서 추정 */
  pinId?: number | string;
}) {
  /* 0) pinId 추정 — 뷰 데이터에서 가져오거나 props 우선 */
  const pinId = pinIdArg ?? data?.pinId ?? data?.id ?? null;

  /* 1) refs 있으면 IndexedDB 등에서 재-하이드레이션 */
  const [_cardsFromRefs, setCardsFromRefs] = useState<ImagesGroup[]>([]);
  const [_filesFromRefs, setFilesFromRefs] = useState<ImagesGroup[]>([]);
  const prevPinIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cardRefs = data?.view?._imageCardRefs ?? data?._imageCardRefs ?? null;
    const fileRefs = data?.view?._fileItemRefs ?? data?._fileItemRefs ?? null;

    // pinId가 바뀌었을 때만 이미지 상태를 초기화 (같은 매물 내 data 참조 변경 시에는 건너뜀)
    const pinChanged = prevPinIdRef.current !== null && String(prevPinIdRef.current) !== String(pinId ?? "");
    prevPinIdRef.current = pinId;

    if (!cardRefs && !fileRefs) {
      // refs가 없어도, 같은 매물이면 기존 상태 유지 (서버 사진 그룹이 대신 표시됨)
      if (pinChanged) {
        setCardsFromRefs([]);
        setFilesFromRefs([]);
      }
      return;
    }

    (async () => {
      try {
        const { hydratedCards, hydratedFiles } = await hydrateRefsToMedia(
          cardRefs || [],
          fileRefs || []
        );
        if (cancelled) return;

        // hydratedCards: HydratedImg[][] → ImagesGroup[]
        const cards: ImagesGroup[] = Array.isArray(hydratedCards)
          ? hydratedCards
              .map((arr) => ({
                images: (arr ?? []) as HydratedImg[],
              }))
              .filter((g) => g.images.length)
          : [];

        // hydratedFiles: HydratedImg[] → ImagesGroup[1]
        const files: ImagesGroup[] =
          Array.isArray(hydratedFiles) && hydratedFiles.length
            ? [{ images: hydratedFiles as HydratedImg[] }]
            : [];

        setCardsFromRefs(cards);
        setFilesFromRefs(files);
      } catch (e) {
        console.warn("[useViewImagesHydration] hydrate failed:", e);
        if (!cancelled) {
          setCardsFromRefs([]);
          setFilesFromRefs([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    data?.id,
    data?._imageCardRefs,
    data?.view?._imageCardRefs,
    data?._fileItemRefs,
    data?.view?._fileItemRefs,
  ]);

  /* 2) 서버 사진 그룹/사진 조회 — 이제 React Query로 dedupe */

  // 2-1) 그룹 목록: /photo-groups/:pinId
  const { data: groups = [] } = useQuery({
    queryKey: ["photoGroupsByPin", pinId],
    queryFn: async () => {
      if (!pinId) return [];
      const res = await listPhotoGroupsByPin(pinId);
      return res ?? [];
    },
    enabled: open && !!pinId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 2-2) 각 그룹별 사진 목록: /photos/:groupId
  const { data: photosList = [] } = useQuery({
    queryKey: ["groupPhotosByPin", pinId],
    queryFn: async () => {
      if (!pinId) return [];
      if (!groups || !groups.length) return [];
      return await Promise.all(
        groups.map((g: any) =>
          listGroupPhotos(g.id as any).catch(() => [] as any[])
        )
      );
    },
    enabled: open && !!pinId && !!groups && groups.length > 0,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 2-3) React Query 결과를 ImagesGroup 형태로 가공
  const serverCards: ImagesGroup[] = [];
  const serverFiles: ImagesGroup[] = [];

  // ✅ 세로 그룹 판별: isDocument만 사용
  const isVerticalGroup = (g: any) => g?.isDocument === true;

  (groups as any[]).forEach((g, idx) => {
    const items = (photosList[idx] ?? []) as Array<{
      url: string;
      sortOrder?: number;
      name?: string;
      caption?: string;
    }>;

    const images = items
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((p) => ({
        url: p.url,
        name: p.name ?? "",
        ...(p.caption ? { caption: p.caption } : {}),
      })) as HydratedImg[];

    if (!images.length) return;

    const rawTitle =
      typeof (g as any)?.title === "string" ? (g as any).title.trim() : "";

    const vertical = isVerticalGroup(g);
    const title: string | undefined = rawTitle || undefined;

    const groupObj: ImagesGroup = { title, images };

    if (vertical) {
      serverFiles.push(groupObj);
    } else {
      serverCards.push(groupObj);
    }
  });

  /* 3) 우선순위: 서버 → refs */
  const cardsHydrated: ImagesGroup[] =
    serverCards.length > 0
      ? serverCards
      : _cardsFromRefs.length > 0
      ? _cardsFromRefs
      : [];

  const filesHydrated: ImagesGroup[] =
    serverFiles.length > 0
      ? serverFiles
      : _filesFromRefs.length > 0
      ? _filesFromRefs
      : [];

  const preferCards = cardsHydrated.length > 0;

  // 타입 호환용: 단일 배열 — 첫 카드의 images만 사용
  const legacyImagesHydrated: HydratedImg[] = cardsHydrated[0]?.images ?? [];

  return {
    preferCards,
    /** 가로 카드 그룹(제목 포함 가능) */
    cardsHydrated,
    /** 세로(파일) 카드 그룹(제목 포함 가능). 없으면 [] */
    filesHydrated,
    /** 타입 유지용 단일 배열 */
    legacyImagesHydrated,
  };
}
