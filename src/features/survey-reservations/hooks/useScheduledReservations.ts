"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  fetchMySurveyReservations,
  type MyReservation,
} from "@/shared/api/survey-reservations/surveyReservations";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/features/users/api/account";

/* ───────── 정렬/보정 유틸 ───────── */
function sortByServerRuleLocal<
  T extends { sortOrder?: number; reservedDate?: string | null; id: string }
>(arr: T[]) {
  return [...arr].sort((a, b) => {
    const ao =
      typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bo =
      typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    const ad = a.reservedDate ?? "";
    const bd = b.reservedDate ?? "";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
function normalizeZeroBase<T extends { sortOrder?: number }>(arr: T[]) {
  return arr.map((it, idx) => ({ ...it, sortOrder: idx }));
}
function toPosKey(lat?: number | null, lng?: number | null) {
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/* ───────── 모듈 스코프 싱글톤 스토어 ───────── */
type StoreState = {
  items: MyReservation[];
  loading: boolean;
  error: Error | null;
  version: number; // 상태 변경 트리거 카운터
};
type Listener = () => void;

const store: {
  state: StoreState;
  listeners: Set<Listener>;
  abort?: AbortController | null;
} = {
  state: { items: [], loading: false, error: null, version: 0 },
  listeners: new Set(),
  abort: null,
};

function emit() {
  for (const l of store.listeners) l();
}

async function refetchInternal(signal?: AbortSignal) {
  store.state = { ...store.state, loading: true, error: null };
  emit();
  try {
    const next = await fetchMySurveyReservations(signal);
    const sorted = sortByServerRuleLocal(next);
    store.state = {
      items: normalizeZeroBase(sorted),
      loading: false,
      error: null,
      version: store.state.version + 1, // ✅ bump
    };
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    store.state = {
      ...store.state,
      loading: false,
      error: e ?? new Error("failed"),
      version: store.state.version + 1, // ✅ bump
    };
  } finally {
    emit();
  }
}

/* 훅 최초 마운트 시 1회 fetch (모듈 로드 시점이 아닌 훅 마운트 시점에 실행) */
let _initialized = false;

/* ───────── 외부에서 호출할 액션 ───────── */
function refetch() {
  store.abort?.abort();
  const ctrl = new AbortController();
  store.abort = ctrl;
  return refetchInternal(ctrl.signal);
}

function setItems(
  updater: MyReservation[] | ((prev: MyReservation[]) => MyReservation[])
) {
  const nextItems =
    typeof updater === "function"
      ? (updater as any)(store.state.items)
      : updater;
  store.state = {
    ...store.state,
    items: normalizeZeroBase(sortByServerRuleLocal(nextItems)),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
}

function removeByReservationId(reservationId: string) {
  store.state = {
    ...store.state,
    items: normalizeZeroBase(
      sortByServerRuleLocal(
        store.state.items.filter((it) => it.id !== reservationId)
      )
    ),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
}

function removeByPinDraftId(draftId: string | number) {
  const key = String(draftId);
  store.state = {
    ...store.state,
    items: normalizeZeroBase(
      sortByServerRuleLocal(
        store.state.items.filter((it) => String(it.pinDraftId) !== key)
      )
    ),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
}

function removeByPosKey(posKey: string) {
  store.state = {
    ...store.state,
    items: normalizeZeroBase(
      sortByServerRuleLocal(
        store.state.items.filter((it) => {
          const k =
            it.posKey ?? toPosKey(it.lat ?? undefined, it.lng ?? undefined);
          return k !== posKey;
        })
      )
    ),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
}

function insertOptimistic(
  draft: Omit<MyReservation, "id"> & { id?: string },
  insertAt?: number
) {
  const tempId =
    draft.id ??
    `temp_${
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)
    }`;

  const at =
    Number.isInteger(insertAt) && (insertAt as number) >= 0
      ? Math.min(insertAt as number, store.state.items.length)
      : store.state.items.length;

  const optimistic: MyReservation = {
    ...draft,
    id: tempId,
    sortOrder: at,
  } as any;

  const shifted = store.state.items.map((it) =>
    typeof it.sortOrder === "number" && it.sortOrder >= at
      ? { ...it, sortOrder: (it.sortOrder as number) + 1 }
      : it
  );

  store.state = {
    ...store.state,
    items: normalizeZeroBase(sortByServerRuleLocal([...shifted, optimistic])),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
  return tempId;
}

function reconcileOptimistic(
  tempId: string,
  realId: string,
  sortOrder?: number
) {
  const idx = store.state.items.findIndex((x) => x.id === tempId);
  if (idx < 0) return;
  const next = [...store.state.items];
  const cur = next[idx];
  next[idx] = {
    ...cur,
    id: realId,
    sortOrder: typeof sortOrder === "number" ? sortOrder : cur.sortOrder,
  };
  store.state = {
    ...store.state,
    items: normalizeZeroBase(sortByServerRuleLocal(next)),
    version: store.state.version + 1, // ✅ bump
  };
  emit();
}

/* ───────── Hook: useSyncExternalStore로 구독 ───────── */
export function useScheduledReservations() {
  // 세션 쿠키가 이미 존재하는 시점(ClientSessionGuard 통과 후)에 1회만 초기 fetch
  useEffect(() => {
    if (_initialized) return;
    _initialized = true;
    void refetchInternal();
  }, []);

  const snapshot = useSyncExternalStore(
    (l) => {
      store.listeners.add(l);
      return () => store.listeners.delete(l);
    },
    () => store.state,
    () => store.state // SSR fallback
  );

  // 프로필 정보를 가져와서 관리자 여부 확인 (순번 계산 필터링용)
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000,
  });
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  // 파생 맵들/유틸은 memoize
  const reservationOrderMap = useMemo(() => {
    const m: Record<string, number> = {};
    const visibleItems = snapshot.items.filter((r) => {
      if (isAdmin) return true;
      return r.isMine === true;
    });
    visibleItems.forEach((r, idx) => {
      if (r.pinDraftId != null) {
        m[String(r.pinDraftId)] = idx; // 0-based index
      }
    });
    return m;
  }, [snapshot.items, snapshot.version, isAdmin]);

  const reservationOrderByPosKey = useMemo(() => {
    const m: Record<string, number> = {};
    const visibleItems = snapshot.items.filter((r) => {
      if (isAdmin) return true;
      return r.isMine === true;
    });
    visibleItems.forEach((r, idx) => {
      const key = r.posKey ?? toPosKey(r.lat ?? undefined, r.lng ?? undefined);
      if (key) m[key] = idx; // 0-based index
    });
    return m;
  }, [snapshot.items, snapshot.version, isAdmin]);

  const getOrderIndex = useCallback(
    (marker: {
      source?: "draft" | "point";
      id?: string | number;
      pinDraftId?: string | number;
      posKey?: string;
      lat?: number;
      lng?: number;
    }) => {
      if (marker.source === "draft") {
        const draftId = marker.pinDraftId ?? marker.id;
        if (draftId != null) {
          const hit = reservationOrderMap[String(draftId)];
          if (typeof hit === "number") return hit;
        }
      }
      const key = marker.posKey ?? toPosKey(marker.lat, marker.lng);
      if (key && typeof reservationOrderByPosKey[key] === "number") {
        return reservationOrderByPosKey[key];
      }
      return undefined;
    },
    [reservationOrderMap, reservationOrderByPosKey]
  );

  // refetch 같은 액션은 stable ref로 노출
  const abortRef = useRef<AbortController | null>(null);
  const doRefetch = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return refetchInternal(ctrl.signal);
  }, []);

  const doSetItems = useCallback(setItems, []);
  const doInsertOptimistic = useCallback(insertOptimistic, []);
  const doReconcileOptimistic = useCallback(reconcileOptimistic, []);

  return {
    items: snapshot.items,
    loading: snapshot.loading,
    error: snapshot.error,
    version: snapshot.version,
    refetch: doRefetch,
    setItems: doSetItems,
    reservationOrderMap,
    reservationOrderByPosKey,
    getOrderIndex,
    insertOptimistic: doInsertOptimistic,
    reconcileOptimistic: doReconcileOptimistic,
    removeByReservationId,
    removeByPinDraftId,
    removeByPosKey,
  } as const;
}
