"use client";

import { useMemo, useState } from "react";
import { toYMDFlexible } from "@/lib/dateUtils";
import { useViewImagesHydration } from "./useViewImagesHydration";
import { extractViewMeta } from "../utils/extractViewMeta";
import type { MemoTab, PropertyViewDetails } from "../types";

/* ───────── 헬퍼 ───────── */
const norm = (v?: string | null) => {
  const s = (v ?? "").trim();
  if (!s) return "";
  const low = s.toLowerCase();
  if (low === "null" || low === "undefined" || s === "-") return "";
  return s;
};

type UnitView = {
  rooms: number;
  baths: number;
  hasLoft: boolean;
  hasTerrace: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  note?: string | null;
};

const asNumber = (x: any): number | undefined =>
  typeof x === "number"
    ? x
    : Number.isFinite(Number(x))
    ? Number(x)
    : undefined;

const asBool = (x: any): boolean =>
  x === true || x === "true" || x === 1 || x === "1" || x === "Y" || x === "y";

/** 여러 후보 경로에서 units 추출 */
function pickUnits(raw: any): any[] | undefined {
  if (!raw) return undefined;
  return (
    raw.units ??
    raw.unitList ??
    raw.structureUnits ??
    raw.structure?.units ??
    raw.view?.units ??
    raw.details?.units ??
    undefined
  );
}

/** ✅ 여러 후보 경로에서 photoGroups 추출 (뷰모달용 폴더제목) */
function pickPhotoGroups(raw: any): any[] | undefined {
  if (!raw) return undefined;
  return (
    raw.photoGroups ?? // 백엔드에서 이 이름으로 내려올 가능성 높음
    raw.photo_groups ??
    raw.imageGroups ??
    raw.image_groups ??
    raw.groups ?? // 혹시 공용 groups 필드를 쓰는 경우
    undefined
  );
}

/** unitLines(구버전) -> units(신버전) 변환 폴백 */
function convertLinesToUnits(lines: any[] | undefined): UnitView[] {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => ({
    rooms: asNumber(l?.rooms) ?? 0,
    baths: asNumber(l?.baths) ?? 0,
    hasLoft: asBool(l?.duplex),
    hasTerrace: asBool(l?.terrace),
    minPrice: asNumber(l?.minPrice),
    maxPrice: asNumber(l?.maxPrice),
    note: l?.note ?? null,
  }));
}

