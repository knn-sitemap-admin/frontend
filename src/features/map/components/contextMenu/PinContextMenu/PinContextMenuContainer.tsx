"use client";

import { useSidebar } from "@/features/sidebar";
import { toLatLng } from "./utils/geo";
import { useDerivedPinState } from "./hooks/useDerivedPinState";
import { usePlanReserve } from "./hooks/usePlanReserve";
import ContextMenuPanel from "../ContextMenuPanel/ContextMenuPanel";
import { PinContextMenuProps, ReserveRequestPayload } from "./PinContextMenuContainer.types";
import { useScheduledReservations } from "@/features/survey-reservations/hooks/useScheduledReservations";
import { useCancelReservation } from "@/features/survey-reservations/hooks/useCancelReservation";
import CustomOverlay from "../../../shared/CustomOverlay/CustomOverlay";
import { useDeletePropertyFromMenu } from "./hooks/useDeletePropertyFromMenu";
import { MergedMarker } from "@/features/map/pages/hooks/useMergedMarkers";
import { posKey } from "./lib/draftMatching";
import { useReservationVersion } from "@/features/survey-reservations/store/useReservationVersion";
import { usePinContextMenuActions } from "./hooks/usePinContextMenuActions";
import { useToast } from "@/hooks/use-toast";
import { deletePinDraft } from "@/shared/api/pins";
import { useCallback, useEffect, useMemo } from "react";
import { extractDraftIdFromPropertyId } from "../ContextMenuPanel/panel.utils";
import { useMeRole } from "@/features/auth/hooks/useMeRole";

type Props = PinContextMenuProps & {
  mergedMeta?: MergedMarker[];
  refreshViewportPins?: (bounds: {
    sw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
  }) => Promise<void> | void;
  upsertDraftMarker?: (m: {
    id: string | number;
    lat: number;
    lng: number;
    address?: string | null;
  }) => void;
  /** 매물 삭제 후 부모에서 리스트/지도 갱신이 필요하면 사용 */
  onDeleteProperty?: (id: string | null) => void | Promise<void>;
  /** 메뉴가 떠 있는 동안 숨길 라벨 id 제어 */
  onChangeHideLabelForId?: (id?: string) => void;
};

