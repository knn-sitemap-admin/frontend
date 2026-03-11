import type { CreatePinAreaGroupDto } from "@/features/properties/types/area-group-dto";
import type { PinKind } from "@/features/pins/types";
import type { CreatePinOptionsDto } from "@/features/properties/types/property-dto";

export type CreatePinDirectionDto = {
  direction: string;
};

/** 구조별 입력(units) 아이템 */
export type UnitsItemDto = {
  rooms?: number | null;
  baths?: number | null;
  hasLoft?: boolean | null;
  hasTerrace?: boolean | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  note?: string | null;
};

export type CreatePinDto = {
  lat: number | string;
  lng: number | string;
  addressLine: string | null | undefined;
  name?: string | null;
  contactMainLabel?: string | null;
  contactMainPhone?: string | null;
  contactSubLabel?: string | null;
  contactSubPhone?: string | null;

  // 🔹 임시핀과의 명시적 매칭용 (선택)
  pinDraftId?: number | string | null;

  completionDate?: string | null;
  
  /** @deprecated buildingTypes \ubc30\uc5f4\uc744 \uc0ac\uc6a9\ud558\uc138\uc694. \ub808\uac70\uc2dc \ud3f4\ubc31\uc6a9\uc73c\ub85c\ub9cc \uc720\uc9c0. */
  // 레거시 폴백 (일부 오래된 데이터 대비) 경고용
  buildingType?: string | null;

  /** 단지/주택 수 */
  totalHouseholds?: number | string | null;
  /** ✅ 총 개동(동 수) */
  totalBuildings?: number | string | null;
  /** ✅ 총 층수 */
  totalFloors?: number | string | null;
  /** ✅ 잔여 세대 */
  remainingHouseholds?: number | string | null;

  /** ✅ 총 주차대수 (0 허용) */
  totalParkingSlots?: number | string | null;

  registrationTypeId?: number | string | null;

  /** 주차유형 문자열 (백엔드 DTO에도 존재) */
  parkingType?: string | null;

  /** 주차유형 배열 (다중 선택) — parkingTypes: ["직렬", "기계식"] */
  parkingTypes?: string[];

  /** 건물유형 배열 (다중 선택) — buildingTypes: ["APT", "OP"] */
  buildingTypes?: string[];

  /** ✅ 서버 전달 시 "1"~"5" 문자열 또는 null 권장 (입력은 number|string|null 수용) */
  parkingGrade?: number | string | null;

  slopeGrade?: string | null;
  structureGrade?: string | null;

  /** 서버 배지(내부 pinKind → mapPinKindToBadge로 변환 가능) */
  badge?: string | null;

  publicMemo?: string | null;
  privateMemo?: string | null;

  // ✅ 신축/구옥 (camelCase만 사용)
  isOld?: boolean;
  isNew?: boolean;

  hasElevator?: boolean;

  /** ✅ 옵션 세트 */
  options?: CreatePinOptionsDto;

  /** ✅ 방향 목록 (문자/객체 모두 허용) */
  directions?: Array<CreatePinDirectionDto | string>;

  /** ✅ 면적 그룹 */
  areaGroups?: CreatePinAreaGroupDto[] | null;

  /** ✅ 구조별 입력 (배열) */
  units?: UnitsItemDto[] | null;

  /** ✅ 최저 실입(정수 금액, 서버: number|null) */
  minRealMoveInCost?: number | string | null;

  /** ✅ 리베이트 텍스트(최대 50자) */
  rebateText?: string | null;

  pinKind?: PinKind | null;
  isCompleted?: boolean;
};

export type UpdatePinDto = Partial<CreatePinDto> & {
  /** options: 객체면 upsert, null이면 제거 */
  options?: CreatePinOptionsDto | null;

  /** 전달되면 전체 교체 (빈 배열도 허용), null이면 전부 삭제로 취급 */
  directions?: Array<CreatePinDirectionDto | string> | null;

  /** 전달되면 전체 교체 (빈 배열도 허용), null이면 전부 삭제로 취급 */
  areaGroups?: CreatePinAreaGroupDto[] | null;

  /** 전달되면 전체 교체 (빈 배열도 허용), null이면 전부 삭제로 취급 */
  units?: UnitsItemDto[] | null;
};

export type CreatePinDraftDto = {
  lat: number | string;
  lng: number | string;
  addressLine: string | null | undefined;
  name?: string | null;

  /** 분양사무실 대표번호 */
  contactMainPhone?: string | null;
  /** 분양사무실 추가번호(선택) — UI "추가번호 (선택)" ↔ contactSubPhone */
  contactSubPhone?: string | null;
};

export type PinDraftDetail = {
  id: number;
  lat: number;
  lng: number;
  addressLine: string | null;
  name?: string | null;
  contactMainPhone?: string | null;
  contactSubPhone?: string | null;
};

export type DeletePinRes = {
  id: string;
};
