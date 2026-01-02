import type { BeforeDraft } from "@/shared/api/survey-reservations/surveyReservations";

/** 🔹 소수점 5자리 posKey (UI 그룹/매칭 전용) */
export function posKey(lat: number, lng: number) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** draftId 우선 추출 */
export function extractDraftIdFromPin(pin: any): number | undefined {
  const raw =
    pin?.pinDraftId ??
    pin?.draftId ??
    pin?.draft?.id ??
    (typeof pin?.id === "number" ? pin.id : undefined);

  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** before 목록에서 좌표/주소로 draft 찾기 */
export function findDraftIdByHeuristics(args: {
  before: BeforeDraft[];
  lat: number;
  lng: number;
  roadAddress?: string | null;
  jibunAddress?: string | null;
}): number | undefined {
  const { before, lat, lng, roadAddress, jibunAddress } = args;
  const targetKey = posKey(lat, lng);

  // 1) posKey 기반
  const byPos = before.find(
    (d) => `${d.lat.toFixed(5)},${d.lng.toFixed(5)}` === targetKey
  );
  if (byPos) return Number(byPos.id);

  // 2) 주소 기반
  const addr = (roadAddress ?? jibunAddress ?? "").trim();
  if (addr) {
    const byAddr = before.find((d) => (d.addressLine ?? "").trim() === addr);
    if (byAddr) return Number(byAddr.id);
  }

  // 3) 근사 lat/lng
  const EPS = 1e-5;
  const byNear = before.find(
    (d) => Math.abs(d.lat - lat) < EPS && Math.abs(d.lng - lng) < EPS
  );
  if (byNear) return Number(byNear.id);

  return undefined;
}

// 예약(scheduled) 목록에서 draftId 찾기
export function findDraftIdFromScheduled(args: {
  scheduled: any[];
  lat: number;
  lng: number;
  roadAddress?: string | null;
  jibunAddress?: string | null;
}): number | undefined {
  const { scheduled, lat, lng, roadAddress, jibunAddress } = args;
  if (!scheduled?.length) return undefined;

  const key = posKey(lat, lng);
  const EPS = 1e-5;

  // 1) posKey 기준
  const byPosKey = scheduled.find((r: any) => r.posKey && r.posKey === key);
  if (byPosKey) {
    const raw = byPosKey.pinDraftId ?? byPosKey.pin_draft_id;
    if (raw != null && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }

  // 2) lat/lng 근사
  const byLatLng = scheduled.find(
    (r: any) =>
      typeof r.lat === "number" &&
      typeof r.lng === "number" &&
      Math.abs(r.lat - lat) < EPS &&
      Math.abs(r.lng - lng) < EPS
  );
  if (byLatLng) {
    const raw = byLatLng.pinDraftId ?? byLatLng.pin_draft_id;
    if (raw != null && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }

  // 3) 주소 기준 (addressLine)
  const addr = (roadAddress ?? jibunAddress ?? "").trim();
  if (addr) {
    const byAddr = scheduled.find(
      (r: any) => (r.addressLine ?? "").trim() === addr
    );
    if (byAddr) {
      const raw = byAddr.pinDraftId ?? byAddr.pin_draft_id;
      if (raw != null && Number.isFinite(Number(raw))) {
        return Number(raw);
      }
    }
  }

  return undefined;
}

/** ⭐ 낙관적 "답사예정" 표식을 좌표 기준으로 저장 (페이지 생명주기 동안 유지) */
export const optimisticPlannedPosSet = new Set<string>();
