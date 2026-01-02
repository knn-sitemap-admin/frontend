import { api } from "@/shared/api/api";

/** 공통 응답 형태 */
type ApiWrap<T> = { message?: string; data?: T };

/* ────────────────────────────────────────────
 * 타입들
 * ──────────────────────────────────────────── */

export type CreateSurveyReservationDto = {
  pinDraftId: number; // 임시핀 ID (프론트에서 좌표 예약 시 먼저 /pin-drafts로 생성)
  reservedDate: string; // "YYYY-MM-DD"
  note?: string; // 선택(서버가 무시해도 무방)
  insertAt?: number; // 선택: 0 이상 정수(없으면 맨 뒤)
};

export type MyReservation = {
  id: string; // 문자열 통일
  pinDraftId?: string | null;
  addressLine?: string | null;
  reservedDate?: string | null; // "YYYY-MM-DD"
  createdAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** 좌표 매칭/그룹핑 전용 키(소수점 5자리). ⚠️ 절대 역파싱해서 좌표로 쓰지 말 것! */
  posKey?: string;
  sortOrder?: number; // 0-based
  isActive?: boolean; // 서버가 주면 매핑
  isMine?: boolean; // 내 예약 여부
  assigneeId?: string | null; // 예약자 accountId
  assigneeName?: string | null; // 예약자 이름
};

export type BeforeDraft = {
  id: string;
  lat: number;
  lng: number;
  addressLine?: string | null;
  createdAt?: string | null;
  isActive?: boolean;
};

export type BoundsParams = {
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
};

export type ReorderItem = {
  reservationId: number | string;
  sortOrder: number; // 0..N-1
};

/* ────────────────────────────────────────────
 * 내부 유틸(정규화)
 * ──────────────────────────────────────────── */

const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStrOrNull = (v: unknown): string | null =>
  v == null ? null : String(v);

/**
 * posKey: 좌표 매칭/그룹핑용 키
 *  - 소수 5자리(≈1.1m)로 문자열화
 *  - ⚠️ 절대 split(',').map(Number)로 역파싱하여 좌표 전송에 쓰지 말 것!
 *    (payload 좌표는 항상 원본 lat/lng 숫자에서 직접 사용)
 */
export const makePosKey = (
  lat?: number | null,
  lng?: number | null
): string | undefined =>
  lat != null && lng != null
    ? `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`
    : undefined;

/** 서버 snake/camel 혼재 대비 */
const getPinDraftId = (raw: any) =>
  raw?.pinDraftId != null
    ? raw.pinDraftId
    : raw?.pin_draft_id != null
    ? raw.pin_draft_id
    : undefined;

/** 정렬 우선순위: sortOrder ASC → reservedDate ASC → id ASC (외부 재사용 가능) */
export const sortByServerRule = <
  T extends { sortOrder?: number; reservedDate?: string | null; id: string }
>(
  arr: T[]
) =>
  [...arr].sort((a, b) => {
    const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;

    const ad = a.reservedDate ?? "";
    const bd = b.reservedDate ?? "";
    if (ad !== bd) return ad < bd ? -1 : 1;

    return a.id.localeCompare(b.id);
  });

const normalizeReservation = (raw: any): MyReservation => {
  const lat = toNum(raw?.lat);
  const lng = toNum(raw?.lng);
  const pinDraftId = getPinDraftId(raw);
  return {
    id: String(raw?.id),
    pinDraftId: pinDraftId == null ? null : String(pinDraftId),
    addressLine:
      toStrOrNull(raw?.addressLine) ??
      toStrOrNull(raw?.road_address) ??
      toStrOrNull(raw?.jibun_address),
    reservedDate: toStrOrNull(raw?.reservedDate) ?? toStrOrNull(raw?.date),
    createdAt:
      toStrOrNull(raw?.createdAt) ?? toStrOrNull(raw?.created_at) ?? null,
    lat,
    lng,
    posKey: makePosKey(lat ?? undefined, lng ?? undefined),
    sortOrder: typeof raw?.sortOrder === "number" ? raw.sortOrder : undefined,
    isActive: typeof raw?.isActive === "boolean" ? raw.isActive : undefined,
    isMine: typeof raw?.isMine === "boolean" ? raw.isMine : undefined,
    assigneeId: toStrOrNull(raw?.assigneeId),
    assigneeName: toStrOrNull(raw?.assigneeName),
  };
};

const normalizeBeforeDraft = (raw: any): BeforeDraft => ({
  id: String(raw?.id),
  lat: Number(raw?.lat ?? NaN),
  lng: Number(raw?.lng ?? NaN),
  addressLine:
    toStrOrNull(raw?.addressLine) ??
    toStrOrNull(raw?.road_address) ??
    toStrOrNull(raw?.jibun_address),
  createdAt:
    toStrOrNull(raw?.createdAt) ?? toStrOrNull(raw?.created_at) ?? null,
  isActive: typeof raw?.isActive === "boolean" ? raw.isActive : undefined,
});

