"use client";

import CompletionRegistrySection from "@/features/properties/components/sections/CompletionRegistrySection/CompletionRegistrySection";
import type { CompletionRegistryFormSlice } from "@/features/properties/edit/types/editForm.slices";

/** YYYY-MM-DD 로 잘라서 반환(없으면 빈 문자열) */
const toYmd = (s?: string | null) =>
  typeof s === "string" && s.trim().length >= 10 ? s.slice(0, 10) : "";

/** 세터 안전 래퍼: date input이 요구하는 10자 이내만 반영 */
const clampYmdSetter = (set: (v: string) => void) => (v: string) => {
  set((v ?? "").slice(0, 10));
};

/** 어떤 값이 와도 문자열로 표준화 (입력 중 숫자/빈값 대응) */
const toStr = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : String(v);

export default function CompletionRegistryContainer({
  form,
}: {
  form: CompletionRegistryFormSlice; // ✅ 슬라이스 타입
}) {
  const completionDate = toYmd(form.completionDate);
  const setCompletionDate = clampYmdSetter(form.setCompletionDate);
  const salePrice = toStr(form.salePrice);
  const rebateText = toStr(form.rebateText);

  return (
    <CompletionRegistrySection
      /* 준공일 */
      completionDate={completionDate}
      setCompletionDate={setCompletionDate}
      /* 최저실입 (레거시 + 신규) */
      salePrice={salePrice}
      setSalePrice={form.setSalePrice}
      minRealMoveInCost={form.minRealMoveInCost}
      setMinRealMoveInCost={form.setMinRealMoveInCost}
      /* ✅ 리베이트 */
      rebateText={rebateText}
      setRebateText={form.setRebateText}
      /* 등급(경사/구조) */
      slopeGrade={form.slopeGrade}
      setSlopeGrade={form.setSlopeGrade}
      structureGrade={form.structureGrade}
      setStructureGrade={form.setStructureGrade}
      /* 건물유형(enum) */
      buildingType={form.buildingType}
      setBuildingType={form.setBuildingType}
      buildingTypes={form.buildingTypes}
      setBuildingTypes={form.setBuildingTypes}
      /* ✅ 엘리베이터 */
      elevator={form.elevator}
      setElevator={form.setElevator}
    />
  );
}
