"use client";

import CompletionRegistrySection from "@/features/properties/components/sections/CompletionRegistrySection/CompletionRegistrySection";
import type {
  BuildingType,
  Grade,
} from "@/features/properties/types/property-domain";
import type { Dispatch, SetStateAction } from "react";

/** ✅ 섹션 전용 폼 슬라이스 — 고유 이름 사용 */
export type CRContainerForm = {
  completionDate?: string | null;
  setCompletionDate: (v: string) => void;

  // 레거시(표시는 계속)
  salePrice?: string | number | null;
  setSalePrice: (v: string) => void;

  slopeGrade?: Grade;
  setSlopeGrade: (v?: Grade) => void;

  structureGrade?: Grade;
  setStructureGrade: (v?: Grade) => void;

  /** 등기(서버 enum): 단일 선택 레거시 */
  buildingType?: BuildingType | null;
  setBuildingType?: (v: BuildingType | null) => void;
  /** 등기 다중 선택 — buildingTypes: ["APT", "OP"] */
  buildingTypes?: string[];
  setBuildingTypes?: (v: string[]) => void;

  /** ✅ 신규: 최저 실입(정수, 만원 단위) */
  minRealMoveInCost?: number | string | null;
  setMinRealMoveInCost?: (v: number | string | null) => void;

  /** ✅ 엘리베이터 O/X/null (초기 미선택 허용) */
  elevator: "O" | "X" | null;
  setElevator: Dispatch<SetStateAction<"O" | "X" | null>>;
};

/** YYYY-MM-DD 로 잘라서 반환(없으면 빈 문자열) */
const toYmd = (s?: string | null) =>
  typeof s === "string" && s.trim().length >= 10 ? s.slice(0, 10) : "";

/** 어떤 값이 와도 문자열로 표준화 (입력 중 숫자/빈값 대응) */
const toStr = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : String(v);

/** 세터 안전 래퍼: date input이 요구하는 10자 이내만 반영 */
const clampYmdSetter = (set: (v: string) => void) => (v: string) => {
  const next = (v ?? "").slice(0, 10); // '' 또는 'YYYY-MM-DD'
  set(next);
};

export default function CompletionRegistryContainer({
  form,
  isVisitPlanPin,
}: {
  form: CRContainerForm;
  /** 답사예정 핀 여부 */
  isVisitPlanPin?: boolean;
}) {
  const buildingTypes = (form as any).buildingTypes ?? [];
  const setBuildingTypes = (form as any).setBuildingTypes;
  const buildingType = (form as any).buildingType ?? null;
  const setBuildingType = ((form as any).setBuildingType ?? (() => {})) as (
    v: BuildingType | null
  ) => void;

  const minRealMoveInCost = (form as any).minRealMoveInCost ?? null;
  const setMinRealMoveInCost = ((form as any).setMinRealMoveInCost ??
    (() => {})) as (v: number | string | null) => void;

  // ✅ 엘리베이터는 타입을 정확히 맞춰서 그대로 사용
  const elevator = form.elevator;
  const setElevator = form.setElevator;

  // 표기/입력용 값 정규화
  const normalizedCompletionDate = toYmd(form.completionDate);
  const normalizedSalePrice = toStr(form.salePrice);

  // ✅ date 세터 래핑: 10자 이내만 반영
  const setCompletionDateSafe = clampYmdSetter(form.setCompletionDate);

  return (
    <CompletionRegistrySection
      // 준공일
      completionDate={normalizedCompletionDate}
      setCompletionDate={setCompletionDateSafe}
      // 가격 (레거시)
      salePrice={normalizedSalePrice}
      setSalePrice={form.setSalePrice}
      // ✅ 최저 실입(신규)
      minRealMoveInCost={minRealMoveInCost}
      setMinRealMoveInCost={setMinRealMoveInCost}
      // 등급
      slopeGrade={form.slopeGrade}
      setSlopeGrade={form.setSlopeGrade}
      structureGrade={form.structureGrade}
      setStructureGrade={form.setStructureGrade}
      // 건물유형 (다중 선택)
      buildingTypes={buildingTypes}
      setBuildingTypes={setBuildingTypes}
      buildingType={buildingType}
      setBuildingType={setBuildingType}
      // ✅ 엘리베이터
      elevator={elevator}
      setElevator={setElevator}
      // ✅ 답사예정 모드 여부 (로컬 state 초기화용)
      isVisitPlanPin={isVisitPlanPin}
    />
  );
}