export default function PinContextMenuContainer(props: Props) {
  const {
    kakao,
    map,
    position: target,
    roadAddress,
    jibunAddress,
    propertyId,
    propertyTitle,
    pin,
    onAddFav,
    onClose,
    onView,
    onCreate,
    onPlan,
    onReserve,
    zIndex = 10000,
    isPlanPin: isPlanPinFromParent,
    isVisitReservedPin: isVisitReservedFromParent,
    mergedMeta,
    refreshViewportPins,
    upsertDraftMarker,
    onDeleteProperty,
    onChangeHideLabelForId,
  } = props;

  const { toast } = useToast();
  const version = useReservationVersion((s) => s.version);
  const bump = useReservationVersion((s) => s.bump);

  const {
    items: scheduledReservations,
    setItems: setScheduledReservations,
    refetch: refetchScheduledReservations,
  } = useScheduledReservations();

  const { isPrivileged } = useMeRole();

  const { onCancel } = useCancelReservation(
    scheduledReservations,
    setScheduledReservations,
    () => refetchScheduledReservations()
  );

  const handleView = () => {
    const id = String(propertyId ?? "");
    if (!id || id === "__draft__" || id.startsWith("__visit__")) return;
    onView?.(id);
    Promise.resolve().then(() => onClose?.());
  };

  if (!kakao || !map || !target) return null;

  const position = useMemo<kakao.maps.LatLng>(
    () => toLatLng(kakao, target),
    [kakao, target]
  );

  /** 현재 위치 근처 메타 */
  const metaAtPos = useMemo(() => {
    if (!mergedMeta) return undefined;
    const lat = position.getLat();
    const lng = position.getLng();
    const EPS = 1e-5;
    return mergedMeta.find(
      (m) => Math.abs(m.lat - lat) < EPS && Math.abs(m.lng - lng) < EPS
    );
  }, [mergedMeta, position]);

  /** 핀/메타에서 읽은 draftState (원본) */
  const resolvedDraftState = useMemo<string | undefined>(() => {
    const fromMeta =
      metaAtPos?.source === "draft" ? metaAtPos?.draftState : undefined;
    const fromPin =
      (pin as any)?.draft?.draftState ??
      (pin as any)?.draft?.state ??
      (pin as any)?.draftState ??
      undefined;
    const v = (fromMeta ?? fromPin) as unknown;
    return typeof v === "string" ? v : undefined;
  }, [metaAtPos, pin]);

  const base = useDerivedPinState({
    propertyId,
    pin,
    isPlanPinFromParent,
    isVisitReservedFromParent,
  });

  let { listed, favActive } = base;

  /** 🔍 검색 드래프트인지 (선택 위치) 여부 */
  const isSearchDraft = String((pin as any)?.id ?? "") === "__draft__";

  /** 신규 클릭 가드: "검색 드래프트 + __draft__" 만 신규로 취급 */
  const isNewClick = propertyId === "__draft__" && isSearchDraft;

  /** 현재 위치 posKey */
  const posK = useMemo(
    () => posKey(position.getLat(), position.getLng()),
    [position]
  );

  /** 예약 리스트 기준 "현재 위치에 예약이 존재하는지" 및 "내 예약인지" */
  const reservationAtPos = useMemo(() => {
    if (!scheduledReservations?.length) return { exists: false, isMine: false };
    const key = posK;

    const byPosKey = scheduledReservations.find(
      (r: any) => r.posKey && r.posKey === key
    );
    if (byPosKey) {
      return { exists: true, isMine: byPosKey.isMine === true };
    }

    const lat = position.getLat();
    const lng = position.getLng();
    const EPS = 1e-5;

    const byLatLng = scheduledReservations.find(
      (r: any) =>
        typeof r.lat === "number" &&
        typeof r.lng === "number" &&
        Math.abs(r.lat - lat) < EPS &&
        Math.abs(r.lng - lng) < EPS
    );

    if (byLatLng) {
      return { exists: true, isMine: byLatLng.isMine === true };
    }

    return { exists: false, isMine: false };
  }, [scheduledReservations, posK, position]);

  const hasReservationAtPos = reservationAtPos.exists;
  const isMyReservationAtPos = reservationAtPos.isMine;

  /** 이 위치가 낙관적으로 "답사예정" 처리된 상태인지 */
  const optimisticPlannedHere =
    !isNewClick && (globalThis as any).optimisticPlannedPosSet?.has
      ? (globalThis as any).optimisticPlannedPosSet.has(posK)
      : false;

  /**  최종 reserved/planned 판정 */
  let reserved = false;
  let planned = false;

  if (!isNewClick) {
    if (hasReservationAtPos) {
      reserved = true;
      planned = false;
    } else {
      reserved = false;

      if (optimisticPlannedHere) {
        planned = true;
      } else {
        const s = (resolvedDraftState ?? "").toUpperCase();

        if (metaAtPos?.source === "draft") {
          planned = true;
        } else if (s && s !== "DELETED") {
          planned = true;
        } else if (isPlanPinFromParent) {
          planned = true;
        }
      }
    }
  }

  /** reserved 상태일 때 다른 계정에서 예약한 핀인지 (매물 정보 입력 버튼 비활성화용) */
  const isReservedByOtherAccountAtPos = reserved && !isMyReservationAtPos;

  /** 패널에 넘길 draftState: reserved/planned 에 맞춰 단순화 */
  let draftStateForPanel: string | undefined;
  if (reserved) {
    draftStateForPanel = "SCHEDULED";
  } else if (planned) {
    draftStateForPanel = "PLANNED";
  } else {
    draftStateForPanel = undefined;
  }

  const { createVisitPlanAt, reserveVisitPlan } = useSidebar();

  const { handlePlan } = usePlanReserve({
    mode: "create",
    position,
    roadAddress,
    jibunAddress,
    propertyId,
    propertyTitle,
    onPlan,
    onReserve,
    onClose,
    createVisitPlanAt,
    reserveVisitPlan,
    loadScheduledReservations: refetchScheduledReservations,
  });

  /** 현재 지도 bounds를 {sw, ne}로 추출 */
  const getBoundsBox = useCallback(() => {
    try {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      return {
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      };
    } catch {
      return undefined;
    }
  }, [map]);

  /** 공용 오버레이 정리 (라벨은 Host에서만 복원) */
  const cleanupOverlaysAt = useCallback((lat: number, lng: number) => {
    try {
      const anyWin = globalThis as any;
      if (typeof anyWin.__cleanupOverlaysAtPos === "function") {
        anyWin.__cleanupOverlaysAtPos(lat, lng);
      }
    } catch {
      /* no-op */
    }
  }, []);

  const { handlePlanClick, reserving, handleReserveClick, handleCreateClick } =
    usePinContextMenuActions({
      position,
      posK,
      handlePlan,
      getBoundsBox,
      refreshViewportPins,
      upsertDraftMarker,
      cleanupOverlaysAt,
      bump,
      pin,
      metaAtPos,
      propertyId,
      roadAddress,
      jibunAddress,
      reserved,
      scheduledReservations,
      refetchScheduledReservations: () => refetchScheduledReservations(),
      onClose,
      onCreate,
    });

  const xAnchor = 0.5;
  const yAnchor = 1;

  const offsetPx = isSearchDraft ? 56 : 56;
  const MENU_Z = Math.max(zIndex ?? 0, 1_000_000);

  /** 컨텍스트 메뉴 패널에 넘길 propertyId */
  const propertyIdClean = useMemo(() => {
    if (metaAtPos?.source === "draft") {
      const n = Number((metaAtPos as any)?.id);
      if (Number.isFinite(n)) return String(n);
    }

    const raw = String(propertyId ?? "").trim();
    if (!raw) return null;
    const m = raw.match(/(\d{1,})$/);
    return (m?.[1] ?? raw) || null;
  }, [propertyId, metaAtPos]);

  /** 현재 핀의 pinDraftId 추출 */
  const currentPinDraftId = useMemo(() => {
    return extractDraftIdFromPropertyId(propertyIdClean);
  }, [propertyIdClean]);

  /** 현재 핀이 이미 예약되어 있는지 확인 (다른 계정의 예약 포함) */
  const reservationForThisDraft = useMemo(() => {
    if (currentPinDraftId == null || !scheduledReservations?.length)
      return null;
    const draftIdStr = String(currentPinDraftId);
    return (
      scheduledReservations.find((r: any) => {
        const rDraftId = r.pinDraftId != null ? String(r.pinDraftId) : null;
        return rDraftId === draftIdStr;
      }) || null
    );
  }, [currentPinDraftId, scheduledReservations]);

  const isAlreadyReserved = reservationForThisDraft != null;
  const isMyReservation = reservationForThisDraft?.isMine === true;

  /** 다른 계정에서 예약한 핀인지 (답사지 등록 버튼 비활성화용) */
  const isReservedByOtherAccount = isAlreadyReserved && !isMyReservation;

  /** 예약자 이름 추출 */
  const assigneeName = reservationForThisDraft?.assigneeName ?? null;

  /** 예약 ID 추출 (취소 기능용) */
  const reservationId = reservationForThisDraft?.id
    ? String(reservationForThisDraft.id)
    : null;

  /** draft 메타일 때만 제목으로 사용 */
  const metaTitle = useMemo(() => {
    if (!metaAtPos) return undefined;

    if (metaAtPos.source === "draft") {
      return (
        (metaAtPos as any)?.property?.title ??
        (metaAtPos as any)?.title ??
        (metaAtPos as any)?.name ??
        undefined
      );
    }

    return undefined;
  }, [metaAtPos]);

  const derivedPropertyTitle = useMemo(() => {
    const pinTitle =
      (pin as any)?.property?.title ??
      (pin as any)?.title ??
      (pin as any)?.name ??
      (pin as any)?.property?.name ??
      undefined;

    return (
      (propertyTitle ?? "").trim() ||
      (pinTitle ?? "").trim() ||
      (metaTitle ?? "").trim() ||
      ""
    );
  }, [propertyTitle, pin, metaTitle]);

  /** 매물 삭제용 훅 (기존) */
  const { canDelete: canDeleteProperty, handleDelete: handleDeleteProperty } =
    useDeletePropertyFromMenu({
      propertyIdClean,
      listed,
      isSearchDraft,
      onDeleteProperty,
      onClose,
    });

  /** 답사예정지(draft) id 추출 */
  const draftIdFromPin = useMemo(() => {
    const raw = String((pin as any)?.id ?? "");
    if (raw.startsWith("__visit__")) {
      const n = Number(raw.replace("__visit__", ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }, [pin]);

  const draftIdFromMeta = useMemo(() => {
    if (metaAtPos?.source !== "draft") return null;
    const n = Number(
      (metaAtPos as any)?.id ??
        (metaAtPos as any)?.draftId ??
        (metaAtPos as any)?.pinDraftId
    );
    return Number.isFinite(n) ? n : null;
  }, [metaAtPos]);

  const draftId = draftIdFromMeta ?? draftIdFromPin;

  /** 답사예정지 삭제 가능 여부 (예약 전 PLANNED 핀) */
  const canDeleteDraft = planned && draftId != null;

  /** 최종 삭제 가능 여부: 매물 삭제 || 답사예정지 삭제 */
  const canDelete = canDeleteProperty || canDeleteDraft;

  /** 🔥 메뉴가 떠 있는 동안 라벨 숨기기: 여기서 id를 강제로 세팅 */
  useEffect(() => {
    const id = propertyIdClean ?? undefined;
    if (!id) return;

    onChangeHideLabelForId?.(id);

    return () => {
      onChangeHideLabelForId?.(undefined);
    };
  }, [propertyIdClean, onChangeHideLabelForId, position]);

  const overlayKey = useMemo(
    () => `ctx:${version}:${posK}:${derivedPropertyTitle || ""}`,
    [version, posK, derivedPropertyTitle]
  );

  const handleDelete = useCallback(async () => {
    if (canDeleteDraft && draftId != null) {
      const ok = window.confirm("이 답사예정지 핀을 삭제하시겠어요?");
      if (!ok) return;

      try {
        await deletePinDraft(draftId);

        const box = getBoundsBox();
        if (box && refreshViewportPins) {
          await Promise.resolve(refreshViewportPins(box));
        }

        cleanupOverlaysAt(position.getLat(), position.getLng());

        toast({
          title: "삭제 완료",
          description: "답사예정지를 삭제했습니다.",
        });
        onClose?.();
      } catch (e: any) {
        const msg = String(
          e?.response?.data?.message ??
            e?.responseData?.message ??
            e?.message ??
            e
        );
        toast({
          title: "삭제 실패",
          description: msg,
          variant: "destructive",
        });
      }
      return;
    }

    if (canDeleteProperty) {
      await handleDeleteProperty();
    }
  }, [
    canDeleteDraft,
    draftId,
    canDeleteProperty,
    handleDeleteProperty,
    getBoundsBox,
    refreshViewportPins,
    cleanupOverlaysAt,
    position,
    toast,
    onClose,
  ]);

  const handleReserveWithToast = useCallback(async (payload?: ReserveRequestPayload) => {
    try {
      await handleReserveClick(payload?.assigneeId);
      toast({
        title: "예약 완료",
        description: "답사지를 예약했습니다.",
      });
    } catch {
      /* 내부에서 에러 토스트 처리 가능하니 여기서는 무시 */
    }
  }, [handleReserveClick, toast]);

  return (
    <CustomOverlay
      key={overlayKey}
      kakao={kakao}
      map={map}
      position={position}
      xAnchor={xAnchor}
      yAnchor={yAnchor}
      zIndex={MENU_Z}
      pointerEventsEnabled
    >
      <div style={{ position: "relative", top: -offsetPx }}>
        <div role="dialog" aria-modal="true">
          <div className="relative pointer-events-auto">
            <ContextMenuPanel
              roadAddress={roadAddress ?? null}
              jibunAddress={jibunAddress ?? null}
              propertyId={propertyIdClean}
              propertyTitle={derivedPropertyTitle || null}
              draftState={draftStateForPanel}
              onClose={props.onClose}
              onView={handleView}
              onCreate={handleCreateClick}
              onPlan={handlePlanClick}
              onReserve={reserving ? () => {} : handleReserveWithToast}
              isPlanPin={planned}
              isVisitReservedPin={reserved}
              isAlreadyReserved={isReservedByOtherAccount}
              isReservedByOtherAccount={isReservedByOtherAccountAtPos}
              assigneeName={assigneeName}
              reservationId={reservationId}
              onCancelReservation={
                (isMyReservation || (isReservedByOtherAccount && isPrivileged)) && reservationId
                  ? () => onCancel(reservationId)
                  : undefined
              }
              isForceCancel={!isMyReservation && isPrivileged && isReservedByOtherAccount}
              showFav={listed}
              onAddFav={onAddFav}
              favActive={favActive}
              position={position}
              canDelete={canDelete}
              onDelete={handleDelete}
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-full -mt-px -translate-x-1/2 w-0 h-0
                         border-l-[10px] border-l-transparent
                         border-r-[10px] border-r-transparent
                         border-t-[12px] border-t-white"
            />
          </div>
        </div>
      </div>
    </CustomOverlay>
  );
}
