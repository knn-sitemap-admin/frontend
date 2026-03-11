"use client";

import type { UpdatePayload } from "@/features/properties/types/property-dto";
import type {
  Grade,
  UnitLine,
  OrientationRow,
  BuildingType,
} from "@/features/properties/types/property-domain";
import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "@/features/properties/types/property-dto";
import type { ImageItem } from "@/features/properties/types/media";
import type { PinKind } from "@/features/pins/types";

import {
  deepEq,
  defined,
  jsonEq,
  toIntOrNull,
  toNumericStringOrUndefined,
  toParkingGradeOrUndefined,
} from "./utils";
import { areaSetsToGroups, normalizeAreaGroupsForCompare } from "./area";
import { unitLinesChanged, normalizeUnit } from "./unit";
import { createPatchHelpers } from "./patchHelpers";
import { AreaSet } from "../../types/editForm.types";
import { PRESET_OPTIONS } from "@/features/properties/components/constants";
import { sanitizeOptions } from "@/shared/api/pins/utils";
import { buildOptionsForServer } from "@/features/properties/create/lib/buildCreatePayload/options";
import type { CreatePinOptionsDto } from "@/features/properties/types/property-dto";

/* ───────── UI 등기(용도) 타입 ───────── */
export type RegistryUi = "주택" | "APT" | "OP" | "도/생" | "근/생";

/* ───────── 입력 타입 ───────── */
type BuildUpdateArgs = {
  // 기본
  title?: string;
  address?: string;
  officeName?: string;
  officePhone?: string;
  officePhone2?: string;
  moveIn?: string;
  floor?: string;
  roomNo?: string;
  structure?: string;

  // 평점/주차/준공/매매
  parkingGrade?: "" | "1" | "2" | "3" | "4" | "5";
  /** ✅ 주차유형 문자열(자유양식) */
  parkingType?: string | null;
  totalParkingSlots?: number | string | null;
  completionDate?: string;
  salePrice?: string | number | null;

  // 면적 (단일값 + 범위)
  baseAreaSet?: AreaSet;
  extraAreaSets?: AreaSet[];
  exclusiveArea?: string;
  realArea?: string;
  extraExclusiveAreas?: string[];
  extraRealAreas?: string[];
  baseAreaTitleOut?: string;
  extraAreaTitlesOut?: string[];

  // 플랫 키(있으면 우선 사용)
  exclusiveAreaMin?: string | number | null;
  exclusiveAreaMax?: string | number | null;
  exclusiveAreaMinPy?: string | number | null;
  exclusiveAreaMaxPy?: string | number | null;
  realAreaMin?: string | number | null;
  realAreaMax?: string | number | null;
  realAreaMinPy?: string | number | null;
  realAreaMaxPy?: string | number | null;

  // 등기/등급/엘리베이터
  /** 🔥 undefined일 때는 패치에서 완전히 제외하기 위함 */
  elevator?: "O" | "X" | undefined;
  registry?: RegistryUi;
  registryOne?: RegistryUi;
  slopeGrade?: Grade;
  structureGrade?: Grade;

  // 숫자
  totalBuildings?: string | number | null;
  totalFloors?: string | number | null;
  totalHouseholds?: string | number | null;
  remainingHouseholds?: string | number | null;

  // 옵션/메모
  options?: string[];
  etcChecked?: boolean;
  optionEtc?: string;
  /** ✅ 서버 options.extraOptionsText 로 매핑될 값(없어도 됨) */
  extraOptionsText?: string | null;
  publicMemo?: string | null;
  secretMemo?: string | null;
  // ✅ Nullable Enum 4개 (별도 관리)
  kitchenLayout?: KitchenLayout | null;
  fridgeSlot?: FridgeSlot | null;
  sofaSize?: SofaSize | null;
  livingRoomView?: LivingRoomView | null;

  // 향/유닛
  orientations?:
    | OrientationRow[]
    | Array<{
        dir?: string;
        weight?: number | null;
        ho?: string | number | null;
        value?: number | null;
      }>;
  aspect?: string;
  aspectNo?: number;
  aspect1?: string;
  aspect2?: string;
  aspect3?: string;
  unitLines?: UnitLine[];

  imageFolders?: ImageItem[][];
  verticalImages?: ImageItem[];

  pinKind?: PinKind;

  buildingGrade?: "new" | "old";

  // ✅ 수정모달에서 선택한 건물유형
  buildingType?: BuildingType | null;

  rebateText?: string | null;
};

