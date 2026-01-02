"use client";

import { useCallback, useState } from "react";

import type { MergedMarker } from "@/features/map/pages/hooks/useMergedMarkers";
import {
  createSurveyReservation,
  fetchUnreservedDrafts,
} from "@/shared/api/survey-reservations/surveyReservations";
import { todayYmdKST } from "@/shared/date/todayYmdKST";
import {
  extractDraftIdFromPin,
  findDraftIdByHeuristics,
  findDraftIdFromScheduled,
  optimisticPlannedPosSet,
} from "../lib/draftMatching";
import { useToast } from "@/hooks/use-toast";
import { CreateFromPinArgs } from "../PinContextMenuContainer.types";

type BoundsBox =
  | {
      sw: { lat: number; lng: number };
      ne: { lat: number; lng: number };
    }
  | undefined;

type PlanResult = {
  draftId?: string | number;
  payload: { lat: number; lng: number; address?: string | null };
} | void;

type Args = {
  position: kakao.maps.LatLng;
  posK: string;

  // 플랜 생성용
  handlePlan: () => Promise<PlanResult> | PlanResult;
  getBoundsBox: () => BoundsBox;
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
  cleanupOverlaysAt: (lat: number, lng: number) => void;
  bump: () => void;

  // 예약/등록 공통
  pin: any;
  metaAtPos?: MergedMarker;
  propertyId?: string | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  reserved: boolean;
  scheduledReservations?: any[];
  refetchScheduledReservations: () => Promise<any>;
  onClose?: () => void;
  onCreate?: (args: CreateFromPinArgs) => void;
};

