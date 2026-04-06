"use client";

import { filled, hasPair } from "@/features/properties/lib/validators";
import { AspectRowLite } from "@/features/properties/types/property-domain";
import { useMemo } from "react";

type LooseAreaUnit = {
  exclusiveM2?: number | string | null;
  realM2?: number | string | null;
};
type LooseAreaSet = {
  title?: string;
  exMinM2?: string;
  exMaxM2?: string;
  exMinPy?: string;
  exMaxPy?: string;
  realMinM2?: string;
  realMaxM2?: string;
  realMinPy?: string;
  realMaxPy?: string;
  units?: LooseAreaUnit[];
};

type Args = {
  title: string;
  address: string;
  officePhone: string;
  parkingType?: string | null;
  parkingTypes?: string[];
  completionDate: string;
  salePrice: string;

  totalBuildings: string;
  totalFloors: string;
  totalHouseholds: string;
  remainingHouseholds: string;

  /** ✅ 옵션은 이제 options 배열만으로 판단 (직접입력 포함) */
  options: string[];

  unitLinesLen: number;
  /** ⭐ listingStars 제거 → parkingGrade 사용 */
  parkingGrade: "" | "1" | "2" | "3" | "4" | "5";
  aspects: AspectRowLite[];

  baseAreaSet: LooseAreaSet;
  extraAreaSets: LooseAreaSet[];
};

function getUnitsLen(s: LooseAreaSet): number {
  return Array.isArray(s?.units) ? s.units.length : 0;
}

/** ✨ 저장 버튼 활성 여부만 판단하는 훅 */
export function useCreateValidation(a: Args) {
  const baseHasExclusive = useMemo(
    () =>
      hasPair(a.baseAreaSet.exMinM2 ?? "", a.baseAreaSet.exMaxM2 ?? "") ||
      hasPair(a.baseAreaSet.exMinPy ?? "", a.baseAreaSet.exMaxPy ?? ""),
    [
      a.baseAreaSet.exMinM2,
      a.baseAreaSet.exMaxM2,
      a.baseAreaSet.exMinPy,
      a.baseAreaSet.exMaxPy,
    ]
  );

  const baseHasReal = useMemo(
    () =>
      hasPair(a.baseAreaSet.realMinM2 ?? "", a.baseAreaSet.realMaxM2 ?? "") ||
      hasPair(a.baseAreaSet.realMinPy ?? "", a.baseAreaSet.realMaxPy ?? ""),
    [
      a.baseAreaSet.realMinM2,
      a.baseAreaSet.realMaxM2,
      a.baseAreaSet.realMinPy,
      a.baseAreaSet.realMaxPy,
    ]
  );

  const extrasHaveExclusive = useMemo(
    () =>
      a.extraAreaSets.some(
        (s) =>
          hasPair(s.exMinM2 ?? "", s.exMaxM2 ?? "") ||
          hasPair(s.exMinPy ?? "", s.exMaxPy ?? "")
      ),
    [a.extraAreaSets]
  );

  const extrasHaveReal = useMemo(
    () =>
      a.extraAreaSets.some(
        (s) =>
          hasPair(s.realMinM2 ?? "", s.realMaxM2 ?? "") ||
          hasPair(s.realMinPy ?? "", s.realMaxPy ?? "")
      ),
    [a.extraAreaSets]
  );

  const hasExclusiveAny = baseHasExclusive || extrasHaveExclusive;
  const hasRealAny = baseHasReal || extrasHaveReal;

  const baseHasUnits = useMemo(
    () => getUnitsLen(a.baseAreaSet) > 0,
    [a.baseAreaSet]
  );
  const extrasHaveUnits = useMemo(
    () => a.extraAreaSets.some((s) => getUnitsLen(s) > 0),
    [a.extraAreaSets]
  );
  const hasUnitsAny = baseHasUnits || extrasHaveUnits;

  /** ✅ 옵션 유효성: options 배열에 하나 이상 들어 있으면 OK
   *  (프리셋 + 직접입력 모두 options에 들어가므로 이것만 보면 됨)
   */
  const optionsValid = useMemo(() => a.options.length > 0, [a.options]);

  const aspectsValid = useMemo(
    () => a.aspects.length > 0 && a.aspects[0].dir.trim().length > 0,
    [a.aspects]
  );

  const gradeNum = a.parkingGrade ? Number(a.parkingGrade) : 0;

  const isSaveEnabled = useMemo(() => {
    // 필수 필드: 이름, 주소, 분양실 전화번호 (좌표는 핀 생성 시 자동 입력)
    const requiredOk =
      filled(a.title) &&
      filled(a.address) &&
      filled(a.officePhone);

    // 나머지 필드는 모두 옵셔널
    return requiredOk;
  }, [
    a.title,
    a.address,
    a.officePhone,
  ]);

  return { isSaveEnabled };
}

