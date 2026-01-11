import { CreatePinAreaGroupDto } from "./area-group-dto";
import { ImageItem } from "./media";
import { Registry, UnitLine, Grade } from "./property-domain";

/* ------------------------------------------------------------------ */
/* Common helpers                                                      */
/* ------------------------------------------------------------------ */
export type IdLike = string | number;
export type Nullable<T> = T | null;

/* ------------------------------------------------------------------ */
/* 별점/등급: ""(미선택) | "1"~"5"                                     */
/* ------------------------------------------------------------------ */
export type StarStr = "" | "1" | "2" | "3" | "4" | "5";

/* ------------------------------------------------------------------ */
/* Units (구조별 입력) DTO (서버 전송용 shape)                         */
/* ------------------------------------------------------------------ */
export type UnitsDto = {
  /** 방 개수 (정수, 0 이상, 미입력 시 null) */
  rooms?: number | null;
  /** 욕실 개수 (정수, 0 이상, 미입력 시 null) */
  baths?: number | null;
  /** 다락 유무 */
  hasLoft?: boolean | null;
  /** 테라스 유무 */
  hasTerrace?: boolean | null;
  /** 최소 가격 (정수, 0 이상, 미입력 시 null) */
  minPrice?: number | null;
  /** 최대 가격 (정수, 0 이상, 미입력 시 null) */
  maxPrice?: number | null;
};

/* ------------------------------------------------------------------ */
/* Options DTO (옵션 세트: 서버 전송용 shape)                         */
/* ------------------------------------------------------------------ */

export type KitchenLayout = "G" | "D" | "LINE";
export type FridgeSlot = "1" | "2" | "3";
export type SofaSize = "SEAT_2" | "SEAT_3" | "SEAT_4";
export type LivingRoomView = "OPEN" | "NORMAL" | "BLOCKED";

export type CreatePinOptionsDto = {
  hasAircon?: boolean;
  hasFridge?: boolean;
  hasWasher?: boolean;
  hasDryer?: boolean;
  hasBidet?: boolean;
  hasAirPurifier?: boolean;
  isDirectLease?: boolean;
  extraOptionsText?: string | null;

  // Nullable Enum 필드
  kitchenLayout?: KitchenLayout | null;
  fridgeSlot?: FridgeSlot | null;
  sofaSize?: SofaSize | null;
  livingRoomView?: LivingRoomView | null;

  // Boolean 필드
  hasIslandTable?: boolean;
  hasKitchenWindow?: boolean;
  hasCityGas?: boolean;
  hasInduction?: boolean;
};

/* ------------------------------------------------------------------ */
/* Create DTO (클라이언트 → 서버)                                      */
/* ------------------------------------------------------------------ */
export type CreatePayload = {
  title: string;
  address?: string;

  officeName?: string;
  officePhone?: string;
  officePhone2?: string;

  moveIn?: string;
  floor?: string;
  roomNo?: string;
  structure?: string;

  // ✅ 빌딩/등록 타입 (id는 number 권장)
  buildingType?: string;
  registrationTypeId?: number | null;

  // 향
  aspect?: string;
  aspectNo?: string;
  aspect1?: string;
  aspect2?: string;
  aspect3?: string;
  /** ✅ 백엔드 스펙: [{ direction: "남향" }, ...] */
  directions?: Array<{ direction: string }>;

  // 가격/평점/주차
  /** ✅ 서버 PATCH 키와 일치: 최저 실입비(정수/null) */
  minRealMoveInCost?: number | null;
  listingStars?: number | null;

  /**
   * ✅ 리베이트 텍스트 (만원 단위, 자유 입력)
   * 예: "500", "500~1000", "협의" 등
   */
  rebateText?: string | null;

  /** @deprecated 금액 필드 (서버 이전 버전 호환용) */
  rebate?: number | null;

  parkingType?: string;
  /** ✅ 총 주차 대수 (int, 없으면 null) */
  totalParkingSlots?: number | null;

  // 설비/등급/날짜
  elevator?: "O" | "X";
  /** ✅ 별점 1~5 문자열, 미선택은 "" (전송 시 제거됨) */
  parkingGrade?: StarStr;
  /** ✅ 경사 등급: "상" | "중" | "하" (또는 null) */
  slopeGrade?: Grade | null;
  /** ✅ 구조 등급: "상" | "중" | "하" (또는 null) */
  structureGrade?: Grade | null;
  completionDate?: string;

  // ✅ 신축/구옥(폼 tri-state 고려)
  isNew?: boolean | null;
  isOld?: boolean | null;

  // 단지 숫자 (유연성 위해 number | string 허용; 서버단에서 정규화)
  totalBuildings?: number | string;
  totalFloors?: number | string;
  totalHouseholds?: number | string;
  remainingHouseholds?: number | string;

  // 연락처
  contactMainLabel?: string;
  contactMainPhone?: string;
  contactSubLabel?: string;
  contactSubPhone?: string;

  // 옵션/메모/등기/구조
  options: CreatePinOptionsDto;
  extraOptionsText?: string | null;
  publicMemo?: string | null;
  secretMemo?: string | null;
  /** @deprecated use secretMemo */
  privateMemo?: string | null;

  registry?: Registry;

  /** ✅ UI 보존용 (폼의 원본 라인) */
  unitLines?: UnitLine[];

  /** ✅ 구조별 입력(units) — 서버 전송용: 항상 배열(빈 배열 허용) */
  units?: UnitsDto[];

  // 이미지
  images?: string[];
  imageCards?: ImageItem[][];
  fileItems?: ImageItem[];

  // 면적(레거시 문자열)
  exclusiveArea?: string;
  realArea?: string;
  extraExclusiveAreas?: string[];
  extraRealAreas?: string[];

  /** ✅ 신규 스펙: 면적 그룹 */
  areaGroups?: CreatePinAreaGroupDto[];

  /** ✅ 임시핀 매칭/좌표(선택) */
  pinDraftId?: number | string | null;
  lat?: number;
  lng?: number;
};

