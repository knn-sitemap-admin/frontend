import type { Dispatch, SetStateAction, RefObject } from "react";
import { PropertyItem } from "@/features/properties/types/propertyItem";
import { LatLng } from "@/lib/geo/types";
import { CreatePayload } from "@/features/properties/types/property-dto";
import { PinKind } from "@/features/pins/types";
import { MapMarker, MapMarkerTagged } from "../../shared/types/mapMarker.type";
import { PropertyViewDetails } from "@/features/properties/view/types";
import { CreateFromPinArgs } from "../../components/contextMenu/PinContextMenu/PinContextMenuContainer.types";
import { PoiKind } from "../../poi/lib/poiTypes";

type ReserveFromMenuPayload =
  | { visitId: string | number; dateISO?: string }
  | {
      lat: number;
      lng: number;
      title?: string | null;
      roadAddress?: string | null;
      jibunAddress?: string | null;
      dateISO?: string;
    };

export type MapHomeUIProps = {
  // core
  appKey: string;
  kakaoSDK: any;
  mapInstance: any;

  // data
  items: PropertyItem[];
  filtered: PropertyItem[];
  markers: (MapMarker | MapMarkerTagged)[];
  fitAllOnce: boolean;

  // search & filter
  q: string;
  filter: string;
  onChangeQ: (v: string) => void;
  onChangeFilter: (v: any) => void;
  onSubmitSearch: (v?: string) => void;

  // toggles
  useSidebar: boolean;
  setUseSidebar: Dispatch<SetStateAction<boolean>>;
  useDistrict: boolean;
  /** 거리재기 도구 켜기/끄기 */
  distanceMeasureVisible?: boolean;
  onToggleDistanceMeasure?: () => void;
  /** 반경재기 도구 켜기/끄기 */
  radiusMeasureVisible?: boolean;
  onToggleRadiusMeasure?: () => void;

  // ⭐ POI
  poiKinds: ReadonlyArray<PoiKind>;
  onChangePoiKinds: (next: ReadonlyArray<PoiKind>) => void;

  // ⛳️ 즐겨찾기(모달) 흐름만 사용
  addFav?: boolean;
  onAddFav?: () => void | Promise<void>;
  favById?: Record<string, boolean>;

  // menu
  menuOpen: boolean;
  menuAnchor: LatLng | null;
  menuTargetId: string | number | null;
  menuRoadAddr: string | null;
  menuJibunAddr: string | null;
  menuTitle: string | null;
  onCloseMenu: () => void;

  // ✅ 상세보기 트리거 (컨트롤드 지원 시에만 전달; 없으면 내부에서 처리)
  onViewFromMenu?: (id: string | number) => void;

  onCreateFromMenu: (args: CreateFromPinArgs) => void;
  onPlanFromMenu: (pos: LatLng) => void;

  // map callbacks
  onMarkerClick: (id: string | number) => void;
  onMapReady: (api: any) => void;
  onViewportChange: (vp: any, opts?: { force?: boolean }) => void;

  // modals
  viewOpen?: boolean;
  editOpen: boolean;
  createOpen: boolean;
  selectedViewItem?: PropertyViewDetails | null;

  selectedId: string | number | null;
  prefillAddress?: string;
  draftPin: LatLng | null;
  setDraftPin: (pin: LatLng | null) => void;
  selectedPos: LatLng | null;

  // ✅ 상세보기 닫기 콜백도 옵션
  closeView?: () => void;

  closeEdit: () => void;
  closeCreate: () => void;
  onSaveViewPatch: (patch: Partial<PropertyViewDetails>) => Promise<void>;
  onEditFromView: () => void;
  onDeleteFromView: () => Promise<void>;

  createHostHandlers: {
    onClose: () => void;
    appendItem: (item: PropertyItem) => void;
    selectAndOpenView: (id: string | number) => void;
    resetAfterCreate: () => void;
    // (있으면 MapHomeUI에서 onAfterCreate 오버라이드해서 씀)
    onAfterCreate?: (args: {
      pinId: string;
      matchedDraftId?: string | number | null;
      lat: number;
      lng: number;
      payload?: any;
    }) => void;
    onOpenViewAfterCreate?: (pinId: string | number) => void;
  };
  editHostHandlers: {
    onClose: () => void;
    updateItems: (updater: (prev: PropertyItem[]) => PropertyItem[]) => void;
    onSubmit: (payload: CreatePayload) => Promise<void>;
  };

  // misc
  hideLabelForId?: string | null;

  onOpenMenu: (p: {
    position: { lat: number; lng: number };
    // 🔽 검색핀에서 null / 생략 가능하도록 수정
    propertyId?: "__draft__" | string | number | null;
    propertyTitle?: string | null;
    pin?: { kind: string; isFav?: boolean };
  }) => void;

  onChangeHideLabelForId?: (id?: string) => void;

  onReserveFromMenu?: (args: ReserveFromMenuPayload) => Promise<void>;

  /** 시청역 답사예정핀 등에서 create 눌렀을 때 연결할 draftId (문자열) */
  createFromDraftId?: string | null;

  /** 생성 모달 기본 핀 종류 */
  createPinKind?: PinKind | null;

  /** 생성 모달 헤더 프리필 (이름 / 분양사무실 전화번호) */
  draftHeaderPrefill?: {
    title?: string;
    officePhone?: string;
  } | null;

  /** ✅ pin-drafts/{id} 조회용 numeric id */
  pinDraftId?: number;

  /** ✅ 부모(MapHomeState) 강제 갱신용 */
  refetchPins?: (args?: { draftState?: "all" | "before" | "scheduled" }) => void | Promise<void>;

  /** 하단 메뉴 카드 높이 측정용 ref — 동적 pan 오프셋 계산용 */
  bottomCardHeightRef?: React.RefObject<number>;
};
