import { UpdatePinDto } from "@/shared/api/pins";
import {
  mapBadgeToPinKind,
  mapPinKindToBadge,
} from "@/features/properties/lib/badge";
import { buildAreaGroups } from "@/features/properties/lib/area";
import type { AreaSet as StrictAreaSet } from "@/features/properties/components/sections/AreaSetsSection/types";
import { normalizeBuildingType } from "./buildingType";

/* ───────── 기본 유틸 ───────── */

const N = (v: any): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const S = (v: any): string | undefined => {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : undefined;
};

const toBool = (v: any): boolean | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number")
    return v === 1 ? true : v === 0 ? false : undefined;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "y", "yes", "o"].includes(s)) return true;
  if (["0", "false", "n", "no", "x"].includes(s)) return false;
  return undefined;
};

/* AreaSet 정규화 */
const toStrictAreaSet = (s: any): StrictAreaSet => ({
  title: String(s?.title ?? ""),
  exMinM2: String(s?.exMinM2 ?? ""),
  exMaxM2: String(s?.exMaxM2 ?? ""),
  exMinPy: String(s?.exMinPy ?? ""),
  exMaxPy: String(s?.exMaxPy ?? ""),
  realMinM2: String(s?.realMinM2 ?? ""),
  realMaxM2: String(s?.realMaxM2 ?? ""),
  realMinPy: String(s?.realMinPy ?? ""),
  realMaxPy: String(s?.realMaxPy ?? ""),
});

/* ✅ 옵션 빌드/정규화 (핀 PATCH용) */
const buildOptionsFromForm = (f: any) => {
  const selected: string[] = Array.isArray(f.options) ? f.options : [];
  const has = (label: string) => selected.includes(label);

  const extraRaw = String(f.optionEtc ?? "").trim();
  const hasExplicitEtcFlag = typeof f.etcChecked === "boolean";

  let extraOptionsText: string | null | undefined;

  if (hasExplicitEtcFlag) {
    // ✳️ 실제 폼에서 사용하는 케이스 (OptionsSection 의 etcChecked 사용)
    if (f.etcChecked) {
      // 직접입력 ON → 글자가 있으면 그 값, 없으면 null 로 보내서 기존값 삭제
      extraOptionsText = extraRaw ? extraRaw.slice(0, 255) : null;
    } else {
      // 직접입력 OFF → 항상 null 보내서 DB 값 지우기
      extraOptionsText = null;
    }
  } else {
    // ✳️ 옛날/호환용: etcChecked 없는 폼
    // 글자가 있으면 그 값, 없으면 null
    extraOptionsText = extraRaw ? extraRaw.slice(0, 255) : null;
  }

  const out: any = {
    hasAircon: has("에어컨"),
    hasFridge: has("냉장고"),
    hasWasher: has("세탁기"),
    hasDryer: has("건조기"),
    hasBidet: has("비데"),
    hasAirPurifier: has("공기순환기"),
    hasIslandTable: has("아일랜드 식탁"),
    hasKitchenWindow: has("주방창"),
    hasCityGas: has("도시가스"),
    hasInduction: has("인덕션"),
    // ✅ 항상 키 생성 (문자열이든 null 이든)
    extraOptionsText: extraOptionsText ?? null,
    // ✅ Nullable Enum 4개 (null 허용)
    kitchenLayout: f.kitchenLayout ?? null,
    fridgeSlot: f.fridgeSlot ?? null,
    sofaSize: f.sofaSize ?? null,
    livingRoomView: f.livingRoomView ?? null,
  };

  // 🔥 항상 객체를 리턴해서 options 패치가 가능하게
  return out;
};