/* ------------------------------------------------------------------ */
/* Update DTO (클라이언트 → 서버, 부분 업데이트)                       */
/* ------------------------------------------------------------------ */
export type UpdatePayload = {
  title?: string;
  address?: string;
  officeName?: string;
  officePhone?: string;
  officePhone2?: string;
  moveIn?: string;
  floor?: string;
  roomNo?: string;
  structure?: string;

  // ✅ 빌딩/등록 타입
  buildingType?: string;
  registrationTypeId?: number | null;

  // 향
  aspect?: string;
  aspectNo?: string;
  aspect1?: string;
  aspect2?: string;
  aspect3?: string;
  /** ✅ 업데이트도 동일 형태 허용 */
  directions?: Array<{ direction: string }>;

  // 가격/평점/주차
  /** 로컬 뷰 패치용으로 남길 수 있음(서버 전송은 보통 minRealMoveInCost 사용) */
  salePrice?: string | number | null;
  /** ✅ 서버 PATCH 키와 일치 */
  minRealMoveInCost?: number | null;
  listingStars?: number | null;

  /**
   * ✅ 리베이트 텍스트 (만원 단위, 자유 입력)
   * 예: "500", "500~1000", "협의" 등
   */
  rebateText?: string | null;

  /** @deprecated 금액 필드 (서버 이전 버전 호환용) */
  rebate?: number | null;

  parkingType?: string;
  /** ✅ 총 주차 대수 (int, 없으면 null) */
  totalParkingSlots?: number | null;

  // 설비/등급/날짜
  elevator?: "O" | "X";
  /** ✅ 별점 1~5 문자열, 미선택은 "" (전송 시 제거됨) */
  parkingGrade?: StarStr;
  /** ✅ 경사 등급: "상" | "중" | "하" (또는 null) */
  slopeGrade?: Grade | null;
  /** ✅ 구조 등급: "상" | "중" | "하" (또는 null) */
  structureGrade?: Grade | null;
  completionDate?: string;

  // ✅ 신축/구옥(부분 업데이트 허용)
  isNew?: boolean | null;
  isOld?: boolean | null;

  // 단지 숫자
  totalBuildings?: number | string;
  totalFloors?: number | string;
  totalHouseholds?: number | string;
  remainingHouseholds?: number | string;

  // 옵션/메모/등기/구조
  options?: CreatePinOptionsDto | null;
  extraOptionsText?: string | null;

  publicMemo?: string | null;
  secretMemo?: string | null;
  registry?: Registry;

  /** ✅ UI 보존용 (폼의 원본 라인) */
  unitLines?: UnitLine[];

  /** ✅ 구조별 입력(units) — 서버 전송용: 항상 배열(빈 배열 허용) */
  units?: UnitsDto[];

  // 이미지
  images?: string[];

  // 면적(레거시 문자열)
  exclusiveArea?: string;
  realArea?: string;
  extraExclusiveAreas?: string[];
  extraRealAreas?: string[];

  /** ✅ 신규 스펙: 면적 그룹 */
  areaGroups?: CreatePinAreaGroupDto[];

  /** ✅ 임시핀/좌표도 선택 허용(패치성 업데이트 대비) */
  pinDraftId?: number | string | null;
  lat?: number;
  lng?: number;

  hasElevator?: boolean | null;
};
