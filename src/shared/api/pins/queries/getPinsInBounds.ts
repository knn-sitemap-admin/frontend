import { api } from "../../api";

export type PinsMapQuery = {
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  isOld?: boolean;
  isNew?: boolean;
  favoriteOnly?: boolean;
  draftState?: "before" | "scheduled" | "all";
};

export type PinsMapPoint = {
  id: string;
  lat: number;
  lng: number;
  badge: string | null;
  title?: string | null;
  addressLine: string;
  isCompleted: boolean;
};

export type PinsMapDraft = {
  id: string;
  lat: number;
  lng: number;
  draftState: "BEFORE" | "SCHEDULED";
  title?: string | null;
  addressLine: string;
};

export type PinsMapResponse = {
  success: boolean;
  path: string;
  data: {
    mode: "point";
    points: PinsMapPoint[];
    drafts: PinsMapDraft[];
  } | null;
  messages?: string[];
  statusCode?: number;
};

// 🔹 bounds 값 숫자 검증 + NaN/Infinity 방지 (값이 있을 때만 체크)
const toNum = (label: string, v: unknown) => {
  if (v == null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(
      `fetchPinsInBounds: ${label} 값이 유효한 숫자가 아닙니다. (value=${String(
        v
      )})`
    );
  }
  return n;
};

/**
 * 지도 핀/임시핀 조회 API
 */
export async function getPinsInBounds(q: PinsMapQuery, signal?: AbortSignal) {
  // 🔹 안전한 파라미터로 변환 (값이 제공된 경우만)
  const safeParams: PinsMapQuery = {
    ...q,
    swLat: toNum("swLat", q.swLat),
    swLng: toNum("swLng", q.swLng),
    neLat: toNum("neLat", q.neLat),
    neLng: toNum("neLng", q.neLng),
  };

  const { data } = await api.get<PinsMapResponse>("/pins/map", {
    params: safeParams,
    withCredentials: true,
    signal,
  });

  if (!data?.success || !data?.data) {
    const msg = data?.messages?.join("\n") || "핀 조회 실패";
    throw new Error(msg);
  }

  const raw = data.data;

  // 🔹 응답 좌표도 number로 정규화
  const points: PinsMapPoint[] = (raw.points ?? []).map((p) => ({
    ...p,
    lat: Number(p.lat),
    lng: Number(p.lng),
    isCompleted: !!p.isCompleted,
  }));

  const drafts: PinsMapDraft[] = (raw.drafts ?? []).map((p) => ({
    ...p,
    lat: Number(p.lat),
    lng: Number(p.lng),
  }));

  return {
    ...raw,
    points,
    drafts,
  };
}

/** 별칭: 백엔드 컨트롤러 명칭과 통일 */
export const getMapPins = getPinsInBounds;
