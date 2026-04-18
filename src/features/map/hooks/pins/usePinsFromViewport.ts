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
  isCompleted?: boolean;
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
    isNew: p.isNew ?? p.ageType === "NEW",
  };
}

/**
 * usePinsFromViewport (전체 로딩 버전)
 * - 복잡한 타일 로직을 제거하고, 필터가 바뀔 때마다 전체 데이터를 1회 가져옵니다.
 * - 데이터 규모(1만 개 이하)를 고려하여 지도 이동 시 추가 네트워크 요청을 발생시키지 않습니다.
 */
export function usePinsFromViewport(opts: UsePinsOpts) {
  const { isOld, isNew, isCompleted, favoriteOnly } = opts;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateTick, setUpdateTick] = useState(0); // 캐시 갱신 반영용

  // 🔄 핀 데이터 로드 (전체 로딩 전략)
  // 필터가 바뀌어도 네트워크 요청을 하지 않고 캐시된 데이터를 사용합니다.
  useEffect(() => {
    if (isFetchingAll) return;

    // 만약 이미 데이터를 한 번이라도 가져왔다면 (빈 배열이라도 success했다면) 다시 안 가져옴
    if (globalPinCache.size > 0 || globalDraftCache.size > 0) return;

    const loadAllPins = async () => {
      isFetchingAll = true;
      setLoading(true);
      setError(null);

      try {
        // 필터 없이 요청을 보내 전 영역의 모든 핀을 가져옵니다.
        const resp = await getMapPins({
          isCompleted: undefined, // 백엔드에서 기본 필터링을 하지 않도록 명시 (또는 백엔드 수정)
        });

        if (resp) {
          const { points = [], drafts = [] } = resp;

          // 캐시 초기화 (필터가 바뀌었으므로)
          globalPinCache.clear();
          globalDraftCache.clear();

          // 새로운 데이터 캐싱
          points.forEach((p: any) => globalPinCache.set(String(p.id), p));
          drafts.forEach((d: any) => globalDraftCache.set(String(d.id), d));

          lastFilterHash = "fixed"; // 이제 필터별 캐시를 쓰지 않으므로 고정값
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
  }, [updateTick]);

  // 🏠 캐시에서 데이터 추출 및 클라이언트 사이드 필터링
  const { points, drafts, markers } = useMemo(() => {
    const pMarkers: MapMarker[] = [];
    const dMarkers: MapMarker[] = [];
    const filteredPoints: any[] = [];
    const filteredDrafts: any[] = [];

    // 1) 핀 필터링 및 마커 변환 (단일 패스 🚀)
    for (const p of globalPinCache.values()) {
      // 신축/구옥 필터
      const isNewActive = p.isNew ?? p.ageType === "NEW";
      const isOldActive = p.isOld ?? p.ageType === "OLD";

      if (isNew === true && !isNewActive) continue;
      if (isOld === true && !isOldActive) continue;

      // 입주완료 필터
      if (isCompleted === true) {
        if (!p.isCompleted) continue;
      } else {
        if (p.isCompleted) continue;
      }

      filteredPoints.push(p);
      pMarkers.push(pinPointToMarker(p, "pin"));
    }

    // 2) 임시핀(Draft) 필터링 (단일 패스 🚀)
    const isSpecialPropMode = isNew || isOld || isCompleted;
    if (!isSpecialPropMode) {
      for (const d of globalDraftCache.values()) {
        filteredDrafts.push(d);
        dMarkers.push(pinPointToMarker(d, "draft"));
      }
    }

    return {
      points: filteredPoints,
      drafts: filteredDrafts,
      markers: [...pMarkers, ...dMarkers],
    };
  }, [updateTick, loading, isOld, isNew, isCompleted, favoriteOnly]);

  // 강제 새로고침 (캐시 비우고 재요청)
  const reload = useCallback(() => {
    globalPinCache.clear();
    globalDraftCache.clear();
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
