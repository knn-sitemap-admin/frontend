"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Bounds } from "../../shared/types/bounds.type";
import {
  getPinsInBounds,
  type PinsMapDraft,
  type PinsMapPoint,
} from "@/shared/api/pins/queries/getPinsInBounds";

/** 간단 디바운스 */
function debounce<T extends (...a: any[]) => void>(fn: T, ms = 250) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** 프론트 전용 확장 타입: 로컬 임시 드래프트에 title을 보관 */
type DraftWithTitle = PinsMapDraft & { title?: string };

type Filters = {
  isOld?: boolean;
  isNew?: boolean;
  isCompleted?: boolean;
  favoriteOnly?: boolean;
  draftState?: "before" | "scheduled" | "all";
};

export function usePinsMap() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [points, setPoints] = useState<PinsMapPoint[]>([]);
  const [drafts, setDrafts] = useState<PinsMapDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** ✅ 클라이언트 낙관적 임시 드래프트(등록 직후 즉시 표시용) */
  const [localDrafts, setLocalDrafts] = useState<DraftWithTitle[]>([]);

  /** ✅ 즉시 삭제 반영을 위한 ID 보관 */
  const [deletedPinIds, setDeletedPinIds] = useState<Set<string>>(new Set());

  /** ✅ 현재 뷰포트에 적용 중인 필터 상태 */
  const [filters, setFilters] = useState<Filters>({});

  const pointsFiltered = useMemo(() => {
    if (!deletedPinIds.size) return points;
    return points.filter((p) => !deletedPinIds.has(String(p.id)));
  }, [points, deletedPinIds]);

  const draftsFiltered = useMemo(() => {
    if (!deletedPinIds.size) return drafts;
    return drafts.filter((d) => !deletedPinIds.has(String(d.id)));
  }, [drafts, deletedPinIds]);

  /** 서버 drafts + 로컬 임시 drafts 병합(서버 우선) */
  const draftsMerged = useMemo<DraftWithTitle[]>(() => {
    const byId = new Map<string, DraftWithTitle>();

    // 1) 로컬 먼저
    for (const d of localDrafts) {
      if (!deletedPinIds.has(String(d.id))) {
        byId.set(String(d.id), d);
      }
    }

    // 2) 서버로 덮어쓰기(동일 id면 서버가 진실)
    for (const d of draftsFiltered) {
      byId.set(String(d.id), d as DraftWithTitle);
    }

    return Array.from(byId.values());
  }, [draftsFiltered, localDrafts, deletedPinIds]);

  /** ⭐ 실제 서버에서 뷰포트 핀 로드하는 내부 헬퍼 */
  const load = useCallback(
    async (overrideFilters?: Filters) => {
      if (!bounds) {
        return;
      }

      const finalFilters: Filters = {
        ...filters,
        ...(overrideFilters ?? {}),
      };

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);

      try {
        const data = await getPinsInBounds(
          { ...bounds, ...finalFilters },
          ctrl.signal
        );
        setPoints(Array.isArray(data.points) ? data.points : []);
        setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
      } catch (e: any) {
        if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
          setError(String(e?.message ?? e));
        }
      } finally {
        setLoading(false);
      }
    },
    [bounds, filters]
  );

  // 디바운스된 setter: 카카오맵 idle 이벤트에서 호출
  const setBoundsDebounced = useMemo(
    () =>
      debounce((b: Bounds) => {
        setBounds(b);
      }, 150),
    []
  );

  /** ✅ 등록 직후 즉시 보이게 로컬 임시 드래프트 주입 */
  const upsertDraftMarker = useCallback(
    (m: {
      id: string | number;
      lat: number;
      lng: number;
      title?: string | null;
      addressLine?: string | null;
      draftState?: "BEFORE" | "SCHEDULED";
    }) => {
      setLocalDrafts((prev) => {
        const list = prev.slice();
        const id = String(m.id);
        const idx = list.findIndex((x) => String(x.id) === id);

        const next: DraftWithTitle = {
          id,
          title: m.title ?? "답사예정",
          addressLine: m.addressLine ?? "",
          lat: m.lat,
          lng: m.lng,
          draftState: (m.draftState as any) ?? "BEFORE",
        };

        if (idx >= 0) {
          list[idx] = { ...list[idx], ...next };
        } else {
          list.push(next);
        }

        return list;
      });

      // 만약 삭제 목록에 있었다면 제거 (재생성 케이스)
      setDeletedPinIds((prev) => {
        if (!prev.has(String(m.id))) return prev;
        const next = new Set(prev);
        next.delete(String(m.id));
        return next;
      });
    },
    []
  );

  /** ✅ 서버가 진짜 draftId를 주면 임시 id → 실제 id로 치환 */
  const replaceTempByRealId = useCallback(
    (tempId: string | number, realId: string | number) => {
      setLocalDrafts((prev) =>
        prev.map((d) =>
          String(d.id) === String(tempId) ? { ...d, id: String(realId) } : d
        )
      );
    },
    []
  );

  /** ✅ 로컬에서 즉시 삭제 반영 */
  const deletePinLocally = useCallback((id: string | number) => {
    const idStr = String(id);
    setDeletedPinIds((prev) => new Set(prev).add(idStr));
    setLocalDrafts((prev) => prev.filter((d) => String(d.id) !== idStr));
  }, []);

  /** ✅ 로컬 임시 드래프트 초기화(옵션) */
  const clearLocalDrafts = useCallback(() => {
    setLocalDrafts([]);
    setDeletedPinIds(new Set());
  }, []);

  /** ✅ 현재 bounds + 필터 기준 강제 재패치(뷰포트 갱신 트리거) */
  const refreshViewportPins = useCallback(
    async (overrideFilters?: Filters) => {
      const next: Filters = {
        ...filters,
        ...(overrideFilters ?? {}),
      };
      setFilters(next);
      await load(next);
    },
    [filters, load]
  );

  /** ✅ 외부에서 사용하는 refetch: 항상 현재 뷰포트/필터 기준으로 재패치 */
  const refetch = useCallback(async () => {
    await refreshViewportPins();
  }, [refreshViewportPins]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return {
    points: pointsFiltered, // 서버 원본 points (필터링됨)
    drafts: draftsFiltered, // 서버 원본 drafts (필터링됨)
    draftsMerged, // 서버 + 로컬 낙관적 drafts 병합본 (서버 우선)
    localDrafts, // 로컬 임시 drafts (title 포함)
    loading,
    error,
    setBounds: setBoundsDebounced, // 지도 이벤트에서 호출 (idle 등)
    refetch, // 수동 재패치 (현재 bounds + filters 기준)
    refreshViewportPins, // 필터를 바꾸면서 재패치할 때 사용
    upsertDraftMarker, // 등록 직후 임시 마커 주입
    replaceTempByRealId, // 임시 → 실제 id 치환
    deletePinLocally, // 로컬에서 즉시 숨김
    clearLocalDrafts, // 로컬 임시 정리
  } as const;
}
