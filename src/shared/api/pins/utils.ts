import type { CreatePinOptionsDto } from "@/features/properties/types/property-dto";
import type { UnitsItemDto, CreatePinDirectionDto } from "./types";
import { CreatePinAreaGroupDto } from "@/features/properties/types/area-group-dto";

/* 개발환경 플래그 */
export const DEV = process.env.NODE_ENV !== "production";

/* ───────────── 유틸 ───────────── */
export function makeIdempotencyKey() {
  try {
    if ((globalThis as any).crypto?.randomUUID)
      return (globalThis as any).crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 해시(중복 방지)용 6자리 근사치. "전송"에는 절대 사용하지 않음. */
export const round6 = (n: string | number) => {
  const v = Number(n);
  return Math.round(v * 1e6) / 1e6;
};

export const isFiniteNum = (v: any) => Number.isFinite(Number(v));

/* 숫자 정규화: 정수 또는 null */
export const toIntOrNull = (v: any): number | null => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/* 숫자 정규화: 소수 유지 (units minPrice/maxPrice 등). null/빈값 → null */
export const toNumOrNull = (v: any): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* 🔐 parkingGrade 정규화(문자열로 보냄): 1~5 → "1".."5", null 유지, 그 외는 undefined(필드 제외) */
export function normalizeParkingGradeStr(
  v: unknown,
  fallback?: unknown
): string | null | undefined {
  const src = v ?? fallback;
  if (src === null) return null;
  const s = String(src ?? "").trim();
  if (!s) return undefined; // ← 빈 문자열/공백은 필드 제외
  const n = Number(s);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return String(n);
  return undefined;
}

/* ✅ UI 등기/용도 → 서버 허용값 강제 변환
 *  - 도/생(도시형생활주택 계열) → "도생"
 *  - 근/생(근린생활시설 계열) → "근생"
 */
export function toServerBuildingType(
  v: any
): "APT" | "OP" | "주택" | "도생" | "근생" | undefined {
  if (v == null) return undefined;

  const raw = String(v).trim();
  if (!raw) return undefined;

  const s = raw.toLowerCase();

  // APT
  if (["apt", "아파트"].includes(s)) return "APT";

  // OP
  if (["op", "officetel", "오피스텔", "오피스텔형"].includes(s)) return "OP";

  // 주택
  if (["house", "housing", "주택", "residential"].includes(s)) return "주택";

  // ✅ 도/생(도시형생활주택 계열) → "도생"
  if (
    ["도생", "도/생", "도시생활형", "도시생활형주택", "urban", "urb"].includes(
      s
    )
  )
    return "도생";

  // ✅ 근생(근린생활시설 계열) → "근생"
  if (
    [
      "근생",
      "근/생",
      "near",
      "nearlife",
      "근린생활시설",
      "commercial",
    ].includes(s)
  )
    return "근생";

  // 이미 서버 enum 문자열로 들어온 경우(raw 그대로 비교)
  if (["APT", "OP", "주택", "도생", "근생"].includes(raw)) {
    return raw as "APT" | "OP" | "주택" | "도생" | "근생";
  }

  return undefined;
}

/* ───────────── 빈 PATCH 방지 헬퍼 ───────────── */
export function deepPrune<T>(obj: T): Partial<T> {
  const prune = (v: any): any => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) {
      const arr = v.map(prune).filter((x) => x !== undefined);
      return arr.length ? arr : undefined;
    }
    if (v && typeof v === "object") {
      const out: Record<string, any> = {};
      for (const [k, vv] of Object.entries(v)) {
        const pv = prune(vv);
        if (pv !== undefined) out[k] = pv;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return v;
  };
  return (prune(obj) ?? {}) as Partial<T>;
}

export function isEmpty(obj: object | null | undefined) {
  return !obj || Object.keys(obj).length === 0;
}

/* 옵션 sanitize: boolean은 !!로, extraOptionsText는 255자로 제한
   - extraOptionsText 가 null 로 넘어오면 null 을 그대로 유지해서
     DB 기존 값을 삭제할 수 있게 함
   - nullable enum 필드는 그대로 전달 (null 허용)
*/
export function sanitizeOptions(
  o?: CreatePinOptionsDto | null
): CreatePinOptionsDto | null | undefined {
  // null 그대로 넘길 일은 거의 없지만 혹시 대비
  if (o == null) return o;

  const payload: any = {
    hasAircon: !!o.hasAircon,
    hasFridge: !!o.hasFridge,
    hasWasher: !!o.hasWasher,
    hasDryer: !!o.hasDryer,
    hasBidet: !!o.hasBidet,
    hasAirPurifier: !!o.hasAirPurifier,
    isDirectLease: !!o.isDirectLease,
    hasIslandTable: !!o.hasIslandTable,
    hasKitchenWindow: !!o.hasKitchenWindow,
    hasCityGas: !!o.hasCityGas,
    hasInduction: !!o.hasInduction,
    kitchenLayout: o.kitchenLayout ?? null,
    fridgeSlot: o.fridgeSlot ?? null,
    sofaSize: o.sofaSize ?? null,
    livingRoomView: o.livingRoomView ?? null,
  };

  // extraOptionsText 키가 실제로 들어왔는지 여부
  const hasExtraKey = Object.prototype.hasOwnProperty.call(
    o,
    "extraOptionsText"
  );
  const raw = (o as any).extraOptionsText;

  if (typeof raw === "string") {
    const trimmed = raw.trim().slice(0, 255);

    if (trimmed) {
      // 글자가 있으면 잘라서 그대로 보냄
      payload.extraOptionsText = trimmed;
    } else if (hasExtraKey) {
      // "" 이지만 키가 명시적으로 온 경우 → 삭제 의도라고 보고 null 전송
      payload.extraOptionsText = null;
    }
  } else if (raw === null && hasExtraKey) {
    // 명시적으로 null 이 넘어온 경우 → 그대로 null 유지 (DB 값 삭제)
    payload.extraOptionsText = null;
  }
  // raw 가 undefined 이고 키도 없으면 아무 것도 안 붙임 (옵션 텍스트 건드리지 않은 케이스)

  return payload;
}

/* directions sanitize: 문자열/객체 혼재 허용, 공백만 제거(중복/제한 없음) */
export function sanitizeDirections(
  dirs?: Array<CreatePinDirectionDto | string>
): CreatePinDirectionDto[] | undefined {
  if (!Array.isArray(dirs) || dirs.length === 0) return undefined;

  const out = dirs
    .map((d) => {
      const label =
        typeof d === "string"
          ? d
          : typeof (d as any)?.direction === "string"
          ? (d as any).direction
          : "";
      const t = String(label ?? "");
      const normalized = t.trim();
      return normalized
        ? ({ direction: normalized } as CreatePinDirectionDto)
        : null;
    })
    .filter(Boolean) as CreatePinDirectionDto[];

  return out.length ? out : undefined;
}

/* areaGroups sanitize: 전용 min/max는 필수, 실제 min/max는 없으면 전용값으로 대체 */
export function sanitizeAreaGroups(
  list?: CreatePinAreaGroupDto[] | null
): CreatePinAreaGroupDto[] | undefined {
  if (!Array.isArray(list)) return undefined;

  const out: CreatePinAreaGroupDto[] = [];
  list.forEach((g, idx) => {
    if (!g) return;

    const title = String(g.title ?? "").trim();
    if (!title) return;

    // 전용(㎡) — 필수
    const exMin = Number(g.exclusiveMinM2);
    const exMax = Number(g.exclusiveMaxM2);
    if (!Number.isFinite(exMin) || !Number.isFinite(exMax)) return;
    if (exMin > exMax) return; // 역전 방지 (같은 값 허용)

    // 실제(㎡) — 선택 (미입력 시 null)
    const hasActMin =
      g.actualMinM2 != null && Number.isFinite(Number(g.actualMinM2));
    const hasActMax =
      g.actualMaxM2 != null && Number.isFinite(Number(g.actualMaxM2));

    const actMin = hasActMin ? Number(g.actualMinM2) : null;
    const actMax = hasActMax ? Number(g.actualMaxM2) : null;

    if (actMin != null && actMax != null && actMin > actMax) return; // 역전 방지 (같은 값 허용)

    out.push({
      title: title.slice(0, 50),
      exclusiveMinM2: exMin,
      exclusiveMaxM2: exMax,
      actualMinM2: actMin,
      actualMaxM2: actMax,
      sortOrder:
        Number.isFinite(Number(g.sortOrder)) && Number(g.sortOrder) >= 0
          ? Number(g.sortOrder)
          : idx,
    });
  });

  return out;
}

/* units sanitize: 정수/boolean 캐스팅 + 음수 0 가드, 빈배열 → [] */
export function sanitizeUnits(
  list?: UnitsItemDto[] | null
): UnitsItemDto[] | undefined {
  if (!Array.isArray(list)) return undefined;

  const nz = (n: number | null) => (n != null && n < 0 ? 0 : n);

  const mapped = list.map((u) => {
    const minP = toNumOrNull(u?.minPrice);
    const maxP = toNumOrNull(u?.maxPrice);
    return {
      rooms: nz(toIntOrNull(u?.rooms)),
      baths: nz(toIntOrNull(u?.baths)),
      hasLoft: !!u?.hasLoft,
      hasTerrace: !!u?.hasTerrace,
      minPrice: minP,
      maxPrice: maxP,
    };
  });

  return mapped;
}

/* 🔹 export: draft id 보정 유틸 */
export function coercePinDraftId(v: any): number | undefined {
  if (v == null || String(v) === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
