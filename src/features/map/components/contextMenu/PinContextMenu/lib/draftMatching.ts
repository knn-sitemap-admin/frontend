import type { BeforeDraft } from "@/shared/api/survey-reservations/surveyReservations";

/** 🔹 소수점 5자리 posKey (UI 그룹/매칭 전용) */
export function posKey(lat: number, lng: number) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** draftId 우선 추출 */
export function extractDraftIdFromPin(pin: any): number | undefined {
  const explicitDraftId = pin?.pinDraftId ?? pin?.draftId ?? pin?.draft?.id;
  if (explicitDraftId != null) {
    const n = Number(explicitDraftId);
    if (Number.isFinite(n)) return n;
  }

  // __visit__ prefix가 있으면 draftId로 파싱 (임시핀)
  if (typeof pin?.id === "string" && pin.id.startsWith("__visit__")) {
    const n = Number(pin.id.replace(/^__visit__/, ""));
    if (Number.isFinite(n)) return n;
  } else if (pin?.source === "draft") {
    // source가 draft로 명시되어 있으면 id 자체를 반환
    const n = Number(pin?.id);
    if (Number.isFinite(n)) return n;
  }

  return undefined;
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
  
  // 1) 정확한 DB 좌표 기반 (우선)
  const byExactPos = before.find((d) => Number(d.lat) === lat && Number(d.lng) === lng);
  if (byExactPos) return Number(byExactPos.id);

  const targetKey = posKey(lat, lng);

  // 2) posKey 기반
  const byPos = before.find(
    (d) => `${Number(d.lat).toFixed(5)},${Number(d.lng).toFixed(5)}` === targetKey
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
