"use client";

import type { LatLng } from "@/lib/geo/types";
import type { PinKind } from "@/features/pins/types";
import PropertyCreateViewHost from "@/features/properties/components/PropertyCreateViewHost";
import type { PropertyViewDetails } from "@/features/properties/view/types";

/** ✅ draft 상세 조회용 */
import { useQuery } from "@tanstack/react-query";
import { getPinDraftDetailOnce } from "@/shared/api/pins";
import RoadviewHost from "@/features/map/engine/roadview/RoadviewHost";
import { DEFAULT_CENTER } from "@/features/map/shared/constants/mapDefaults";

export default function ModalsHost(props: {
  /** View Modal */
  viewOpen: boolean;
  selectedViewItem: PropertyViewDetails | null;
  onCloseView: () => void;
  onSaveViewPatch: (p: Partial<PropertyViewDetails>) => void | Promise<void>;

  /** ✅ MapHomeUI 쪽 시그니처에 맞게: 인자 없는 함수 */
  onDeleteFromView: () => void | Promise<void>;

  /** ✅ 수정 모달 저장 후 map 핀 다시 불러오기용 콜백 (ex. usePinsMap.refetch) */
  onLabelChanged?: () => void | Promise<void>;

  /** Create Modal */
  createOpen: boolean;
  prefillAddress?: string;
  draftPin: { lat: number; lng: number } | null;
  selectedPos: { lat: number; lng: number } | null;
  createHostHandlers: {
    onClose: () => void;
    appendItem: (it: any) => void;
    resetAfterCreate: () => void;
    /**
     * 매물 생성 직후 호출:
     *  - draft 숨김/정리
     *  - (이제는) 마커 정리 등 MapHomeUI 쪽 후처리
     */
    onAfterCreate: (args: {
      pinId?: string;
      matchedDraftId?: string | number | null;
      lat: number;
      lng: number;
      payload?: any;
      mode?: "visit-plan-only" | "create";
    }) => void;
    onOpenViewAfterCreate?: (pinId: string | number) => void;
  };

  /** ✅ draft 기반 생성용 id */
  pinDraftId?: number;

  /** ✅ MapHomeUI에서 내려주는 생성용 기본 핀종류 */
  createPinKind?: PinKind | null;

  /** ✅ 임시핀 헤더 프리필용 (매물명 / 분양사무실 대표·추가 전화번호) */
  draftHeaderPrefill?: {
    title?: string;
    officePhone?: string;
    officePhone2?: string;
  };

  /** ✅ 현재 뷰포트 기준 핀 다시 불러오기 (usePinsMap.refetch) */
  refetchPins?: () => void | Promise<void>;

  /** Roadview */
  roadviewVisible: boolean;
  roadviewContainerRef: any;
  roadviewRef: any;
  onCloseRoadview: () => void;
  /** Kakao SDK 인스턴스 (미니맵용) */
  kakaoSDK?: any;
  /** 메인 맵 인스턴스 (미니맵용) */
  mapInstance?: any;
}) {
  const {
    // view
    viewOpen,
    selectedViewItem,
    onCloseView,
    onSaveViewPatch,
    onDeleteFromView,
    onLabelChanged,
    // create
    createOpen,
    prefillAddress,
    draftPin,
    selectedPos,
    createHostHandlers,
    pinDraftId,
    createPinKind,
    draftHeaderPrefill,
    refetchPins,
    // roadview
    roadviewVisible,
    roadviewContainerRef,
    roadviewRef,
    onCloseRoadview,
  } = props;

  // 뷰 진입 가능 여부
  const canShowView = !!viewOpen && !!selectedViewItem;

  // 단일 카드 호스트 열림 여부
  const cardOpen = createOpen || canShowView;

  // create 단계에서 사용할 초기 좌표
  const initialPos: LatLng = draftPin ?? selectedPos ?? DEFAULT_CENTER;

  // 처음 열릴 때 어떤 단계로 시작할지
  const initialStage: "create" | "view" = canShowView ? "view" : "create";

  /** ✅ 매물정보입력(생성 모달)에서 사용할 draft 헤더 프리필용 id
   *    - createOpen 여부와 상관없이, 숫자 id만 있으면 사용
   */
  const draftIdForHeader = typeof pinDraftId === "number" ? pinDraftId : null;

  /** ✅ pin-drafts/{id} 상세 조회 (이름 / 분양사무실 전화번호) */
  const { data: draftDetail } = useQuery({
    queryKey: ["pinDraftDetail", draftIdForHeader],
    queryFn: () => getPinDraftDetailOnce(draftIdForHeader as number),
    enabled: draftIdForHeader != null,
  });

  /** ✅ 서버 응답 + 상위에서 내려온 프리필을 합쳐 최종 헤더 프리필로 사용 */
  const effectiveDraftHeaderPrefill =
    draftDetail && draftIdForHeader != null
      ? {
          title: draftDetail.name ?? draftHeaderPrefill?.title,
          officePhone:
            draftDetail.contactMainPhone ?? draftHeaderPrefill?.officePhone,
          officePhone2:
            draftDetail.contactSubPhone ?? draftHeaderPrefill?.officePhone2,
        }
      : draftHeaderPrefill;

  // 카드 닫기 시: 생성/뷰 쪽 둘 다 닫기 시도
  const handleCloseCard = () => {
    createHostHandlers.onClose();
    onCloseView();
  };

  return (
    <>
      {cardOpen && (
        <PropertyCreateViewHost
          open={cardOpen}
          initialStage={initialStage}
          onClose={handleCloseCard}
          /* 생성 단계 props */
          initialAddress={prefillAddress}
          initialPos={initialPos}
          pinDraftId={pinDraftId ?? null}
          appendItem={createHostHandlers.appendItem}
          resetAfterCreate={createHostHandlers.resetAfterCreate}
          onAfterCreate={createHostHandlers.onAfterCreate}
          /* 생성 모달 기본 핀종류 */
          initialPinKind={createPinKind ?? undefined}
          /* ✅ pin-drafts/{id} + 상위 프리필을 합친 최종 헤더 프리필 */
          draftHeaderPrefill={effectiveDraftHeaderPrefill}
          /* 뷰 단계 props */
          initialViewData={selectedViewItem ?? undefined}
          onSaveViewPatch={onSaveViewPatch}
          onDeleteFromView={onDeleteFromView}
          /* ✅ 뷰 → 수정 → 저장 후 map GET용 콜백 */
          onLabelChanged={onLabelChanged}
          /* ✅ 생성/답사예정 저장 후 map 핀 다시 불러오기 */
          refetchPins={refetchPins}
        />
      )}

      {/* 카드가 떠 있을 땐 로드뷰 숨김 */}
      {!cardOpen && (
        <RoadviewHost
          open={roadviewVisible}
          onClose={onCloseRoadview}
          containerRef={roadviewContainerRef}
          roadviewRef={roadviewRef}
          onResize={() => {}}
          kakaoSDK={props.kakaoSDK}
          mapInstance={props.mapInstance}
        />
      )}
    </>
  );
}
