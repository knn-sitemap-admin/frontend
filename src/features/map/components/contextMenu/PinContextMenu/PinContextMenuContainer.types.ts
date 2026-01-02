import { LatLng } from "@/lib/geo/types";
import type { PinItem } from "@/features/pins/types";
import { MergedMarker } from "@/features/map/pages/hooks/useMergedMarkers";

/** 컨텍스트 메뉴가 붙을 수 있는 대상(마커, LatLng 객체, 리터럴 좌표) */
export type PinTarget = kakao.maps.Marker | kakao.maps.LatLng | LatLng;

/** 컨텍스트 메뉴에서 '답사예약지 등록(onPlan)'으로 전달할 페이로드 */
export type PlanRequestPayload = {
  lat: number;
  lng: number;
  /**
   * 대표 주소 (우선순위: 도로명 > 지번 > 매물명 > "lat,lng")
   * - 저장은 address/date 분리 권장, 표시 시 결합 추천: "주소 · YYYY-MM-DD(요일)"
   */
  address: string;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  /** 매물 식별 정보(옵션) */
  propertyId?: "__draft__" | string | null;
  propertyTitle?: string | null;
  dateISO?: string;
};

/** 컨텍스트 메뉴에서 '답사지예약(onReserve)'으로 전달할 페이로드 */
export type ReserveRequestPayload =
  | ({
      /** 기존 예정 핀(서버/로컬)의 식별자 */
      visitId: string | number;
      dateISO?: string;
    } & { kind: "visit" })
  | ({
      /** 좌표로 바로 예약 리스트에 추가 */
      lat: number;
      lng: number;
      title?: string | null;
      roadAddress?: string | null;
      jibunAddress?: string | null;
      dateISO?: string;
    } & { kind: "coords" });

// 어떤 모드로 생성모달을 열었는지 구분용
export type CreateMode =
  | "PLAN_FROM_DRAFT" // 신규핀 → 답사예정지 등록
  | "FULL_PROPERTY_FROM_RESERVED" // 답사지 예약핀 → 매물 정보 입력
  | "NORMAL"; // 그 외 일반 케이스

/** 신규 등록(onCreate) 시 컨텍스트 메뉴에서 폼으로 전달할 페이로드 */
export type CreateFromPinArgs = {
  /** 클릭 지점(또는 선택 핀)의 좌표 */
  latFromPin: number;
  lngFromPin: number;
  /** 드래프트에서 유도된 경우 사용 */
  fromPinDraftId?: number;
  /** 초기 주소 힌트(도로명/지번 중 하나) */
  address?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  pinDraftId?: number;

  nameFromDraft?: string | null;
  contactMainPhoneFromDraft?: string | null;

  /** 어떤 버튼에서 열린 생성 모달인지 */
  createMode?: CreateMode;
  visitPlanOnly?: boolean;
};

/** PinContextMenu 컴포넌트 props */
export type PinContextMenuProps = {
  /** Kakao SDK 객체 (맵 준비 전까지 null) */
  kakao: typeof window.kakao | null;
  /** 지도 인스턴스 (맵 준비 전까지 null) */
  map: kakao.maps.Map | null;

  /** 컨텍스트 메뉴가 뜰 기준 위치/대상 */
  position: PinTarget;

  /** 도로명 주소 / 지번 주소 (옵션) */
  roadAddress?: string | null;
  jibunAddress?: string | null;

  /**
   * "__draft__" 이면 신규 등록 가능한 빈 위치,
   * 그 외에는 실제 매물 ID
   */
  propertyId?: "__draft__" | string | null;

  /** 매물명(선택) — 있으면 헤더에 표시 */
  propertyTitle?: string | null;

  /** 업그레이드: 최소 타입 → PinItem */
  pin?: PinItem;

  /** 즐겨찾기 */
  onAddFav: () => void;

  /** 닫기 / 상세 보기 / 신규 등록 동작 */
  onClose: () => void;
  onView: (id: string) => void;

  /** 신규 등록: 좌표/드래프트/주소 힌트를 함께 전달 */
  onCreate?: (args: CreateFromPinArgs) => void;

  /**
   * '답사예약지 등록' 액션
   * - 좌표만이 아니라 주소/메타까지 함께 전달
   */
  onPlan?: (payload: PlanRequestPayload) => void | Promise<void>;

  /**
   * '답사지예약' 액션 (사이드바 예약 목록에 추가)
   * - (visit | coords) 중 하나로 명확히 구분됨
   */
  onReserve?: (payload?: ReserveRequestPayload) => void | Promise<void>;

  /** 오버레이 z-index (기본 10000) */
  zIndex?: number;

  /** ⬇⬇⬇ 상태 플래그 (예약 > 예정 우선순위 판단용) */
  isVisitReservedPin?: boolean; // 답사지예약(추가 완료)인지
  isPlanPin?: boolean; // 답사예정(추가 전)인지 (예약이면 자동 무시)

  /** 합쳐진 마커 메타(근처 판정/override용) */
  mergedMeta?: MergedMarker[];
};

/** 커스텀 오버레이 위치 계산 결과 */
export type OverlayPoint = { left: number; top: number } | null;

/* ---------- 타입 가드 유틸(컨테이너/훅에서 재사용) ---------- */

export const isKakaoLatLng = (v: unknown): v is kakao.maps.LatLng =>
  !!v &&
  typeof (v as any).getLat === "function" &&
  typeof (v as any).getLng === "function";

export const isKakaoMarker = (v: unknown): v is kakao.maps.Marker =>
  !!v && typeof (v as any).getPosition === "function";

export const isPlainLatLng = (v: unknown): v is LatLng =>
  !!v &&
  typeof (v as any).lat === "number" &&
  typeof (v as any).lng === "number";

export const isDraftId = (id: unknown): id is "__draft__" => id === "__draft__";

export const isVisitReserveById = (
  p: ReserveRequestPayload | undefined
): p is Extract<ReserveRequestPayload, { kind: "visit" }> =>
  !!p && (p as any).kind === "visit";

export const isVisitReserveByCoords = (
  p: ReserveRequestPayload | undefined
): p is Extract<ReserveRequestPayload, { kind: "coords" }> =>
  !!p && (p as any).kind === "coords";