/* ⚠️ 비교용 옵션 정규화(빈 값 제거) */
const normalizeOptionsForCompare = (o: any) => {
  if (!o) return null;
  const t = (s: any) => {
    const v = String(s ?? "").trim();
    return v ? v.slice(0, 255) : undefined;
  };
  const x = {
    hasAircon: !!o.hasAircon || undefined,
    hasFridge: !!o.hasFridge || undefined,
    hasWasher: !!o.hasWasher || undefined,
    hasDryer: !!o.hasDryer || undefined,
    hasBidet: !!o.hasBidet || undefined,
    hasAirPurifier: !!o.hasAirPurifier || undefined,
    hasIslandTable: !!o.hasIslandTable || undefined,
    hasKitchenWindow: !!o.hasKitchenWindow || undefined,
    hasCityGas: !!o.hasCityGas || undefined,
    hasInduction: !!o.hasInduction || undefined,
    extraOptionsText: t(o.extraOptionsText),
    // ✅ Nullable Enum 4개
    kitchenLayout: o.kitchenLayout ?? undefined,
    fridgeSlot: o.fridgeSlot ?? undefined,
    sofaSize: o.sofaSize ?? undefined,
    livingRoomView: o.livingRoomView ?? undefined,
  };
  const y: any = {};
  for (const [k, v] of Object.entries(x)) if (v !== undefined) y[k] = v;
  return Object.keys(y).length ? y : null;
};

export function deepPrune<T>(obj: T): Partial<T> {
  const prune = (v: any): any => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) {
      const arr = v.map(prune).filter((x: unknown) => x !== undefined);
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
  const pruned = prune(obj);
  return (pruned ?? {}) as Partial<T>;
}

export function hasMeaningfulPatch(obj: object | null | undefined): boolean {
  if (!obj) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  for (const k of keys) {
    const v = (obj as any)[k];
    if (v !== undefined) return true;
  }
  return false;
}

/* ───────── 향/방향 & 유닛 비교 유틸 ───────── */
const normStrU = (v: any): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" || s === "-" || s === "—" ? undefined : s;
};

type UnitLike2 = {
  rooms?: number | string | null;
  baths?: number | string | null;
  duplex?: boolean;
  terrace?: boolean;
  primary?: number | string | null;
  secondary?: number | string | null;
  hasLoft?: boolean;
  hasTerrace?: boolean;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  note?: string | null;
};
const bPick = (u: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = u?.[k];
    if (typeof v === "boolean") return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
  }
  return false;
};
const nPick = <T>(u: any, ...keys: string[]) => {
  for (const k of keys) if (u?.[k] !== undefined) return u[k] as T;
  return undefined as unknown as T;
};
const toNumOrNull = (v: any): number | null => {
  const n = N(v);
  return n === undefined ? null : n;
};
const normUnit = (u?: UnitLike2) => {
  const x: any = u ?? {};
  return {
    rooms: toNumOrNull(nPick(x, "rooms")),
    baths: toNumOrNull(nPick(x, "baths")),
    hasLoft: bPick(x, "hasLoft", "duplex"),
    hasTerrace: bPick(x, "hasTerrace", "terrace"),
    minPrice: toNumOrNull(nPick(x, "minPrice", "primary")),
    maxPrice: toNumOrNull(nPick(x, "maxPrice", "secondary")),
    note: nPick<string | null>(x, "note") ?? null,
  };
};
const sameUnit2 = (a?: UnitLike2, b?: UnitLike2) => {
  const A = normUnit(a);
  const B = normUnit(b);
  return (
    A.rooms === B.rooms &&
    A.baths === B.baths &&
    A.hasLoft === B.hasLoft &&
    A.hasTerrace === B.hasTerrace &&
    A.minPrice === B.minPrice &&
    A.maxPrice === B.maxPrice &&
    A.note === B.note
  );
};
const unitsChanged = (prev?: any[], curr?: any[]) => {
  const P = Array.isArray(prev) ? prev : undefined;
  const C = Array.isArray(curr) ? curr : undefined;
  if (!P && !C) return false;
  if (!P || !C) return true;
  if (P.length !== C.length) return true;
  for (let i = 0; i < P.length; i++) if (!sameUnit2(P[i], C[i])) return true;
  return false;
};

