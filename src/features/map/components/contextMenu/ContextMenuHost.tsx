"use client";

import { useMemo, useRef } from "react";

import { createSurveyReservation } from "@/shared/api/survey-reservations/surveyReservations";
import { useToast } from "@/hooks/use-toast";
import { useScheduledReservations } from "@/features/survey-reservations/hooks/useScheduledReservations";
import { useReservationVersion } from "@/features/survey-reservations/store/useReservationVersion";

import {
  normalizeLL,
  toGroupingPosKeyFromPos,
} from "../../shared/utils/coords";
import { useContextMenuAnchor } from "./hooks/useContextMenuAnchor";

import { createPinDraft } from "@/shared/api/pins";
import { CreateFromPinArgs } from "./PinContextMenu/PinContextMenuContainer.types";
import PinContextMenuContainer from "./PinContextMenu/PinContextMenuContainer";
import {
  ContextMenuHostProps,
  ReserveFromMenuArgs,
} from "./contextMenuHost.types";

export default function ContextMenuHost(props: ContextMenuHostProps) {
  const {
    open,
    kakaoSDK,
    mapInstance,
    menuAnchor,
    menuTargetId,
    menuTitle,
    menuRoadAddr,
    menuJibunAddr,
    visibleMarkers,
    favById,
    siteReservations,
    onCloseMenu,
    onViewFromMenu,
    onCreateFromMenu,
    onPlanFromMenu,
    onReserveFromMenu,
    onAddFav,
    mergedMeta,
    upsertDraftMarker,
    refreshViewportPins,
    onDeleteProperty,
  } = props;

  const sr = useScheduledReservations();
  const { refetch } = sr;
  const { toast } = useToast();
  const version = useReservationVersion((s) => s.version);
  const bump = useReservationVersion((s) => s.bump);

  const optimisticReservedIdsRef = useRef<Set<string>>(new Set());
  const optimisticReservedPosRef = useRef<Set<string>>(new Set());

  // ⭐ 앵커/타겟/overlayLatLng/렌더조건 계산을 훅으로 분리
  const { anchorPos, overlayLatLng, effectiveTarget, shouldRender } =
    useContextMenuAnchor({
      open,
      kakaoSDK,
      mapInstance,
      menuAnchor,
      menuTargetId,
      visibleMarkers,
    });

  /** 예약 목록 취합 */
  const reservations: any[] = useMemo(() => {
    const cands = [
      (sr as any)?.items,
      (sr as any)?.list,
      (sr as any)?.data,
      (sr as any)?.reservations,
      Array.isArray(sr) ? (sr as any) : undefined,
    ];
    const picked = cands.find((x) => Array.isArray(x));
    return Array.isArray(picked)
      ? picked
      : Array.isArray(siteReservations)
      ? siteReservations
      : [];
  }, [sr, siteReservations, version]);

  const reservedIdSet = new Set(reservations.map((it: any) => String(it.id)));
  const reservedPosSet = new Set(
    reservations.map((it: any) => it?.posKey).filter(Boolean)
  );

  if (!shouldRender || !anchorPos || !overlayLatLng) return null;

  type LatLngRO = Readonly<{ lat: number; lng: number }>;
  const anchorPosRO: LatLngRO = { lat: anchorPos.lat, lng: anchorPos.lng };

  /** 핀 모델: effectiveTarget 기준 */
  const pin = effectiveTarget.marker
    ? {
        id: String(effectiveTarget.marker.id),
        title: (effectiveTarget.marker as any).title ?? "이름 없음",
        position: normalizeLL(
          (effectiveTarget.marker as any).position
        ) as LatLngRO,
        kind: (effectiveTarget.marker as any)?.kind ?? "1room",
        isFav: Boolean(
          Object.prototype.hasOwnProperty.call(favById, effectiveTarget.id)
            ? (favById as any)[effectiveTarget.id]
            : (effectiveTarget.marker as any)?.isFav
        ),
        parkingGrade: effectiveTarget.marker.parkingGrade,
        contactMainPhone: effectiveTarget.marker.contactMainPhone,
      }
    : {
        id: "__draft__",
        title: "선택 위치",
        position: anchorPosRO,
        kind: "question",
        isFav: false,
      };

  /** 예약 여부도 effectiveTarget 기준 */
  const posKeyOfEffective = effectiveTarget.marker?.position
    ? toGroupingPosKeyFromPos(
        normalizeLL((effectiveTarget.marker as any).position)
      )
    : undefined;

  const isVisitReservedPin =
    (effectiveTarget.id !== "__draft__" &&
      (reservedIdSet.has(String(effectiveTarget.id)) ||
        optimisticReservedIdsRef.current.has(String(effectiveTarget.id)))) ||
    (!!posKeyOfEffective &&
      (reservedPosSet.has(posKeyOfEffective) ||
        optimisticReservedPosRef.current.has(posKeyOfEffective)));

  /** 상세보기용 id */
  const propertyIdForView =
    effectiveTarget.id && String(effectiveTarget.id).startsWith("__visit__")
      ? "__draft__"
      : effectiveTarget.id ?? "__draft__";

  /** 기본 예약 처리 로직 (draft 생성 포함) */
  const reserveDefault = async (args: ReserveFromMenuArgs) => {
    try {
      // 이미 존재하는 visitId 기반 예약
      if ("visitId" in args) {
        const pinDraftId = Number(args.visitId);
        if (!Number.isFinite(pinDraftId))
          throw new Error("유효하지 않은 visitId");

        optimisticReservedIdsRef.current.add(String(args.visitId));

        const basePosForVisit = (
          effectiveTarget.marker?.position
            ? normalizeLL(effectiveTarget.marker.position)
            : anchorPosRO
        ) as LatLngRO;

        const posKeyForVisit = toGroupingPosKeyFromPos(basePosForVisit);
        if (posKeyForVisit)
          optimisticReservedPosRef.current.add(posKeyForVisit);

        await createSurveyReservation({
          pinDraftId,
          reservedDate: args.dateISO,
        });
        toast({ title: "예약 등록 완료", description: args.dateISO });
        await refetch();
        return;
      }

      // 새 draft 핀 만들고 예약
      const { lat, lng, title, roadAddress, jibunAddress, dateISO } = args;

      const draft = await createPinDraft({
        lat,
        lng,
        addressLine: roadAddress ?? jibunAddress ?? title ?? "선택 위치",
      });

      const pinDraftId =
        typeof draft === "object" && draft && "id" in draft
          ? Number((draft as any).id)
          : Number(draft);
      if (!Number.isFinite(pinDraftId)) throw new Error("임시핀 생성 실패");

      const samePos = effectiveTarget.marker?.position
        ? normalizeLL(effectiveTarget.marker.position)
        : { lat, lng };

      upsertDraftMarker?.({
        id: `__visit__${pinDraftId}`,
        lat: samePos.lat,
        lng: samePos.lng,
        address: roadAddress ?? jibunAddress ?? title ?? null,
        source: "draft",
        kind: "question",
      });

      const posKey = toGroupingPosKeyFromPos(samePos);
      if (posKey) optimisticReservedPosRef.current.add(posKey);

      await createSurveyReservation({ pinDraftId, reservedDate: dateISO });
      toast({ title: "예약 등록 완료", description: dateISO });
      await refetch();

      try {
        const b = mapInstance?.getBounds?.();
        if (b) {
          await refreshViewportPins?.({
            sw: {
              lat: b.getSouthWest().getLat(),
              lng: b.getSouthWest().getLng(),
            },
            ne: {
              lat: b.getNorthEast().getLat(),
              lng: b.getNorthEast().getLng(),
            },
          });
        }
      } catch {
        // ignore
      }
    } catch (e: any) {
      const msg = String(e?.response?.data?.message ?? e?.message ?? e);
      toast({
        title: "예약 등록 실패",
        description:
          msg.includes("duplicate") || msg.includes("이미")
            ? "이미 예약된 임시핀입니다. 기존 예약을 취소하거나 다른 위치를 선택해 주세요."
            : msg,
        variant: "destructive",
      });
      throw e;
    } finally {
      bump();
    }
  };

  /** 🔥 매물 삭제 핸들러: PinContextMenuContainer 타입에 맞게 id를 string | null로 받도록 수정 */
  const handleDeleteProperty = async (id: string | null) => {
    try {
      // id가 null이면 아무 것도 하지 않음
      if (!id) return;

      // 상위에서 내려온 onDeleteProperty는 string만 받는다고 가정 → string으로 변환해서 호출
      await onDeleteProperty?.(String(id));

      const b = mapInstance?.getBounds?.();
      if (b) {
        await refreshViewportPins?.({
          sw: {
            lat: b.getSouthWest().getLat(),
            lng: b.getSouthWest().getLng(),
          },
          ne: {
            lat: b.getNorthEast().getLat(),
            lng: b.getNorthEast().getLng(),
          },
        });
      }
    } catch (e) {
      console.error("[ContextMenuHost:onDeleteProperty] error:", e);
      toast({
        title: "매물 삭제에 실패했어요.",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      onCloseMenu?.();
    }
  };

  return (
    <PinContextMenuContainer
      kakao={kakaoSDK}
      map={mapInstance}
      position={overlayLatLng}
      roadAddress={menuRoadAddr ?? undefined}
      jibunAddress={menuJibunAddr ?? undefined}
      propertyId={propertyIdForView}
      propertyTitle={menuTitle ?? undefined}
      mergedMeta={mergedMeta}
      pin={pin as any}
      onClose={onCloseMenu ?? (() => {})}
      onView={(id) => {
        const sid = String(id);
        if (sid === "__draft__") {
          toast({
            title: "상세보기 불가",
            description: "선택 위치는 등록 후 상세보기를 사용할 수 있어요.",
          });
          onCloseMenu?.();
          return;
        }
        onViewFromMenu?.(sid);
        Promise.resolve().then(() => onCloseMenu?.());
      }}
      onCreate={async (panelArgs?: any) => {
        if (!onCreateFromMenu) return;

        const basePos = effectiveTarget.marker?.position
          ? normalizeLL(effectiveTarget.marker.position)
          : anchorPosRO;

        let fromPinDraftId: number | undefined;
        let createMode: CreateFromPinArgs["createMode"] = "NORMAL";

        if (
          typeof effectiveTarget.id === "string" &&
          effectiveTarget.id.startsWith("__visit__")
        ) {
          const raw = effectiveTarget.id.replace("__visit__", "");
          const n = Number(raw);
          if (!Number.isNaN(n)) {
            fromPinDraftId = n;
            createMode = "FULL_PROPERTY_FROM_RESERVED";
          }
        }

        const visitPlanOnly = !!panelArgs?.visitPlanOnly;

        const args = {
          latFromPin: basePos.lat,
          lngFromPin: basePos.lng,
          fromPinDraftId,
          address:
            panelArgs?.address ??
            menuRoadAddr ??
            menuJibunAddr ??
            (pin as any)?.title ??
            menuTitle ??
            null,
          roadAddress: panelArgs?.roadAddress ?? menuRoadAddr ?? null,
          jibunAddress: panelArgs?.jibunAddress ?? menuJibunAddr ?? null,
          createMode,
          visitPlanOnly,
        };

        onCreateFromMenu(args as any);
      }}
      onPlan={async () => {
        // 1) 메뉴 훅(onPlanFromMenu) 쪽에 먼저 알려주기
        onPlanFromMenu?.({ lat: anchorPosRO.lat, lng: anchorPosRO.lng });

        // 2) 현재 지도 bounds 기준으로 map GET 다시 치도록 트리거
        try {
          const b = mapInstance?.getBounds?.();
          if (b) {
            await refreshViewportPins?.({
              sw: {
                lat: b.getSouthWest().getLat(),
                lng: b.getSouthWest().getLng(),
              },
              ne: {
                lat: b.getNorthEast().getLat(),
                lng: b.getNorthEast().getLng(),
              },
            });
          }
        } catch (e) {
          console.error(
            "[ContextMenuHost:onPlan] refreshViewportPins failed:",
            e
          );
        }

        // 3) 예약 버전 bump + 메뉴 닫기 (기존 동작 유지)
        bump();
        onCloseMenu?.();
      }}
      onReserve={async () => {
        const todayISO = new Date().toISOString().slice(0, 10);
        if (String(effectiveTarget.id).startsWith("__visit__")) {
          const visitId = String(effectiveTarget.id).replace("__visit__", "");
          if (onReserveFromMenu)
            await onReserveFromMenu({ visitId, dateISO: todayISO });
          else await reserveDefault({ visitId, dateISO: todayISO });
        } else {
          const basePos = effectiveTarget.marker?.position
            ? normalizeLL(effectiveTarget.marker.position)
            : anchorPosRO;
          const payload: Extract<ReserveFromMenuArgs, { lat: number }> = {
            lat: basePos.lat,
            lng: basePos.lng,
            title: menuTitle ?? null,
            roadAddress: menuRoadAddr ?? null,
            jibunAddress: menuJibunAddr ?? null,
            dateISO: todayISO,
          };
          if (onReserveFromMenu) await onReserveFromMenu(payload);
          else await reserveDefault(payload);
        }
        onCloseMenu?.();
      }}
      onAddFav={onAddFav ?? (() => {})}
      zIndex={10000}
      isVisitReservedPin={isVisitReservedPin}
      isPlanPin={
        !isVisitReservedPin &&
        (pin as any).kind === "question" &&
        String((pin as any).id) !== "__draft__"
      }
      upsertDraftMarker={upsertDraftMarker}
      refreshViewportPins={refreshViewportPins}
      onDeleteProperty={handleDeleteProperty}
    />
  );
}
