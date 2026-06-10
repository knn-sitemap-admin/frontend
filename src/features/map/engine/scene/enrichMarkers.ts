import { DRAFT_ID } from "../clusterer/overlays/overlayStyles";
import { MapMarker } from "../../shared/types/mapMarker.type";

import { toGroupingPosKey } from "./toGroupingPosKey";

export type EnrichedMarker = {
  m: any;
  key: string;
  order?: number;
  isDraft: boolean;
  isPlan: boolean;
  isAddressOnly: boolean;
  posKey?: string;
};

export type ReservationOrderMap =
  | Record<string, number | undefined>
  | undefined;
export type ReservationOrderByPosKey =
  | Record<string, number | undefined>
  | undefined;

/** RebuildScene에서 사용하는 전처리 결과 한 번에 계산 */
export function enrichMarkers(
  markers: readonly MapMarker[] | undefined,
  reservationOrderMap: ReservationOrderMap,
  reservationOrderByPosKey: ReservationOrderByPosKey
): EnrichedMarker[] {
  if (!markers) return [];

  return (markers as any[]).map((m) => {
    const key = String(m.id);
    const order = resolveOrderIndex(
      m,
      key,
      reservationOrderMap,
      reservationOrderByPosKey
    ); // 0 포함 number | undefined
    const isDraft = m.source === "draft";

    const isAddressOnly = isAddressOnlyMarker(m, key);

    const lat =
      typeof m.position?.lat === "number"
        ? m.position.lat
        : m.getPosition?.().getLat?.();
    const lng =
      typeof m.position?.lng === "number"
        ? m.position.lng
        : m.getPosition?.().getLng?.();
    const posKey = m.posKey ?? toGroupingPosKey(lat, lng);

    const idStr = String(m.id ?? "");
    const isVisitPlaceholder =
      (typeof (m as any).title === "string" &&
        (m as any).title.trim().startsWith("__visit__")) ||
      idStr.startsWith("__visit__");

    const isPlan =
      !isAddressOnly &&
      (isDraft ||
        isVisitPlaceholder ||
        m.isPlan === true ||
        m.visit?.state === "PLANNED" ||
        (typeof m.planCount === "number" && m.planCount > 0) ||
        typeof order === "number");

    return { m, key, order, isDraft, isPlan, isAddressOnly, posKey };
  });
}

/** 순번 매칭 유틸: id 우선, **주소 임시핀은 posKey 매칭 금지** */
function resolveOrderIndex(
  m: any,
  key: string,
  reservationOrderMap: ReservationOrderMap,
  reservationOrderByPosKey: ReservationOrderByPosKey
): number | undefined {
  const rawId = String(m.pinDraftId ?? m.id);
  // __visit__ 접두사를 제거하여 예약 맵과 정확히 매칭되도록 보정 (간헐적 색상 변경 실패 해결)
  const cleanId = rawId.replace(/^__visit__/, "");
  const byId = reservationOrderMap?.[cleanId];
  if (typeof byId === "number") return byId;

  const isAddressOnly = isAddressOnlyMarker(m, key);
  if (isAddressOnly) return undefined;

  const lat =
    typeof m.position?.lat === "number"
      ? m.position.lat
      : m.getPosition?.().getLat?.();
  const lng =
    typeof m.position?.lng === "number"
      ? m.position.lng
      : m.getPosition?.().getLng?.();
  const posKey = m.posKey ?? toGroupingPosKey(lat, lng);

  if (posKey && reservationOrderByPosKey) {
    const byPos = reservationOrderByPosKey[posKey];
    if (typeof byPos === "number") return byPos;
  }
  return undefined;
}

/** 주소 임시핀 여부 판정 */
function isAddressOnlyMarker(m: any, key: string) {
  return (
    m.source === "geocode" ||
    m.source === "search" ||
    key.startsWith("__temp__") ||
    key.startsWith("__addr__") ||
    key === DRAFT_ID
  );
}
