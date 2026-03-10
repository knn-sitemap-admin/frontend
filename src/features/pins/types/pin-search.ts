import { BuildingType } from "@/features/properties/types/property-domain";
import { PinDetail } from "../pin";

export type PinSearchParams = {
  rooms?: number[];
  hasLoft?: boolean;
  hasTerrace?: boolean;

  /** ✅ 타운하우스 여부 */
  hasTownhouse?: boolean;

  hasElevator?: boolean;

  /** ✅ 매매가 범위 (원 단위) */
  salePriceMin?: number;
  salePriceMax?: number;

  /** ✅ 면적 범위 (㎡ 단위) */
  areaMinM2?: number;
  areaMaxM2?: number;

  /** ✅ 등기 유형 (여러 개 선택 가능) */
  buildingTypes?: BuildingType[];

  /** ✅ 최저 실입주금(원 단위) */
  minRealMoveInCostMax?: number;

  /** ✅ 매물핀네임 검색어 */
  q?: string;
};

/** 필터 없이 요청할 때만 함께 반환되는 draft */
export type PinDraftLite = {
  id: string;
  lat: number;
  lng: number;
  addressLine: string;
  draftState: "BEFORE" | "SCHEDULED";

  title?: string | null;
  name?: string | null;
  badge?: string | null;
};

export type PinSearchResult = {
  pins: PinDetail[];
  drafts?: PinDraftLite[];
};