/** View 전용 훅 */
export function useViewForm({
  open,
  data,
}: {
  open: boolean;
  data: PropertyViewDetails | null | undefined;
}) {
  const [memoTab, setMemoTab] = useState<MemoTab>("KN");

  const pinId = (data as any)?.pinId ?? (data as any)?.id ?? null;

  // ✅ 가로/세로 완전 분리된 하이드레이션 결과만 사용
  // - cardsHydrated: 가로 카드 전용
  // - filesHydrated: 세로 리스트 전용
  // - legacyImagesHydrated: 레거시 가로 보조(images 기반) — preferCards=false일 때만 사용
  const { preferCards, cardsHydrated, filesHydrated, legacyImagesHydrated } =
    useViewImagesHydration({ open, data: data as any, pinId });

  // 가로 보조(레거시) 이미지는 cards를 대체하지 않음
  const imagesProp = preferCards ? undefined : legacyImagesHydrated;

  const { pinKind, baseAreaTitleView, extraAreaTitlesView } = extractViewMeta(
    (data ?? {}) as any
  );

  const view = useMemo(() => {
    const d = (data ?? {}) as PropertyViewDetails;

    const completionDateText =
      d?.completionDate && String(d.completionDate).trim() !== ""
        ? toYMDFlexible(d.completionDate, { utc: true })
        : undefined;

    const totalParkingSlots =
      (d as any)?.totalParkingSlots ?? (d as any)?.parkingCount ?? undefined;

    const officePhone = norm(
      (d as any)?.officePhone ??
        (d as any)?.contactMainPhone ??
        (d as any)?.contactPhone ??
        ""
    );
    const officePhone2 = norm(
      (d as any)?.officePhone2 ??
        (d as any)?.contactSubPhone ??
        (d as any)?.contactPhone2 ??
        ""
    );

    const minRealMoveInCost =
      d?.minRealMoveInCost === null || d?.minRealMoveInCost === undefined
        ? undefined
        : Number(d.minRealMoveInCost);

    const parkingGradeRaw: any = (d as any)?.parkingGrade;
    const parkingGrade = Number.isFinite(Number(parkingGradeRaw))
      ? Math.max(0, Math.min(5, Math.round(Number(parkingGradeRaw))))
      : undefined;

    // 🔎 units 추출(여러 경로) → 정규화
    const picked = pickUnits(d);
    const normalizedUnits: UnitView[] = Array.isArray(picked)
      ? picked.map((u) => ({
          rooms: asNumber(u?.rooms) ?? 0,
          baths: asNumber(u?.baths) ?? 0,
          hasLoft: asBool(u?.hasLoft ?? u?.duplex),
          hasTerrace: asBool(u?.hasTerrace ?? u?.terrace),
          minPrice:
            u?.minPrice === null || u?.minPrice === undefined
              ? undefined
              : asNumber(u?.minPrice),
          maxPrice:
            u?.maxPrice === null || u?.maxPrice === undefined
              ? undefined
              : asNumber(u?.maxPrice),
          note: u?.note ?? null,
        }))
      : [];

    // 폴백: units가 비었으면 unitLines를 변환해서라도 보여주기
    const units =
      normalizedUnits.length > 0
        ? normalizedUnits
        : convertLinesToUnits((d as any)?.unitLines);

    /* ✅ 카드(폴더) 제목 생성
       - 우선순위: data.photoGroups[].title → 없으면 "사진 폴더 N"
       - cardsHydrated 길이만큼 fallback 생성(안전용)
    */
    const rawGroups = pickPhotoGroups(d);
    let cardTitles: string[] | undefined;

    if (Array.isArray(rawGroups) && rawGroups.length > 0) {
      cardTitles = rawGroups.map((g, idx) => {
        const t = (g?.title ?? "").toString().trim();
        return t || `사진 폴더 ${idx + 1}`;
      });
    } else if (Array.isArray(cardsHydrated) && cardsHydrated.length > 0) {
      // photoGroups가 없으면 최소한 폴더 개수만큼 기본 제목이라도
      cardTitles = cardsHydrated.map((_, idx) => `사진 폴더 ${idx + 1}`);
    }

    return {
      // 헤더/기본
      title: d.title ?? "",
      parkingGrade,
      elevator: d.elevator as "O" | "X" | undefined,
      address: d.address ?? "",
      officePhone,
      officePhone2,

      // 숫자
      totalBuildings: d.totalBuildings,
      totalFloors: d.totalFloors,
      totalHouseholds: d.totalHouseholds,
      remainingHouseholds: d.remainingHouseholds,

      // 주차/등급/등기/준공
      parkingType: (d as any)?.parkingType,
      totalParkingSlots,
      slopeGrade: d.slopeGrade,
      structureGrade: d.structureGrade,
      registry: d.registry,
      completionDateText,

      // ✅ 금액
      minRealMoveInCost,

      // ✅ 리베이트 텍스트
      rebateText: (d as any)?.rebateText ?? "",

      // 구조
      unitLines: Array.isArray((d as any)?.unitLines)
        ? (d as any).unitLines
        : undefined,
      units, // ← 항상 배열(없어도 [])

      // 옵션/메모
      options: Array.isArray(d.options) ? d.options : undefined,
      optionEtc: (d as any)?.optionEtc,
      publicMemo: d.publicMemo,
      secretMemo: d.secretMemo,

      // 면적
      exclusiveArea: (d as any)?.exclusiveArea,
      realArea: (d as any)?.realArea,
      extraExclusiveAreas: (d as any)?.extraExclusiveAreas,
      extraRealAreas: (d as any)?.extraRealAreas,
      baseAreaTitleView,
      extraAreaTitlesView,

      // ✅ 카드(폴더) 제목
      cardTitles,
      // ✅ 향 정보 (수정 모드 주입용)
      aspects: (d as any).orientations ?? (d as any).aspects,
    };
  }, [
    data,
    baseAreaTitleView,
    extraAreaTitlesView,
    preferCards,
    cardsHydrated,
    filesHydrated,
    imagesProp,
  ]);

  const f = useMemo(
    () => ({
      // 헤더
      title: view.title,
      parkingGrade: view.parkingGrade,
      elevator: view.elevator,
      pinKind,

      // 이미지(가로/세로 완전 분리; 레거시는 보조로만)
      preferCards,
      cardsHydrated,
      filesHydrated,
      imagesProp,
      /** ✅ 뷰모달용: 카드(폴더) 제목 배열 */
      cardTitles: view.cardTitles,

      // 기본정보
      address: view.address,
      officePhone: view.officePhone,
      officePhone2: view.officePhone2,

      // 숫자
      totalBuildings: view.totalBuildings,
      totalFloors: view.totalFloors,
      totalHouseholds: view.totalHouseholds,
      remainingHouseholds: view.remainingHouseholds,

      // 주차
      parkingType: view.parkingType,
      totalParkingSlots: view.totalParkingSlots,

      // 준공/등기/등급/최저실입
      completionDateText: view.completionDateText,
      registry: view.registry,
      slopeGrade: view.slopeGrade,
      structureGrade: view.structureGrade,
      minRealMoveInCost: view.minRealMoveInCost,

      // ✅ 리베이트 텍스트
      rebateText: view.rebateText,

      // 구조
      unitLines: view.unitLines,
      units: view.units, // 항상 배열

      // 옵션
      options: view.options,
      optionEtc: view.optionEtc,

      // 메모 + 탭
      publicMemo: view.publicMemo,
      secretMemo: view.secretMemo,
      memoTab,
      setMemoTab,

      // 면적
      exclusiveArea: view.exclusiveArea,
      realArea: view.realArea,
      extraExclusiveAreas: view.extraExclusiveAreas,
      extraRealAreas: view.extraRealAreas,
      baseAreaTitleView: view.baseAreaTitleView,
      extraAreaTitlesView: view.extraAreaTitlesView,
      // 향
      aspects: view.aspects,
    }),
    [
      view,
      pinKind,
      preferCards,
      cardsHydrated,
      filesHydrated,
      imagesProp,
      memoTab,
    ]
  );

  return f;
}
