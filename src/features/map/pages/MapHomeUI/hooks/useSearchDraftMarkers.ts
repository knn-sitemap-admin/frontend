"use client";

import { useCallback, useState } from "react";
import type { PinKind } from "@/features/pins/types";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";

export function useSearchDraftMarkers() {
  const [localDraftMarkers, setLocalDraftMarkers] = useState<MapMarker[]>([]);

  const upsertDraftMarker = useCallback(
    (m: {
      id: string | number;
      lat: number;
      lng: number;
      address?: string | null;
      source?: "geocode" | "search" | "draft";
      kind?: PinKind;
    }) => {
      setLocalDraftMarkers((prev) => {
        const list = prev.slice();
        const id = String(m.id);
        const idx = list.findIndex((x) => String(x.id) === id);
        const next: MapMarker = {
          id,
          title: m.address ?? "선택 위치",
          position: { lat: m.lat, lng: m.lng },
          ...(m.source ? ({ source: m.source } as any) : {}),
          kind: (m.kind ?? "question") as PinKind,
        };
        if (idx >= 0) list[idx] = { ...list[idx], ...next };
        else list.push(next);
        return list;
      });
    },
    []
  );

  const replaceTempByRealId = useCallback(
    (tempId: string | number, realId: string | number) => {
      setLocalDraftMarkers((prev) =>
        prev.map((x) =>
          String(x.id) === String(tempId)
            ? { ...x, id: `__visit__${realId}` }
            : x
        )
      );
    },
    []
  );

  /** __draft__/__search__ 같은 “임시” 마커만 제거 */
  const clearTempMarkers = useCallback(() => {
    setLocalDraftMarkers((prev) =>
      prev.filter((m) => {
        const id = String(m.id);
        return id !== "__draft__" && id !== "__search__";
      })
    );
  }, []);

  /** source === "search" 인 마커만 제거 (뷰포트 크게 이동했을 때) */
  const clearSearchMarkers = useCallback(() => {
    setLocalDraftMarkers((prev) =>
      prev.filter((m) => (m as any).source !== "search")
    );
  }, []);

  return {
    localDraftMarkers,
    upsertDraftMarker,
    replaceTempByRealId,
    clearTempMarkers,
    clearSearchMarkers,
  } as const;
}
