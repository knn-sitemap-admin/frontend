"use client";

import { useCallback, useMemo } from "react";

import type { CompletionRegistryFormSlice } from "@/features/properties/edit/types/editForm.slices";
import type {
  Grade,
  BuildingType,
} from "@/features/properties/types/property-domain";

type UseCompletionRegistryFormArgs = {
  form: any; // useEditForm 리턴값
};

export function useCompletionRegistryForm({
  form,
}: UseCompletionRegistryFormArgs): CompletionRegistryFormSlice {
  const setCompletionDate = useCallback(
    (v: string) => {
      form?.setCompletionDate?.(v);
    },
    [form]
  );

  const setMinRealMoveInCost = useCallback(
    (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      // 내부에서는 salePrice 한 필드로 관리
      form?.setSalePrice?.(s);
    },
    [form]
  );

  const setSalePrice = useCallback(
    (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      form?.setSalePrice?.(s);
    },
    [form]
  );

  const setElevator = useCallback(
    (v: any) => {
      form?.setElevator?.(v);
    },
    [form]
  );

  const setSlopeGrade = useCallback(
    (v?: Grade) => {
      form?.setSlopeGrade?.(() => v);
    },
    [form]
  );

  const setStructureGrade = useCallback(
    (v?: Grade) => {
      form?.setStructureGrade?.(() => v);
    },
    [form]
  );

  /** ✅ UI에서 전달되는 enum 그대로 사용 (추가 정규화 X) */
  const setBuildingType = useCallback(
    (v: BuildingType | null) => {
      form?.setBuildingType?.(v);
    },
    [form]
  );

  const setBuildingTypes = useCallback(
    (v: string[]) => {
      form?.setBuildingTypes?.(v);
    },
    [form]
  );

  const setRebateText = useCallback(
    (v: string | null) => {
      const s = v ?? "";
      form?.setRebateText?.(s);
    },
    [form]
  );

  /** 🆕 건물 연식 그레이드 */
  const setBuildingGrade = useCallback(
    (v: CompletionRegistryFormSlice["buildingGrade"]) => {
      form?.setBuildingGrade?.(v);
    },
    [form]
  );

  const completionRegistryForm = useMemo<CompletionRegistryFormSlice>(
    () => ({
      // ─── 준공일 ───
      completionDate: form?.completionDate ?? "",
      setCompletionDate,

      // ✅ 최저 실입 (타입에서는 minRealMoveInCost 라고 부르지만 내부는 salePrice 재사용)
      minRealMoveInCost: form?.salePrice,
      setMinRealMoveInCost,

      // (기존 필드도 유지)
      salePrice: form?.salePrice,
      setSalePrice,

      // ✅ 엘리베이터
      elevator: form?.elevator,
      setElevator,

      // 경사도
      slopeGrade: form?.slopeGrade,
      setSlopeGrade,

      // 구조 등급
      structureGrade: form?.structureGrade,
      setStructureGrade,

      // ✅ 등기/건물 타입
      buildingType: (form?.buildingType ?? null) as BuildingType | null,
      setBuildingType,
      buildingTypes: Array.isArray(form?.buildingTypes)
        ? form.buildingTypes
        : [],
      setBuildingTypes,

      // ⭐ 리베이트 텍스트
      rebateText: form?.rebateText ?? "",
      setRebateText,

      // 🆕 건물 연식 그레이드
      buildingGrade: form?.buildingGrade ?? null,
      setBuildingGrade,
    }),
    [
      form?.completionDate,
      form?.salePrice,
      form?.elevator,
      form?.slopeGrade,
      form?.structureGrade,
      form?.buildingType,
      form?.buildingTypes,
      form?.rebateText,
      form?.buildingGrade,
      setCompletionDate,
      setMinRealMoveInCost,
      setSalePrice,
      setElevator,
      setSlopeGrade,
      setStructureGrade,
      setBuildingType,
      setBuildingTypes,
      setRebateText,
      setBuildingGrade,
    ]
  );

  return completionRegistryForm;
}