export type InitialSnapshot = { [key: string]: any };

/* ───────── 폼 → 서버 최소 PATCH ───────── */
export function toPinPatch(f: any, initial: InitialSnapshot): UpdatePinDto {
  const patch: Partial<UpdatePinDto> = {};
  const S2 = (v: any) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t ? t : undefined;
  };
  const N2 = (v: any): number | undefined => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };
  const jsonEq2Local = (a: any, b: any) => {
    const norm = (x: any) =>
      x === "" || x === null || x === undefined ? undefined : x;
    try {
      return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
    } catch {
      return false;
    }
  };

  // name
  const initName = (initial as any)?.name ?? (initial as any)?.title ?? "";
  const nowName = S2((f as any).title);
  if (nowName !== undefined && !jsonEq2Local(initName, nowName))
    (patch as any).name = nowName;

  // 연락처
  const initMainLabel =
    (initial as any)?.contactMainLabel ?? (initial as any)?.officeName ?? "";
  const initMainPhone =
    (initial as any)?.contactMainPhone ?? (initial as any)?.officePhone ?? "";
  const initSubPhone =
    (initial as any)?.contactSubPhone ?? (initial as any)?.officePhone2 ?? "";
  const nowMainLabel = S2((f as any).officeName);
  const nowMainPhone = S2((f as any).officePhone);
  const nowSubPhone = S2((f as any).officePhone2);
  if (nowMainLabel !== undefined && !jsonEq2Local(initMainLabel, nowMainLabel))
    (patch as any).contactMainLabel = nowMainLabel;
  if (nowMainPhone !== undefined && !jsonEq2Local(initMainPhone, nowMainPhone))
    (patch as any).contactMainPhone = nowMainPhone;
  if (nowSubPhone !== undefined && !jsonEq2Local(initSubPhone, nowSubPhone))
    (patch as any).contactSubPhone = nowSubPhone;

  // 완공일
  if (
    !jsonEq2Local((initial as any)?.completionDate, (f as any).completionDate)
  ) {
    (patch as any).completionDate = S2((f as any).completionDate) ?? null;
  }

  // 엘리베이터 (초기 스냅샷 + 서버값 모두 고려)
  const initElev = toBool(
    (initial as any)?.initialHasElevator ??
      (initial as any)?.hasElevator ??
      (initial as any)?.elevator
  );
  const nowElev = toBool((f as any)?.elevator);

  if (nowElev !== undefined && nowElev !== initElev)
    (patch as any).hasElevator = nowElev;

  // 메모
  if (!jsonEq2Local((initial as any)?.publicMemo, (f as any).publicMemo))
    (patch as any).publicMemo = (f as any).publicMemo ?? null;
  const initPrivate =
    (initial as any)?.privateMemo ?? (initial as any)?.secretMemo;
  if (!jsonEq2Local(initPrivate, (f as any).secretMemo))
    (patch as any).privateMemo = (f as any).secretMemo ?? null;

  /* ✅ 옵션 diff */
  {
    const nowOpts = buildOptionsFromForm(f);

    // 초기 상태를 "슬라이스 + 옵션텍스트" 기준으로 재구성
    const initFromSlices = buildOptionsFromForm({
      options:
        (initial as any)?.options ??
        (initial as any)?.options?.options ??
        (initial as any)?.optionsLabels ??
        (initial as any)?.optionList ??
        [],
      optionEtc:
        (initial as any)?.optionEtc ?? (initial as any)?.extraOptionsText ?? "",
      etcChecked: true,
    });

    const sameBySlices =
      JSON.stringify(normalizeOptionsForCompare(initFromSlices)) ===
      JSON.stringify(normalizeOptionsForCompare(nowOpts));

    // 🔥 슬라이스 기준으로라도 달라졌으면 무조건 options 패치
    if (!sameBySlices) {
      (patch as any).options = nowOpts; // 객체(upsert) – extraOptionsText 포함
    }
  }

  // 최저 실입
  const initMinCost =
    (initial as any)?.minRealMoveInCost ??
    (Number.isFinite(Number((initial as any)?.salePrice))
      ? Number((initial as any)?.salePrice)
      : undefined);
  const nowMinCostNum = N2((f as any).salePrice);
  if (!jsonEq2Local(initMinCost, nowMinCostNum))
    (patch as any).minRealMoveInCost = nowMinCostNum ?? null;

  // ⭐ 리베이트 텍스트 diff
  {
    const initRebateRaw =
      (initial as any)?.rebateText ??
      (initial as any)?.rebate ??
      (initial as any)?.rebateMemo ??
      "";

    const nowRebateRaw = (f as any)?.rebateText ?? (f as any)?.rebateRaw ?? "";

    const prev = initRebateRaw == null ? "" : String(initRebateRaw).trim();
    const next = nowRebateRaw == null ? "" : String(nowRebateRaw).trim();

    if (prev !== next) {
      (patch as any).rebateText = next;
    }
  }

  // --- 건물유형: 폼 buildingType 을 그대로 normalize 해서 전송 ---
  {
    const btNowUI = (f as any)?.buildingType ?? null;
    const btNow = normalizeBuildingType(btNowUI);
    const btInit = normalizeBuildingType(
      (initial as any)?.buildingType ?? (initial as any)?.initialBuildingType
    );

    // btNow === null → 선택 해제, null 전송
    // btNow 가 undefined 이면(인식 못한 값) → 아무 것도 안 보냄
    if (btNow !== undefined && !jsonEq2Local(btInit, btNow)) {
      (patch as any).buildingType = btNow ?? null;
    }
  }

  // ── 핀종류(pinKind) 변경 감지 ──
  {
    const initPinKind =
      (initial as any)?.pinKind ??
      ((initial as any)?.badge
        ? mapBadgeToPinKind((initial as any).badge)
        : undefined);
    const nowPinKind = (f as any)?.pinKind;
    if (nowPinKind !== undefined && nowPinKind !== initPinKind) {
      (patch as any).pinKind = nowPinKind;
      try {
        const badge = mapPinKindToBadge?.(nowPinKind);
        if (badge) (patch as any).badge = badge;
      } catch {}
    }
  }

  // 경사/구조 grade
  if (!jsonEq2Local((initial as any)?.slopeGrade, (f as any).slopeGrade))
    (patch as any).slopeGrade = (f as any).slopeGrade ?? null;
  if (
    !jsonEq2Local((initial as any)?.structureGrade, (f as any).structureGrade)
  )
    (patch as any).structureGrade = (f as any).structureGrade ?? null;

  /* ── 주차 관련 필드 ── */

  // 1) 주차 별점
  const pgInitRaw = (initial as any)?.parkingGrade;
  const pgInitNorm =
    pgInitRaw == null || String(pgInitRaw).trim() === ""
      ? null
      : String(pgInitRaw).trim();

  const pgNowRaw = (f as any).parkingGrade;
  const pgNowNorm =
    pgNowRaw == null || String(pgNowRaw).trim() === ""
      ? null
      : String(pgNowRaw).trim();

  if (!jsonEq2Local(pgInitNorm, pgNowNorm)) {
    (patch as any).parkingGrade = pgNowNorm;
  }

  // 2) parkingType 텍스트
  {
    const raw = (f as any).parkingType;
    const trimmed = raw == null ? "" : String(raw).trim();
    const value =
      trimmed === "" || trimmed === "custom" ? null : trimmed.slice(0, 50);

    const initParkingType = (initial as any)?.parkingType ?? null; // 서버 초기값

    if (value !== initParkingType) {
      (patch as any).parkingType = value;
    }
  }

  // 3) totalParkingSlots
  const slotsInitRaw = (initial as any)?.totalParkingSlots;
  const slotsInit =
    slotsInitRaw == null || String(slotsInitRaw).trim() === ""
      ? null
      : Number(String(slotsInitRaw).replace(/[^\d]/g, ""));

  const slotsNowRaw = (f as any).totalParkingSlots;
  const slotsNow =
    slotsNowRaw == null || String(slotsNowRaw).trim() === ""
      ? null
      : Number(String(slotsNowRaw).replace(/[^\d]/g, ""));

  if (!jsonEq2Local(slotsInit, slotsNow)) {
    (patch as any).totalParkingSlots = slotsNow;
  }

  // 숫자들
  const initTotalBuildings = N2((initial as any)?.totalBuildings);
  const initTotalFloors = N2((initial as any)?.totalFloors);
  const initTotalHouseholds = N2((initial as any)?.totalHouseholds);
  const initRemainingHouseholds = N2((initial as any)?.remainingHouseholds);

  const nowTotalBuildings = N2((f as any).totalBuildings);
  const nowTotalFloors = N2((f as any).totalFloors);
  const nowTotalHouseholds = N2((f as any).totalHouseholds);
  const nowRemainingHouseholds = N2((f as any).remainingHouseholds);

  if (!jsonEq2Local(initTotalBuildings, nowTotalBuildings))
    (patch as any).totalBuildings = nowTotalBuildings ?? null;
  if (!jsonEq2Local(initTotalFloors, nowTotalFloors))
    (patch as any).totalFloors = nowTotalFloors ?? null;
  if (!jsonEq2Local(initTotalHouseholds, nowTotalHouseholds))
    (patch as any).totalHouseholds = nowTotalHouseholds ?? null;
  if (!jsonEq2Local(initRemainingHouseholds, nowRemainingHouseholds))
    (patch as any).remainingHouseholds = nowRemainingHouseholds ?? null;

  // === 면적: 단일값 + 범위 ===
  {
    const {
      exclusiveArea,
      realArea,
      extraExclusiveAreas,
      extraRealAreas,
      baseAreaTitleOut,
      extraAreaTitlesOut,
    } = (f as any).packAreas?.() ?? {};

    const Snum = (v: any) =>
      v === null || v === undefined || v === "" ? undefined : String(v).trim();

    if (!jsonEq2Local((initial as any)?.exclusiveArea, exclusiveArea))
      (patch as any).exclusiveArea = Snum(exclusiveArea) ?? null;

    if (!jsonEq2Local((initial as any)?.realArea, realArea))
      (patch as any).realArea = Snum(realArea) ?? null;

    if (
      !jsonEq2Local((initial as any)?.extraExclusiveAreas, extraExclusiveAreas)
    )
      (patch as any).extraExclusiveAreas = Array.isArray(extraExclusiveAreas)
        ? extraExclusiveAreas
        : [];

    if (!jsonEq2Local((initial as any)?.extraRealAreas, extraRealAreas))
      (patch as any).extraRealAreas = Array.isArray(extraRealAreas)
        ? extraRealAreas
        : [];

    if (!jsonEq2Local((initial as any)?.baseAreaTitleOut, baseAreaTitleOut))
      (patch as any).baseAreaTitleOut = Snum(baseAreaTitleOut) ?? null;

    if (!jsonEq2Local((initial as any)?.extraAreaTitlesOut, extraAreaTitlesOut))
      (patch as any).extraAreaTitlesOut = Array.isArray(extraAreaTitlesOut)
        ? extraAreaTitlesOut
        : [];
  }

  // 2) 범위(m²/평)
  {
    const normNum = (v: any): string | undefined => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? String(n) : undefined;
    };

    const initSnap = {
      exMin: normNum((initial as any)?.exclusiveAreaMin),
      exMax: normNum((initial as any)?.exclusiveAreaMax),
      exMinPy: normNum((initial as any)?.exclusiveAreaMinPy),
      exMaxPy: normNum((initial as any)?.exclusiveAreaMaxPy),
      realMin: normNum((initial as any)?.realAreaMin),
      realMax: normNum((initial as any)?.realAreaMax),
      realMinPy: normNum((initial as any)?.realAreaMinPy),
      realMaxPy: normNum((initial as any)?.realAreaMaxPy),
    };

    const s = (f as any).baseAreaSet ?? {};
    const nowSnap = {
      exMin: normNum(
        s?.exclusiveMin ?? s?.exMinM2 ?? s?.exclusive?.minM2 ?? s?.m2Min
      ),
      exMax: normNum(
        s?.exclusiveMax ?? s?.exMaxM2 ?? s?.exclusive?.maxM2 ?? s?.m2Max
      ),
      exMinPy: normNum(
        s?.exclusiveMinPy ?? s?.exMinPy ?? s?.exclusive?.minPy ?? s?.pyMin
      ),
      exMaxPy: normNum(
        s?.exclusiveMaxPy ?? s?.exMaxPy ?? s?.exclusive?.maxPy ?? s?.pyMax
      ),
      realMin: normNum(s?.realMin ?? s?.realMinM2 ?? s?.real?.minM2),
      realMax: normNum(s?.realMax ?? s?.realMaxM2 ?? s?.real?.maxM2),
      realMinPy: normNum(s?.realMinPy ?? s?.real?.minPy),
      realMaxPy: normNum(s?.realMaxPy ?? s?.real?.maxPy),
    };

    const putIfChanged = (key: keyof typeof initSnap, patchKey: string) => {
      const prev = (initSnap as any)[key];
      const curr = (nowSnap as any)[key];
      if (curr !== undefined && curr !== prev) (patch as any)[patchKey] = curr;
    };

    putIfChanged("exMin", "exclusiveAreaMin");
    putIfChanged("exMax", "exclusiveAreaMax");
    putIfChanged("exMinPy", "exclusiveAreaMinPy");
    putIfChanged("exMaxPy", "exclusiveAreaMaxPy");
    putIfChanged("realMin", "realAreaMin");
    putIfChanged("realMax", "realAreaMax");
    putIfChanged("realMinPy", "realAreaMinPy");
    putIfChanged("realMaxPy", "realAreaMaxPy");
  }

  type AreaGroupNorm = {
    title: string;
    exclusiveMinM2?: string;
    exclusiveMaxM2?: string;
    realMinM2?: string;
    realMaxM2?: string;
  };

  /* 3) 면적 그룹 — 초기 vs 현재 그룹 ‘정규화’ 비교 */
  {
    const canonNumStr = (v: any): string | undefined => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(n)) return undefined;
      const r = Math.round(n * 1000) / 1000;
      return String(+r.toFixed(3));
    };

    const normGroup = (g: any): AreaGroupNorm => ({
      title: String(g?.title ?? "").trim(),
      exclusiveMinM2: canonNumStr(
        g?.exclusiveMinM2 ?? g?.exMinM2 ?? g?.exclusiveMin
      ),
      exclusiveMaxM2: canonNumStr(
        g?.exclusiveMaxM2 ?? g?.exMaxM2 ?? g?.exclusiveMax
      ),
      realMinM2: canonNumStr(g?.realMinM2 ?? g?.actualMinM2 ?? g?.realMin),
      realMaxM2: canonNumStr(g?.realMaxM2 ?? g?.actualMaxM2 ?? g?.realMax),
    });

    const pickMeaningful = (arr: unknown): AreaGroupNorm[] =>
      Array.isArray(arr)
        ? (arr as any[])
            .map((g: any) => normGroup(g))
            .filter(
              (x: AreaGroupNorm) =>
                x.title ||
                x.exclusiveMinM2 ||
                x.exclusiveMaxM2 ||
                x.realMinM2 ||
                x.realMaxM2
            )
        : [];

    const keyOf = (g: AreaGroupNorm) =>
      `${g.title}|${g.exclusiveMinM2 ?? ""}|${g.exclusiveMaxM2 ?? ""}|${
        g.realMinM2 ?? ""
      }|${g.realMaxM2 ?? ""}`;

    const sortForCmp = (arr: AreaGroupNorm[]) =>
      [...arr].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

    const initGroupsRaw: any[] = Array.isArray((initial as any)?.areaGroups)
      ? (initial as any).areaGroups
      : [];

    const strictBase = toStrictAreaSet((f as any).baseAreaSet ?? {});
    const strictExtras = (
      Array.isArray((f as any).extraAreaSets) ? (f as any).extraAreaSets : []
    ).map(toStrictAreaSet);

    let nowGroupsRaw: any[] = [];
    try {
      nowGroupsRaw = buildAreaGroups(strictBase, strictExtras) ?? [];
    } catch {
      nowGroupsRaw = [];
    }

    const initNorm = sortForCmp(pickMeaningful(initGroupsRaw));
    const nowNorm = sortForCmp(pickMeaningful(nowGroupsRaw));
    const hasAreaGroupsDelta =
      JSON.stringify(initNorm) !== JSON.stringify(nowNorm);

    // 🔥 핵심: "실제로 폼에서 면적 세트를 건드렸는지" 플래그만 신뢰
    const areaSetsTouched = !!(f as any).areaSetsTouched;

    if (areaSetsTouched && hasAreaGroupsDelta) {
      (patch as any).areaGroups = nowGroupsRaw.length ? nowGroupsRaw : [];
    }
  }

  // ── 향/방향: 변경시에만 directions 전송 ─────────────────────
  {
    const initialHasAnyAspect =
      !!normStrU((initial as any)?.aspect) ||
      !!normStrU((initial as any)?.aspectNo) ||
      !!normStrU((initial as any)?.aspect1) ||
      !!normStrU((initial as any)?.aspect2) ||
      !!normStrU((initial as any)?.aspect3) ||
      (Array.isArray((initial as any)?.orientations) &&
        (initial as any).orientations.length > 0) ||
      (Array.isArray((initial as any)?.directions) &&
        (initial as any).directions.length > 0);

    const pickDirStringsFromInitial = (init: any): string[] => {
      const fromArr = (Array.isArray(init?.directions) ? init.directions : [])
        .map(
          (d: any) =>
            [d?.direction, d?.dir, d?.value, d?.name, d?.code]
              .map((x) => (typeof x === "string" ? x.trim() : ""))
              .find((x) => !!x) || ""
        )
        .filter(Boolean);
      if (fromArr.length) return fromArr;
      return [init?.aspect1, init?.aspect2, init?.aspect3]
        .map((v: any) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
    };

    const hoNum = (v: any) => {
      const s = String(v ?? "").replace(/[^\d]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };

    const pickHoDirPairsFromForm = () => {
      const bo = (f as any).buildOrientation?.() ?? {};
      const oNow = Array.isArray(bo.orientations) ? bo.orientations : [];
      let pairs = oNow
        .map((o: any) => {
          const dir =
            [o?.dir, o?.value, o?.direction, o?.name, o?.code]
              .map((x) => (typeof x === "string" ? x.trim() : ""))
              .find((x) => !!x) || "";
          const ho = hoNum(o?.ho);
          return dir ? { ho, dir } : null;
        })
        .filter(Boolean) as Array<{ ho: number; dir: string }>;
      if (!pairs.length) {
        const arr = [bo.aspect1, bo.aspect2, bo.aspect3]
          .map((v: any) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean);
        pairs = arr.map((dir: string, idx: number) => ({ ho: idx + 1, dir }));
      }
      pairs.sort((a, b) => a.ho - b.ho);
      return pairs;
    };

    const normSet = (arr: string[]) =>
      Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      );

    const initDirs = normSet(pickDirStringsFromInitial(initial));
    const nowPairs = pickHoDirPairsFromForm();
    const nowDirsSet = normSet(nowPairs.map((p) => p.dir));

    if ((f as any).aspectsTouched) {
      if (initialHasAnyAspect) {
        if (JSON.stringify(initDirs) !== JSON.stringify(nowDirsSet)) {
          (patch as any).directions = nowPairs.map((p) => ({
            direction: p.dir,
          }));
        }
      } else {
        (patch as any).directions = nowPairs.map((p) => ({
          direction: p.dir,
        }));
      }
    }
  }

  // 구조(units)
  const initialUnits = ((initial as any)?.unitLines ??
    (initial as any)?.units) as any[] | undefined;
  const currentUnits = ((f as any).unitLines ?? []) as any[];
  if (unitsChanged(initialUnits, currentUnits)) {
    const units = (currentUnits ?? [])
      .map((u) => {
        const n = {
          rooms: toNumOrNull(u?.rooms),
          baths: toNumOrNull(u?.baths),
          hasLoft: !!(u?.hasLoft ?? u?.duplex),
          hasTerrace: !!(u?.hasTerrace ?? u?.terrace),
          minPrice: toNumOrNull(u?.minPrice ?? u?.primary),
          maxPrice: toNumOrNull(u?.maxPrice ?? u?.secondary),
          note: (u?.note ?? null) as string | null,
        };
        const hasAny =
          n.rooms != null ||
          n.baths != null ||
          n.hasLoft ||
          n.hasTerrace ||
          n.minPrice != null ||
          n.maxPrice != null ||
          (n.note ?? "") !== "";
        return hasAny
          ? {
              rooms: n.rooms,
              baths: n.baths,
              hasLoft: n.hasLoft,
              hasTerrace: n.hasTerrace,
              minPrice: n.minPrice,
              maxPrice: n.maxPrice,
              note: n.note ?? null,
            }
          : null;
      })
      .filter(Boolean) as NonNullable<UpdatePinDto["units"]>;
    (patch as any).units = units;
  }

  return patch as UpdatePinDto;
}