/** 초기 스냅샷: 자유 키 접근 허용 */
type InitialSnapshot = Partial<BuildUpdateArgs> & { [key: string]: any };

/* ───────── 헬퍼: 옵션에서 커스텀 라벨만 추출 ───────── */
const normalizeLabel = (s: string) => s.trim().toLowerCase();
const PRESET_SET = new Set(PRESET_OPTIONS.map(normalizeLabel));

function extractCustomOptionLabels(options?: string[]): string[] {
  if (!Array.isArray(options)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of options) {
    if (typeof raw !== "string") continue;
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    // 프리셋(에어컨/냉장고/...)은 제외
    if (PRESET_SET.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/* ───────── 메인 ───────── */
export function buildUpdatePayload(
  a: BuildUpdateArgs,
  initial?: InitialSnapshot
): UpdatePayload {
  /* 이미지 URL 수집 */
  const urlsHorizontal: string[] = [];
  const urlsVertical: string[] = [];
  const pushUrl = (into: string[], u?: string) => {
    if (typeof u !== "string") return;
    const s = u.trim();
    if (!s) return;
    // ✅ blob:, data: 같은 로컬 전용 URL은 서버로 보내지 않도록 필터링
    if (!/^https?:\/\//.test(s)) return;
    if (!into.includes(s)) into.push(s);
  };

  if (Array.isArray(a.imageFolders)) {
    for (const g of a.imageFolders) {
      const items = Array.isArray(g) ? g : (g as any)?.images ?? [];
      for (const img of items) pushUrl(urlsHorizontal, img?.url);
    }
  }
  if (Array.isArray(a.verticalImages)) {
    for (const img of a.verticalImages) pushUrl(urlsVertical, img?.url);
  }

  // 기존 optionEtc 필드는 일단 그대로 유지(서버에서 아직 참고하고 있을 수 있으므로)
  const optionEtcFinal = a.etcChecked
    ? (a.optionEtc ?? "").trim()
    : a.optionEtc ?? "";

  // 숫자 필드
  const totalBuildingsN = defined(a.totalBuildings)
    ? toIntOrNull(a.totalBuildings)
    : undefined;
  const totalFloorsN = defined(a.totalFloors)
    ? toIntOrNull(a.totalFloors)
    : undefined;
  const totalHouseholdsN = defined(a.totalHouseholds)
    ? toIntOrNull(a.totalHouseholds)
    : undefined;
  const remainingHouseholdsN = defined(a.remainingHouseholds)
    ? toIntOrNull(a.remainingHouseholds)
    : undefined;

  const totalParkingSlotsN = defined(a.totalParkingSlots)
    ? toIntOrNull(a.totalParkingSlots)
    : undefined;

  const salePriceStr = toNumericStringOrUndefined(a.salePrice);
  const parkingGradeVal = toParkingGradeOrUndefined(
    a.parkingGrade ?? undefined
  );

  const patch: UpdatePayload = {} as UpdatePayload;

  // 공통 patch 헬퍼 생성
  const { put, putAllowNull, putKeepEmptyArray, putAny } = createPatchHelpers(
    patch as any,
    initial as any
  );

  /* ===== 기본 ===== */

  // 🔥 초기 제목: initial.initialName → name/title → raw.name/raw.title 순서로 찾기
  const prevNameOrTitle =
    (initial as any)?.initialName ?? // view 전용
    (initial as any)?.name ??
    (initial as any)?.title ??
    (initial as any)?.raw?.name ?? // 서버 raw
    (initial as any)?.raw?.title ??
    undefined;

  put("title", a.title, prevNameOrTitle);
  put("address", a.address, initial?.address);
  put("officeName", a.officeName, initial?.officeName);
  put("officePhone", a.officePhone, initial?.officePhone);
  put("officePhone2", a.officePhone2, initial?.officePhone2);
  put("moveIn", a.moveIn, initial?.moveIn);
  put("floor", a.floor, initial?.floor);
  put("roomNo", a.roomNo, initial?.roomNo);
  put("structure", a.structure, initial?.structure);

  /* ===== 향/방향 ===== */
  put("aspect", a.aspect, initial?.aspect);

  const prevAspectNoStr =
    initial?.aspectNo == null ? undefined : String(initial!.aspectNo as any);

  put(
    "aspectNo",
    defined(a.aspectNo) ? String(a.aspectNo) : undefined,
    prevAspectNoStr
  );

  put("aspect1", a.aspect1, initial?.aspect1);
  put("aspect2", a.aspect2, initial?.aspect2);
  put("aspect3", a.aspect3, initial?.aspect3);

  /** directions로 변환해서 서버 규격에 맞게 보냄 */
  let directions: Array<{ direction: string }> | undefined;

  if (Array.isArray(a.orientations) && a.orientations.length > 0) {
    directions = a.orientations
      .map((o: any) => {
        const v =
          (typeof o?.dir === "string" && o.dir.trim()) ||
          (typeof o?.value === "string" && o.value.trim()) ||
          undefined;
        return v ? { direction: v } : undefined;
      })
      .filter(Boolean) as Array<{ direction: string }>;
  } else {
    const arr = [a.aspect1, a.aspect2, a.aspect3]
      .map((v) => (v && String(v).trim()) || "")
      .filter(Boolean);
    if (arr.length) directions = arr.map((d) => ({ direction: d }));
  }

  /** initial도 directions 기준으로 비교 */
  const initialDirections = (initial as any)?.directions as
    | Array<{ direction: string }>
    | undefined;

  putKeepEmptyArray("directions", directions, initialDirections);

  /* ===== 가격/주차/준공 ===== */
  const prevSaleStr =
    initial?.salePrice === undefined || initial?.salePrice === null
      ? undefined
      : String(initial!.salePrice as any);

  // ✅ parkingType 문자열 PATCH (trim + 최대 50자, 빈문자 → null)
  if (defined(a.parkingType)) {
    const raw = a.parkingType ?? "";
    const trimmed = raw.toString().trim().slice(0, 50);
    const nextParkingType =
      trimmed.length === 0 ? null : (trimmed as string | null);
    const prevParkingType = (initial as any)?.parkingType ?? null;

    putAllowNull("parkingType", nextParkingType, prevParkingType);
  }

  put(
    "salePrice",
    defined(a.salePrice) ? salePriceStr : undefined,
    prevSaleStr
  );

  putAllowNull(
    "totalParkingSlots",
    totalParkingSlotsN,
    initial?.totalParkingSlots
  );
  put("completionDate", a.completionDate, initial?.completionDate);

  /* ===== 평점 ===== */
  if (defined(a.parkingGrade) && parkingGradeVal !== undefined) {
    put("parkingGrade", parkingGradeVal, initial?.parkingGrade);
  }

  // 🔥 elevator ("O" | "X") ↔ hasElevator(boolean | null) 동기화
  if (defined(a.elevator)) {
    const nextHasElevator =
      a.elevator === "O" ? true : a.elevator === "X" ? false : null;

    // ⬇️ initial.hasElevator 없으면 initial.initialHasElevator 를 사용
    const prevHasElevator =
      (initial as any)?.hasElevator ??
      (initial as any)?.initialHasElevator ??
      null;

    putAllowNull("hasElevator", nextHasElevator, prevHasElevator);
  }

  /* ===== 숫자 ===== */
  putAllowNull("totalBuildings", totalBuildingsN, initial?.totalBuildings);
  putAllowNull("totalFloors", totalFloorsN, initial?.totalFloors);
  putAllowNull("totalHouseholds", totalHouseholdsN, initial?.totalHouseholds);
  putAllowNull(
    "remainingHouseholds",
    remainingHouseholdsN,
    initial?.remainingHouseholds
  );

  /* ===== 등급/등기 ===== */
  put("slopeGrade", a.slopeGrade, initial?.slopeGrade);
  put("structureGrade", a.structureGrade, initial?.structureGrade);

  const uiRegistry = a.registry ?? a.registryOne;
  const prevRegistry =
    (initial as any)?.registry ?? (initial as any)?.registryOne;
  put("registry", uiRegistry, prevRegistry);

  /* ✅ 신축/구옥 → isNew / isOld 매핑 */
  if (defined(a.buildingGrade)) {
    const nextIsNew = a.buildingGrade === "new";
    const nextIsOld = a.buildingGrade === "old";
    putAny("isNew", nextIsNew, (initial as any)?.isNew);
    putAny("isOld", nextIsOld, (initial as any)?.isOld);
  }

  /* (대안) 서버가 building.grade 를 받는 경우 */
  if (defined(a.buildingGrade)) {
    const nextGrade =
      a.buildingGrade === "new" || a.buildingGrade === "old"
        ? a.buildingGrade
        : null;
    const prevGrade = (initial as any)?.building?.grade ?? null;
    if (initial === undefined || !deepEq(prevGrade, nextGrade)) {
      const prevBuilding = (initial as any)?.building ?? {};
      (patch as any).building = { ...prevBuilding, grade: nextGrade };
    }
  }

  // ✅ 건물유형(도생/근생/주택 등) PATCH
  if (defined(a.buildingType)) {
    const prevBuildingType =
      (initial as any)?.buildingType ??
      (initial as any)?.initialBuildingType ??
      null;

    putAllowNull("buildingType", a.buildingType ?? null, prevBuildingType);
  }

  /* ===== 옵션/메모 ===== */

  // 옵션 배열에서 "에어컨/냉장고/..." 를 제외한 **커스텀 라벨만 모아서**
  //    options.extraOptionsText 로 보낼 문자열 생성
  const customLabels = extractCustomOptionLabels(a.options);

  // - 직접입력 토글이 false 면 무조건 null 로 보내서 서버 값 제거
  // - 그 외엔 커스텀 라벨이 있으면 "자전거, 데스크탑" 이런 식으로 join, 없으면 null
  let nextExtraFromOptions: string | null =
    customLabels.length > 0 ? customLabels.join(", ") : null;

  if (a.etcChecked === false) {
    nextExtraFromOptions = null;
  }

  // (혹시 a.extraOptionsText 를 직접 채워서 부른 경우가 있으면, 그 값이 우선)
  if (defined(a.extraOptionsText)) {
    const raw = (a.extraOptionsText ?? "").toString().trim();
    nextExtraFromOptions = raw.length === 0 ? null : raw;
  }

  const prevExtraText = (initial as any)?.extraOptionsText ?? null;
  putAllowNull("extraOptionsText", nextExtraFromOptions, prevExtraText);

  // 옵션 객체 생성 (CreatePinOptionsDto)
  // 필드 단위 patch: 변경된 필드만 포함
  const prevOptions = (initial as any)?.options ?? null;
  const optionsForServerBase = buildOptionsForServer(a.options ?? []);

  // 변경된 필드만 포함하는 options 객체 생성
  const optionsForServer: any = {
    ...optionsForServerBase,
    extraOptionsText: nextExtraFromOptions,
    // ✅ Nullable Enum 4개 (별도 관리)
    kitchenLayout: a.kitchenLayout ?? null,
    fridgeSlot: a.fridgeSlot ?? null,
    sofaSize: a.sofaSize ?? null,
    livingRoomView: a.livingRoomView ?? null,
  };

  const sanitizedOptions = sanitizeOptions(optionsForServer);
  if (sanitizedOptions != null && Object.keys(sanitizedOptions).length > 0) {
    putAllowNull("options", sanitizedOptions, prevOptions);
  }

  // 기존 optionEtc 필드도 그대로 유지(혹시 다른 곳에서 쓰고 있을 수 있으므로)
  if (defined(a.optionEtc)) {
    put("optionEtc", optionEtcFinal, initial?.optionEtc);
  }

  put("publicMemo", a.publicMemo, initial?.publicMemo);
  put("secretMemo", a.secretMemo, initial?.secretMemo);

  // ✅ 리베이트 텍스트 PATCH
  if (defined(a.rebateText)) {
    const nextRebate = (a.rebateText ?? "").toString().trim();
    const prevRebate = (initial as any)?.rebateText ?? "";
    if (initial === undefined || !deepEq(prevRebate, nextRebate)) {
      (patch as any).rebateText = nextRebate;
    }
  }

  /* ===== 면적 (레거시 단일값) ===== */
  put("exclusiveArea", a.exclusiveArea, initial?.exclusiveArea);
  put("realArea", a.realArea, initial?.realArea);
  putKeepEmptyArray(
    "extraExclusiveAreas",
    a.extraExclusiveAreas,
    initial?.extraExclusiveAreas
  );
  putKeepEmptyArray(
    "extraRealAreas",
    a.extraRealAreas,
    initial?.extraRealAreas
  );

  /* ===== 면적 (신규: 범위) ===== */
  const explicitRangeTouched =
    defined(a.exclusiveAreaMin) ||
    defined(a.exclusiveAreaMax) ||
    defined(a.exclusiveAreaMinPy) ||
    defined(a.exclusiveAreaMaxPy) ||
    defined(a.realAreaMin) ||
    defined(a.realAreaMax) ||
    defined(a.realAreaMinPy) ||
    defined(a.realAreaMaxPy) ||
    defined(a.baseAreaSet) ||
    defined(a.extraAreaSets) ||
    defined(a.baseAreaTitleOut) ||
    defined(a.extraAreaTitlesOut);

  const initialHasRangeKeys =
    (initial as any)?.exclusiveAreaMin !== undefined ||
    (initial as any)?.exclusiveAreaMax !== undefined ||
    (initial as any)?.exclusiveAreaMinPy !== undefined ||
    (initial as any)?.exclusiveAreaMaxPy !== undefined ||
    (initial as any)?.realAreaMin !== undefined ||
    (initial as any)?.realAreaMax !== undefined ||
    (initial as any)?.realAreaMinPy !== undefined ||
    (initial as any)?.realAreaMaxPy !== undefined;

  if (explicitRangeTouched || initialHasRangeKeys) {
    const pickNumStr = (v: any) => toNumericStringOrUndefined(v);

    const fromSet = (s?: any) => ({
      exMin: pickNumStr(
        s?.exclusiveMin ?? s?.exMinM2 ?? s?.exclusive?.minM2 ?? s?.m2Min
      ),
      exMax: pickNumStr(
        s?.exclusiveMax ?? s?.exMaxM2 ?? s?.exclusive?.maxM2 ?? s?.m2Max
      ),
      exMinPy: pickNumStr(
        s?.exclusiveMinPy ?? s?.exMinPy ?? s?.exclusive?.minPy ?? s?.pyMin
      ),
      exMaxPy: pickNumStr(
        s?.exclusiveMaxPy ?? s?.exMaxPy ?? s?.exclusive?.maxPy ?? s?.pyMax
      ),
      realMin: pickNumStr(s?.realMin ?? s?.realMinM2 ?? s?.real?.minM2),
      realMax: pickNumStr(s?.realMax ?? s?.realMaxM2 ?? s?.real?.maxM2),
      realMinPy: pickNumStr(s?.realMinPy ?? s?.real?.minPy),
      realMaxPy: pickNumStr(s?.realMaxPy ?? s?.real?.maxPy),
    });

    const S = fromSet(a.baseAreaSet as any);

    let exMin = pickNumStr(defined(a.exclusiveAreaMin) ? a.exclusiveAreaMin : S.exMin);
    let exMax = pickNumStr(defined(a.exclusiveAreaMax) ? a.exclusiveAreaMax : S.exMax);
    if (exMin !== undefined && exMax === undefined) exMax = exMin;
    if (exMax !== undefined && exMin === undefined) exMin = exMax;

    let exMinPy = pickNumStr(defined(a.exclusiveAreaMinPy) ? a.exclusiveAreaMinPy : S.exMinPy);
    let exMaxPy = pickNumStr(defined(a.exclusiveAreaMaxPy) ? a.exclusiveAreaMaxPy : S.exMaxPy);
    if (exMinPy !== undefined && exMaxPy === undefined) exMaxPy = exMinPy;
    if (exMaxPy !== undefined && exMinPy === undefined) exMinPy = exMaxPy;

    let realMin = pickNumStr(defined(a.realAreaMin) ? a.realAreaMin : S.realMin);
    let realMax = pickNumStr(defined(a.realAreaMax) ? a.realAreaMax : S.realMax);
    if (realMin !== undefined && realMax === undefined) realMax = realMin;
    if (realMax !== undefined && realMin === undefined) realMin = realMax;

    let realMinPy = pickNumStr(defined(a.realAreaMinPy) ? a.realAreaMinPy : S.realMinPy);
    let realMaxPy = pickNumStr(defined(a.realAreaMaxPy) ? a.realAreaMaxPy : S.realMaxPy);
    if (realMinPy !== undefined && realMaxPy === undefined) realMaxPy = realMinPy;
    if (realMaxPy !== undefined && realMinPy === undefined) realMinPy = realMaxPy;

    putAny("exclusiveAreaMin", exMin, (initial as any)?.exclusiveAreaMin);
    putAny("exclusiveAreaMax", exMax, (initial as any)?.exclusiveAreaMax);
    putAny("exclusiveAreaMinPy", exMinPy, (initial as any)?.exclusiveAreaMinPy);
    putAny("exclusiveAreaMaxPy", exMaxPy, (initial as any)?.exclusiveAreaMaxPy);

    putAny("realAreaMin", realMin, (initial as any)?.realAreaMin);
    putAny("realAreaMax", realMax, (initial as any)?.realAreaMax);
    putAny("realAreaMinPy", realMinPy, (initial as any)?.realAreaMinPy);
    putAny("realAreaMaxPy", realMaxPy, (initial as any)?.realAreaMaxPy);
  }

  /* ===== 면적 (그룹: areaGroups) ===== */
  const currAreaGroupsRaw = areaSetsToGroups(
    a.baseAreaSet,
    a.extraAreaSets,
    a.baseAreaTitleOut,
    a.extraAreaTitlesOut
  );
  const prevAreaGroupsRaw = (initial as any)?.areaGroups as any[] | undefined;

  const currAreaGroups = normalizeAreaGroupsForCompare(currAreaGroupsRaw);
  const prevAreaGroups = normalizeAreaGroupsForCompare(prevAreaGroupsRaw);

  // 규칙:
  //  - 초기값이 없는 신규 생성(initial === undefined) 이면 값이 있으면 areaGroups 보냄
  //  - 수정(initial 존재)에서는 "실제 면적 범위 입력을 건드렸을 때(explicitRangeTouched)"만 areaGroups 전송
  // [최적화] 변경사항이 있을 때만 전송
  if (!deepEq(prevAreaGroups, currAreaGroups)) {
    (patch as any).areaGroups = currAreaGroupsRaw.length
      ? currAreaGroupsRaw
      : [];
  }

  /* ===== 유닛 ===== */
  if (defined(a.unitLines)) {
    const prevUnits = (initial as any)?.unitLines as UnitLine[] | undefined;
    const currUnits = a.unitLines as UnitLine[] | undefined;
    if (initial === undefined || unitLinesChanged(prevUnits, currUnits)) {
      (patch as any).unitLines = currUnits ?? [];
      (patch as any).units = (currUnits ?? []).map(normalizeUnit);
    }
  }

  /* ===== 이미지 ===== */
  if (urlsHorizontal.length) {
    const prevImages = (initial as any)?.images;
    if (initial === undefined || !jsonEq(prevImages, urlsHorizontal)) {
      (patch as any).images = urlsHorizontal;
    }
  }
  if (urlsVertical.length) {
    const prevVerticalA = (initial as any)?.imagesVertical;
    const prevVerticalB = (initial as any)?.verticalImages;
    if (
      initial === undefined ||
      (!jsonEq(prevVerticalA, urlsVertical) &&
        !jsonEq(prevVerticalB, urlsVertical))
    ) {
      (patch as any).imagesVertical = urlsVertical;
      (patch as any).verticalImages = urlsVertical;
    }
  }

  return patch;
}

export default buildUpdatePayload;
