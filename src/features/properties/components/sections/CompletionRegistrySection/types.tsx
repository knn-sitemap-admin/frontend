"use client";

import type {
  Grade,
  BuildingType,
} from "@/features/properties/types/property-domain";

export type CompletionRegistrySectionProps = {
  /** 준공일: YYYY-MM 또는 YYYY-MM-DD (빈 문자열/undefined/null 모두 허용) */
  completionDate?: string | null;
  setCompletionDate: (v: string) => void;

  /** 레거시: 최저실입(만원) - 문자열/숫자/빈값 허용 */
  salePrice?: string | number | null;
  setSalePrice?: (v: string) => void;

  /** 신규: 최저 실입 정수 금액(만원) - 있으면 섹션에서 이 값이 우선 사용 */
  minRealMoveInCost?: number | string | null;
  setMinRealMoveInCost?: (v: number | string | null) => void;

  /** 경사도/구조 등급 */
  slopeGrade?: Grade;
  setSlopeGrade?: (v?: Grade) => void;
  structureGrade?: Grade;
  setStructureGrade?: (v?: Grade) => void;

  /** 건물유형(백엔드 enum) 단일 선택 레거시 */
  buildingType?: BuildingType | null;
  setBuildingType?: (v: BuildingType | null) => void;

  /** 건물유형 다중 선택 — buildingTypes: ["APT", "OP"] */
  buildingTypes?: string[];
  setBuildingTypes?: (v: string[]) => void;
};
