import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import {
  getMapPins,
} from "@/shared/api/pins/queries/getPinsInBounds";
import { Bounds } from "../../shared/types/bounds.type";

export type UsePinsOpts = {
  bounds: (Bounds & { zoom: number }) | null;
  zoom?: number;
  draftState?: "before" | "scheduled" | "all";
  isNew?: boolean;
  isOld?: boolean;
  favoriteOnly?: boolean;
};

// 세션별 글로벌 캐시: 전체 로딩(Full Fetch) 시 모든 데이터를 여기에 저장하여 중복 요청을 방지합니다.
const globalPinCache = new Map<string, any>();
const globalDraftCache = new Map<string, any>();
let lastFilterHash: string | null = null;
let isFetchingAll = false;

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

/** 데이터 객체를 MapMarker로 변환 */
function pinPointToMarker(
  p: any,
  source: "pin" | "draft"
): MapMarker {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const displayName = String(pickDisplayName(p)).trim();

  return {
    id: source === "draft" ? `__visit__${String(p.id)}` : String(p.id),
    position: { lat, lng },
    name: displayName,
    title: displayName,
    address: p.addressLine ?? p.address ?? undefined,
    kind: (p.pinKind ?? (source === "draft" ? "question" : "1room")) as any,
    source,
    pinDraftId: p.draftId ?? p.pin_draft_id ?? undefined,
    posKey: toPosKey(lat, lng),
    isNew: p.isNew ?? undefined,
  };
}

/**
 * usePinsFromViewport (전체 로딩 버전)
 * - 복잡한 타일 로직을 제거하고, 필터가 바뀔 때마다 전체 데이터를 1회 가져옵니다.
 * - 데이터 규모(1만 개 이하)를 고려하여 지도 이동 시 추가 네트워크 요청을 발생시키지 않습니다.
 */
export function usePinsFromViewport(opts: UsePinsOpts) {
  const { isOld, isNew, favoriteOnly } = opts;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateTick, setUpdateTick] = useState(0); // 캐시 갱신 반영용
  
  // 현재 필터 상태를 해시화하여 변경 여부 판단
  const filterHash = `${isOld}|${isNew}|${favoriteOnly}`;

  // 🔄 핀 데이터 로드 (전체 로딩 전략)
  useEffect(() => {
    // 이미 같은 필터로 데이터를 받았거나 현재 가져오는 중이면 스킵
    if (lastFilterHash === filterHash || isFetchingAll) return;

    const loadAllPins = async () => {
      isFetchingAll = true;
      setLoading(true);
      setError(null);

      try {
        // 영역(bounds) 없이 요청을 보내 전 영역의 모든 핀을 가져옵니다.
        const resp = await getMapPins({
          isOld,
          isNew,
          favoriteOnly,
        });

        if (resp) {
          const { points = [], drafts = [] } = resp;

          // 캐시 초기화 (필터가 바뀌었으므로)
          globalPinCache.clear();
          globalDraftCache.clear();

          // 새로운 데이터 캐싱
          points.forEach((p: any) => globalPinCache.set(String(p.id), p));
          drafts.forEach((d: any) => globalDraftCache.set(String(d.id), d));

          lastFilterHash = filterHash;
          setUpdateTick(t => t + 1);
        }
      } catch (err: any) {
        console.error("Full Fetch Error:", err);
        setError(err.message || "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        isFetchingAll = false;
      }
    };

    loadAllPins();
  }, [filterHash, isOld, isNew, favoriteOnly]);

  // 🏠 캐시에서 데이터 추출
  const { points, drafts, markers } = useMemo(() => {
    const pList = Array.from(globalPinCache.values());
    const dList = Array.from(globalDraftCache.values());
    
    const pMarkers = pList.map(p => pinPointToMarker(p, "pin"));
    const dMarkers = dList.map(d => pinPointToMarker(d, "draft"));

    return {
      points: pList,
      drafts: dList,
      markers: [...pMarkers, ...dMarkers],
    };
  }, [updateTick, loading]);

  // 강제 새로고침 (캐시 비우고 재요청)
  const reload = useCallback(() => {
    lastFilterHash = null;
    setUpdateTick(t => t + 1);
  }, []);

  return {
    points,
    drafts,
    markers,
    loading,
    error,
    reload,
  };
}