/** Idempotency-Key 생성 */
const makeIdempotencyKey = () => {
  try {
    if ((globalThis as any)?.crypto?.randomUUID) {
      return (globalThis as any).crypto.randomUUID();
    }
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/* ────────────────────────────────────────────
 * API
 * ──────────────────────────────────────────── */

/**
 * 0) 예약 전 임시핀 목록 GET /survey-reservations/before
 * - 서버 스펙: Query/body 없음, 세션 불필요
 * - 프론트에서는 좌표 원본(lat/lng)을 그대로 유지한 채로 only-view에 사용
 */
export async function fetchUnreservedDrafts(
  _bounds?: BoundsParams,
  signal?: AbortSignal
): Promise<BeforeDraft[]> {
  const res = await api.get<ApiWrap<any[]>>("/survey-reservations/before", {
    withCredentials: false,
    signal,
  });

  const payload = (res.data as any) ?? {};
  const list = Array.isArray(payload.data) ? payload.data : [];

  const drafts = list.map(normalizeBeforeDraft) as BeforeDraft[];
  return drafts.filter(
    (d): d is BeforeDraft => Number.isFinite(d.lat) && Number.isFinite(d.lng)
  );
}

/**
 * 1) 예약 생성 POST /survey-reservations (insertAt 지원)
 * - payload에는 어떠한 좌표 가공도 하지 않음(여기서는 pinDraftId만 전송).
 * - 좌표 기반 예약 시에는 컨텍스트 메뉴 측에서 먼저 /pin-drafts로 원본 좌표를 그대로 생성하고,
 *   반환받은 draftId를 여기 pinDraftId로 넘겨서 호출해야 함.
 */
export async function createSurveyReservation(
  dto: CreateSurveyReservationDto,
  signal?: AbortSignal
): Promise<{ id: string; sortOrder: number }> {
  // insertAt 음수/소수 방어 (좌표와 무관)
  const body = {
    ...dto,
    insertAt:
      typeof dto.insertAt === "number" && dto.insertAt >= 0
        ? Math.floor(dto.insertAt)
        : undefined,
  };

  const res = await api.post<
    ApiWrap<{ id: number | string; sortOrder: number }>
  >("/survey-reservations", body, {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      // "Idempotency-Key": makeIdempotencyKey(),
    },
    signal,
  });

  const payload = (res.data as any) ?? {};
  const inner = payload.data ?? payload;
  if (!inner || inner.id == null) {
    throw new Error("Invalid response: missing reservation id");
  }
  if (typeof inner.sortOrder !== "number") {
    throw new Error("Invalid response: missing sortOrder");
  }
  return { id: String(inner.id), sortOrder: inner.sortOrder };
}

/* ────────────────────────────────────────────
 * 2) 내 예약 목록 GET /survey-reservations/scheduled
 *    in-flight 요청 dedupe
 * ──────────────────────────────────────────── */

let inFlightScheduled: Promise<MyReservation[]> | null = null;

async function fetchMySurveyReservationsRaw(
  signal?: AbortSignal
): Promise<MyReservation[]> {
  const res = await api.get<ApiWrap<any[]>>("/survey-reservations/scheduled", {
    withCredentials: true,
    signal,
  });

  const payload = (res.data as any) ?? {};
  const list = Array.isArray(payload.data) ? payload.data : [];
  const normalized = list.map(normalizeReservation);

  // 서버가 정렬해줘도 방어적으로 한 번 더 보정
  return sortByServerRule(normalized);
}

/**
 * - 여러 컴포넌트에서 동시에 호출해도 네트워크는 1번만 나가도록 in-flight dedupe
 * - AbortSignal이 필요한 특수 케이스는 fetchMySurveyReservationsRaw를 직접 사용
 */
export function fetchMySurveyReservations(
  signal?: AbortSignal
): Promise<MyReservation[]> {
  if (signal) {
    // 별도 취소 제어가 필요하면 캐시 없이 raw 버전 사용
    return fetchMySurveyReservationsRaw(signal);
  }

  if (!inFlightScheduled) {
    inFlightScheduled = fetchMySurveyReservationsRaw().finally(() => {
      inFlightScheduled = null;
    });
  }

  return inFlightScheduled;
}

/**
 * 3) 예약 순서 재정렬 PATCH /survey-reservations/reorder
 * - 좌표 무관, sortOrder 정수화만 수행
 */
export async function reorderSurveyReservations(
  items: ReorderItem[],
  signal?: AbortSignal
): Promise<{ count: number }> {
  const payload = {
    items: items
      .map((it) => ({
        reservationId: it.reservationId,
        sortOrder: Math.max(0, Math.floor(it.sortOrder)),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };

  const res = await api.patch<ApiWrap<{ count: number }>>(
    "/survey-reservations/reorder",
    payload,
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
      signal,
    }
  );

  const data = (res.data as any) ?? {};
  const inner = data.data ?? data;
  return { count: Number(inner?.count ?? 0) };
}

/**
 * 4) 예약 취소 DELETE /survey-reservations/:id (순서 압축)
 * - 좌표와 무관
 */
export async function cancelSurveyReservation(
  id: number | string,
  signal?: AbortSignal
): Promise<{
  reservationId: string;
  pinDraftId?: string | null;
  alreadyCanceled?: boolean;
}> {
  const res = await api.delete<ApiWrap<any>>(`/survey-reservations/${id}`, {
    withCredentials: true,
    signal,
  });

  const payload = (res.data as any) ?? {};
  const inner = payload.data ?? payload;

  return {
    reservationId: String(inner?.reservationId ?? id),
    pinDraftId:
      inner?.pin_draft_id != null ? String(inner.pin_draft_id) : undefined,
    alreadyCanceled:
      typeof inner?.alreadyCanceled === "boolean"
        ? inner.alreadyCanceled
        : undefined,
  };
}

/** 숫자/문자 혼용 id 비교 */
export const eqId = (
  a: string | number | null | undefined,
  b: string | number | null | undefined
) => a != null && b != null && String(a) === String(b);