/* 🔧 무의미한 null/빈값 제거: 초기 스냅샷 기준으로 noop이면 dto에서 삭제 */
export const stripNoopNulls = (dto: any, initial: any) => {
  const norm = (x: any) =>
    x === "" || x === null || x === undefined ? undefined : x;

  for (const k of Object.keys(dto)) {
    const v = dto[k];

    if (v === undefined) {
      delete dto[k];
      continue;
    }

    if (v === null && norm(initial?.[k]) === undefined) {
      // parkingTypeId는 더 이상 사용 안 함
      delete dto[k];
      continue;
    }

    // ✅ directions / units 는 빈 배열이라도 보존
    if (Array.isArray(v) && v.length === 0) {
      if (k === "directions" || k === "units") continue;
      delete dto[k];
      continue;
    }
    if (typeof v === "object" && v && Object.keys(v).length === 0) {
      delete dto[k];
      continue;
    }
  }
  return dto;
};

/* 🔎 신축/구옥 초기값 유도: ageType / buildingAgeType / isNew/isOld / buildingGrade 모두 고려 */
export function deriveInitialBuildingGradeFrom(src: any): "new" | "old" {
  if (!src) return "new";

  const t = (src?.ageType ?? src?.buildingAgeType ?? "")
    .toString()
    .toUpperCase();
  if (t === "NEW") return "new";
  if (t === "OLD") return "old";

  if (src?.isNew === true && src?.isOld !== true) return "new";
  if (src?.isOld === true && src?.isNew !== true) return "old";

  const g = (src?.buildingGrade ?? "").toString().toLowerCase();
  if (g === "new") return "new";
  if (g === "old") return "old";

  return "new";
}