/* ───────────── 수치/날짜 검증 유틸 (폼 밖에서도 재사용 가능하게) ───────────── */

/** 숫자 or null */
export const numOrNull = (v: any): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** min/max가 모두 채워졌을 때만 비교. 단, 0은 단독으로도 금지
 * 최소값=최대값 허용 */
export const isInvalidRange = (min: any, max: any, remainingHouseholds?: number | string | null) => {
  const a = numOrNull(min);
  const b = numOrNull(max);
  if (a === 0 || b === 0) return true;
  // 어느 한쪽만 입력된 경우, 저장 시점에 나머지가 자동 채워지므로 검증 통과 (false)
  if (a == null || b == null) return false;
  // 최대값이 최소값보다 작은 경우만 에러 (같은 값 허용)
  return b < a;
};

/** 구조별 최소/최대 매매가 검증
 * 최소값=최대값 허용 */
export const validateUnitPriceRanges = (
  units?: any[],
  remainingHouseholds?: number | string | null
): string | null => {
  if (!Array.isArray(units)) return null;

  const priceOrNull = (v: any): number | null => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  for (let i = 0; i < units.length; i++) {
    const u = units[i] ?? {};
    const min = priceOrNull(u?.minPrice ?? u?.primary);
    const max = priceOrNull(u?.maxPrice ?? u?.secondary);
    const label = (u?.label ?? u?.name ?? `${i + 1}번째 구조`).toString();

    // 🔹 최소/최대 둘 다 비어 있으면 에러 (최소 하나는 입력해야 함)
    if (min == null && max == null) {
      return `${label}: 최소 또는 최대 매매가를 입력해 주세요.`;
    }

    if (min === 0 || max === 0) {
      return `${label}: 0원은 입력할 수 없습니다.`;
    }

    // 둘 다 입력된 경우에만 대소 비교
    if (min != null && max != null && max < min) {
      return `${label}: 최대매매가는 최소매매가보다 크거나 같아야 합니다.`;
    }
  }
  return null;
};

/** 개별 평수 입력(전용/실평) 검증
 * 최소값=최대값 허용 */
export const validateAreaSets = (
  base: LooseAreaSet,
  extras: LooseAreaSet[],
  remainingHouseholds?: number | string | null
): string | null => {
  const checkOne = (set: any, titleForMsg: string) => {
    const pairs: Array<[any, any, string]> = [
      [set?.exMinM2, set?.exMaxM2, "전용(㎡)"],
      [set?.exMinPy, set?.exMaxPy, "전용(평)"],
      [set?.realMinM2, set?.realMaxM2, "실평(㎡)"],
      [set?.realMinPy, set?.realMaxPy, "실평(평)"],
    ];

    for (const [a, b, label] of pairs) {
      const na = numOrNull(a);
      const nb = numOrNull(b);
      if (na === 0 || nb === 0) {
        return `${titleForMsg} - ${label}: 0은 입력할 수 없습니다.`;
      }
    }
    for (const [a, b, label] of pairs) {
      if (isInvalidRange(a, b, remainingHouseholds)) {
        return `${titleForMsg} - ${label}: 최대값은 최소값보다 크거나 같아야 합니다.`;
      }
    }
    return null;
  };

  const baseErr = checkOne(base ?? {}, base?.title?.trim() || "기본 면적");
  if (baseErr) return baseErr;

  for (let i = 0; i < extras.length; i++) {
    const set = extras[i] ?? {};
    const title = set?.title?.trim() || `면적 그룹 ${i + 1}`;
    const err = checkOne(set, title);
    if (err) return err;
  }

  return null;
};

/** 2자리 패딩 */
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** 8자리 숫자(YYYYMMDD)는 YYYY-MM-DD로 포맷, 그 외는 트림만 */
export const normalizeDateInput = (raw?: string | null): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  return s;
};

/** 정확히 YYYY-MM-DD 형식 + 실제 존재하는 날짜만 true */
export const isValidIsoDateStrict = (s?: string | null): boolean => {
  const v = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};
