"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import {
  getPinsInBounds,
  type PinsMapPoint,
  type PinsMapDraft,
} from "@/shared/api/pins/queries/getPinsInBounds";
import { Bounds } from "../../shared/types/bounds.type";


type UsePinsOpts = {
  bounds: Bounds | null; // map 대신 bounds를 직접 받음
  draftState?: "before" | "scheduled" | "all";
  isNew?: boolean;
  isOld?: boolean;
};

/** 🔹 그룹핑/매칭 전용 키 (표시·클러스터 용) */
function toPosKey(lat?: number, lng?: number) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? `${(lat as number).toFixed(5)},${(lng as number).toFixed(5)}`
    : undefined;
}

/** 🔹 라벨에 사용할 "매물명/이름" 선택 */
function pickDisplayName(p: any): string {
  return (
    p?.title ??
    p?.name ??
    p?.displayName ??
    p?.label ??
    p?.propertyName ??
    p?.property?.name ??
    p?.property?.title ??
    String(p?.id ?? "")
  );
}

/** PinsMapPoint/PinsMapDraft -> MapMarker 변환 */
function pinPointToMarker(
  p: PinsMapPoint | PinsMapDraft,
  source: "pin" | "draft"
): MapMarker {
  const lat = Number((p as any).lat ?? (p as any).y);
  const lng = Number((p as any).lng ?? (p as any).x);
  const displayName = String(pickDisplayName(p)).trim();

  return {
    id: String(p.id),
    position: { lat, lng },
    name: displayName,
    title: displayName,
    address: (p as any).addressLine ?? (p as any).address ?? undefined,
    kind: ((p as any).pinKind ?? "1room") as any,
    source,
    pinDraftId: (p as any).draftId ?? (p as any).pin_draft_id ?? undefined,
    posKey: toPosKey(lat, lng),
    isNew: (p as any).isNew ?? undefined,
  };
}

export function usePinsFromViewport({
  bounds,
  draftState,
  isNew,
  isOld,
}: UsePinsOpts) {
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<PinsMapPoint[]>([]);
  const [drafts, setDrafts] = useState<PinsMapDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (currentBounds: Bounds) => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await getPinsInBounds({
        swLat: currentBounds.swLat,
        swLng: currentBounds.swLng,
        neLat: currentBounds.neLat,
        neLng: currentBounds.neLng,
        draftState,
        ...(typeof isNew === "boolean" ? { isNew } : {}),
        ...(typeof isOld === "boolean" ? { isOld } : {}),
      }, controller.signal);

      if (controller.signal.aborted) return;

      setPoints(res.points ?? []);
      setDrafts(res.drafts ?? []);
    } catch (e: any) {
      if (e.name === 'AbortError') return; // Abort는 에러 아님
      setError(e?.message ?? "Failed to load pins");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [draftState, isNew, isOld]);

  useEffect(() => {
    if (bounds) {
      load(bounds);
    } else {
      // bounds가 없으면 데이터 초기화
      setPoints([]);
      setDrafts([]);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [bounds, load]);


  const markers: MapMarker[] = useMemo(() => {
    const live = (points ?? []).map((p) => pinPointToMarker(p, "pin"));
    const draftMarkers = (drafts ?? []).map((p) =>
      pinPointToMarker(p, "draft")
    );
    return [...live, ...draftMarkers];
  }, [points, drafts]);

  const reload = useCallback(() => {
    if (bounds) {
      return load(bounds);
    }
  }, [bounds, load]);

  return { loading, points, drafts, markers, error, reload };
}
