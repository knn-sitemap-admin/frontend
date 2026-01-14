import {
  BuildingType,
  Grade,
  UnitLine,
  OrientationRow, // ✅ buildOrientation 반환에 필요
} from "../../types/property-domain";
import type { AreaSet } from "../../components/sections/AreaSetsSection/types";
import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "../../types/property-dto";

/* ───────── 슬라이스 타입들 ───────── */
export type AreaSetsFormSlice = {
  /** 기본 면적 범위 */
  baseAreaSet: AreaSet;
  setBaseAreaSet: (v: AreaSet) => void;

  /** 추가 면적 그룹들 */
  extraAreaSets: AreaSet[];
  setExtraAreaSets: (v: AreaSet[]) => void;

  /**
   * 레거시·서버 호환을 위해 단일값/타이틀을 패키징해서 반환
   * (PropertyEditModalBody.save 에서 사용)
   */
  packAreas: () => {
    exclusiveArea?: string | null;
    realArea?: string | null;
    extraExclusiveAreas?: string[];
    extraRealAreas?: string[];
    baseAreaTitleOut?: string | null;
    extraAreaTitlesOut?: string[];
  };
};

export type AspectsFormSlice = {
  /** UI 내부 상태(필요 시) */
  aspects: any[];
  addAspect: (payload?: any) => void;
  removeAspect: (index: number) => void;
  setAspectDir: (index: number, dir: any) => void;

  /**
   * 서버 패치와 로컬 뷰 갱신 모두에서 쓰는 빌더
   * (PropertyEditModalBody.save 에서 호출)
   */
  buildOrientation: () => {
    orientations?: OrientationRow[];
    aspect?: string;
    aspectNo?: string | number | null;
    aspect1?: string;
    aspect2?: string;
    aspect3?: string;
  };
};

export type BasicInfoFormSlice = {
  address: string;
  setAddress: (v: string) => void;

  officePhone: string;
  setOfficePhone: (v: string) => void;

  officePhone2?: string;
  setOfficePhone2: (v: string) => void;
};

/** ✅ registryOne 제거, buildingType + 신축/구옥 + 엘리베이터로 단순화 */
export type CompletionRegistryFormSlice = {
  completionDate: string;
  setCompletionDate: (v: string) => void;

  /** 레거시 최저실입(예전 필드) – 그대로 유지 (원본 서버 salePrice 호환) */
  salePrice: string | number | null;
  setSalePrice: (v: string | number | null) => void;

  /** ✅ 신규: 최저 실입(정수, 만원 단위) - 내부 연산/스냅샷용 */
  minRealMoveInCost: number | string | null;
  setMinRealMoveInCost: (v: number | string | null) => void;

  /** 리베이트 텍스트 */
  rebateText: string | null;
  setRebateText: (v: string | null) => void;

  /** 경사 등급 */
  slopeGrade?: Grade;
  setSlopeGrade: (v?: Grade) => void;

  /** 구조 등급 */
  structureGrade?: Grade;
  setStructureGrade: (v?: Grade) => void;

  /** ✅ 신축/구옥 UI ("new" | "old" | "") */
  buildingGrade: "" | "new" | "old";
  setBuildingGrade: (v: "" | "new" | "old") => void;

  /** 서버 enum (건물유형) */
  buildingType: BuildingType | null;
  setBuildingType: (v: BuildingType | null) => void;

  /** ✅ 엘리베이터 O/X ("O" | "X" | null 정도로 사용) */
  elevator: "O" | "X" | null;
  setElevator: (v: "O" | "X" | null) => void;
};

/** ✅ 주차 전용 슬라이스 (주차타입/별점/대수) */
export type ParkingFormSlice = {
  /** 주차 평점 ("1"~"5" | "" ) */
  parkingGrade: "" | "1" | "2" | "3" | "4" | "5";
  setParkingGrade: (v: "" | "1" | "2" | "3" | "4" | "5") => void;

  /** 주차 유형(자유 입력 문자열, 빈 값일 때 null 처리) */
  parkingType: string | null;
  setParkingType: (v: string | null) => void;

  /** 전체 주차 대수 (문자열 입력, 저장 시 숫자로 파싱) */
  totalParkingSlots: string;
  setTotalParkingSlots: (v: string) => void;
};

export type MemoFormSlice = {
  publicMemo: string;
  setPublicMemo: (v: string) => void;

  secretMemo: string;
  setSecretMemo: (v: string) => void;
};

export type NumbersFormSlice = {
  totalBuildings: string;
  setTotalBuildings: (v: string) => void;

  totalFloors: string;
  setTotalFloors: (v: string) => void;

  totalHouseholds: string;
  setTotalHouseholds: (v: string) => void;

  remainingHouseholds: string;
  setRemainingHouseholds: (v: string) => void;
};

export type OptionsFormSlice = {
  options: string[];
  setOptions: (v: string[]) => void;

  /** ✅ "직접입력" 체크 여부 (extraOptionsText 제어용) */
  etcChecked: boolean;
  setEtcChecked: (v: boolean) => void;

  /** ✅ 옵션 직접입력 텍스트 (콤마 구분) */
  optionEtc: string;
  setOptionEtc: (v: string) => void;

  /** ✅ Nullable Enum 4개 (별도 관리) */
  kitchenLayout: KitchenLayout | null;
  setKitchenLayout: (v: KitchenLayout | null) => void;

  fridgeSlot: FridgeSlot | null;
  setFridgeSlot: (v: FridgeSlot | null) => void;

  sofaSize: SofaSize | null;
  setSofaSize: (v: SofaSize | null) => void;

  livingRoomView: LivingRoomView | null;
  setLivingRoomView: (v: LivingRoomView | null) => void;
};

export type StructureLinesFormSlice = {
  unitLines: UnitLine[];

  /** 프리셋에서 한 줄 추가 (섹션이 넘겨주는 key/id 형태에 맞추세요) */
  addLineFromPreset: (presetKey: string) => void;

  /** 빈 줄 추가 */
  addEmptyLine: () => void;

  /** 특정 라인 업데이트 (index는 섹션에서 전달받는 기준에 맞추세요) */
  updateLine: (index: number, patch: Partial<UnitLine>) => void;

  /** 특정 라인 제거 */
  removeLine: (index: number) => void;
};

/* ───────── 통합 API ───────── */
export type EditFormAPI = AreaSetsFormSlice &
  AspectsFormSlice &
  BasicInfoFormSlice &
  CompletionRegistryFormSlice &
  ParkingFormSlice &
  MemoFormSlice &
  NumbersFormSlice &
  OptionsFormSlice &
  StructureLinesFormSlice;