export function usePinContextMenuActions({
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
  refetchScheduledReservations,
  onClose,
  onCreate,
}: Args) {
  const { toast } = useToast();

  const handlePlanClick = useCallback(async () => {
    const lat = position.getLat();
    const lng = position.getLng();

    const result = (await handlePlan()) as PlanResult;

    // 낙관 플래그는 그대로
    optimisticPlannedPosSet.add(posK);

    // 🔁 서버 쪽 /map 새로고침은 onAfterCreate / idle 로직에 맡김
    //    여기서는 필요하면 로컬 드래프트 마커만 보정
    if (result && "payload" in result && result.payload && upsertDraftMarker) {
      const id = (result.draftId ?? `__temp_${Date.now()}`) as string | number;
      upsertDraftMarker({
        id,
        lat: result.payload.lat,
        lng: result.payload.lng,
        address: result.payload.address ?? null,
      });
    }

    // 오버레이 정리
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cleanupOverlaysAt(lat, lng);
      });
    });

    bump();
  }, [position, handlePlan, posK, upsertDraftMarker, cleanupOverlaysAt, bump]);

  /** 예약 */
  const [reserving, setReserving] = useState(false);

  const getDraftIdForReservation = useCallback(async (): Promise<
    number | undefined
  > => {
    let draftId = extractDraftIdFromPin(pin);
    if (draftId != null) return draftId;

    const metaDraftId =
      metaAtPos?.source === "draft" ? (metaAtPos as any)?.id : undefined;
    if (typeof metaDraftId === "number") return metaDraftId;

    const idStr = String(propertyId ?? "");
    const m = idStr.match(/(\d{1,})$/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return n;
    }

    try {
      const before = await fetchUnreservedDrafts();
      const lat = position.getLat();
      const lng = position.getLng();
      draftId = findDraftIdByHeuristics({
        before,
        lat,
        lng,
        roadAddress,
        jibunAddress,
      });
      if (draftId != null) return draftId;
    } catch {
      // ignore
    }

    return undefined;
  }, [pin, metaAtPos, propertyId, position, roadAddress, jibunAddress]);

  const handleReserveClick = useCallback(async () => {
    try {
      setReserving(true);

      const draftId = await getDraftIdForReservation();

      if (draftId == null) {
        toast({
          title: "답사지 예약 실패",
          description: "이미 다른 사원이 예약한 핀입니다.",
          variant: "destructive",
        });
        return;
      }

      // 1) 예약 생성
      await createSurveyReservation({
        pinDraftId: draftId,
        reservedDate: todayYmdKST(),
      });

      // 2) 예약 리스트 동기화
      try {
        await refetchScheduledReservations();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[reserve] refetchScheduledReservations 실패:", e);
      }

      // 3) 성공 토스트
      toast({
        title: "답사지 예약 완료",
        description: "답사지 예약을 완료했습니다.",
      });

      // 4) 컨텍스트메뉴 닫기
      onClose?.();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[reserve] 에러:", e);
      const msg = String(
        e?.response?.data?.message ??
          e?.message ??
          "답사지 예약 중 오류가 발생했습니다."
      );
      toast({
        title: "답사지 예약 실패",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setReserving(false);
    }
  }, [
    getDraftIdForReservation,
    pin,
    propertyId,
    position,
    refetchScheduledReservations,
    onClose,
    toast,
  ]);

  /** 신규 등록/정보 입력 */
  const handleCreateClick = useCallback(
    async (payloadFromPanel: CreateFromPinArgs) => {
      const lat = position.getLat();
      const lng = position.getLng();

      let {
        latFromPin,
        lngFromPin,
        fromPinDraftId,
        address,
        roadAddress: roadAddrFromPanel,
        jibunAddress: jibunAddrFromPanel,
        createMode,
      } = payloadFromPanel;

      latFromPin ||= lat;
      lngFromPin ||= lng;

      // 1차: 기존 heuristic
      let effectiveDraftId =
        fromPinDraftId ?? extractDraftIdFromPin(pin) ?? undefined;

      if (effectiveDraftId == null && metaAtPos?.source === "draft") {
        const n = Number((metaAtPos as any)?.id);
        if (Number.isFinite(n)) effectiveDraftId = n;
      }

      if (effectiveDraftId == null) {
        const idStr = String(propertyId ?? "");
        const m = idStr.match(/(\d{1,})$/);
        if (m) {
          const n = Number(m[1]);
          if (Number.isFinite(n)) effectiveDraftId = n;
        }
      }

      const roadAddressFinal = roadAddrFromPanel ?? roadAddress ?? null;
      const jibunAddressFinal = jibunAddrFromPanel ?? jibunAddress ?? null;
      const addressFinal =
        address ?? roadAddressFinal ?? jibunAddressFinal ?? null;

      // 2차: draftId 없으면 reserved 여부에 따라 분기
      if (effectiveDraftId == null) {
        if (reserved) {
          // 이미 "답사지예약된 핀"에서 매물등록 → scheduled 리스트에서 찾기
          const found = findDraftIdFromScheduled({
            scheduled: scheduledReservations ?? [],
            lat: latFromPin,
            lng: lngFromPin,
            roadAddress: roadAddressFinal,
            jibunAddress: jibunAddressFinal,
          });
          if (found != null) {
            effectiveDraftId = found;
          }
        } else {
          // 예약 안 된 "답사예정지"에서 바로 매물등록 → before(unreserved)에서 찾기
          try {
            const before = await fetchUnreservedDrafts();
            const found = findDraftIdByHeuristics({
              before,
              lat: latFromPin,
              lng: lngFromPin,
              roadAddress: roadAddressFinal,
              jibunAddress: jibunAddressFinal,
            });
            if (found != null) {
              effectiveDraftId = found;
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[create] fetchUnreservedDrafts failed:", e);
          }
        }
      }

      // 🔼 최종 payload
      onCreate?.({
        ...payloadFromPanel,
        latFromPin,
        lngFromPin,
        fromPinDraftId: effectiveDraftId,
        address: addressFinal,
        roadAddress: roadAddressFinal,
        jibunAddress: jibunAddressFinal,
        createMode,
      });

      // 오버레이 정리 + 닫기
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            cleanupOverlaysAt(latFromPin, lngFromPin);
          } catch {
            /* no-op */
          }
        });
      });
      onClose?.();
    },
    [
      position,
      pin,
      metaAtPos,
      propertyId,
      roadAddress,
      jibunAddress,
      reserved,
      scheduledReservations,
      onCreate,
      onClose,
      cleanupOverlaysAt,
    ]
  );

  return {
    handlePlanClick,
    reserving,
    handleReserveClick,
    handleCreateClick,
  };
}
