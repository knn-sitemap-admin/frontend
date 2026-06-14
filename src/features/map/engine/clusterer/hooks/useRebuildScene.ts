"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import type { PinKind } from "@/features/pins/types";

import { buildSceneKey } from "@/features/map/engine/scene/buildSceneKey";
import { firstNonEmpty } from "@/features/map/engine/scene/firstNonEmpty";
import { cleanLabelCandidate } from "@/features/map/engine/scene/cleanLabelCandidate";
import {
  EnrichedMarker,
  enrichMarkers,
} from "@/features/map/engine/scene/enrichMarkers";
import { mountClusterMode } from "../mountClusterMode";
import {
  createHitboxOverlay,
  createLabelOverlay,
  createMarker,
  updateMarkerIcon,
} from "../overlays/pinOverlays";
import { DRAFT_ID, SELECTED_Z, applyOrderBadgeToLabel } from "../overlays/overlayStyles";

type Args = {
  isReady: boolean;
  kakao: any;
  map: any;
  markers: readonly MapMarker[];
  reservationOrderMap: Record<string, number | undefined> | undefined;
  reservationOrderByPosKey?: Record<string, number | undefined>;
  defaultPinKind: PinKind;
  labelGapPx: number;
  hitboxSizePx: number;
  safeLabelMax: number;
  clusterMinLevel: number;
  selectedKey: string | null;
  realMarkersKey: string;
  markerObjsRef: React.MutableRefObject<Record<string, any>>;
  markerClickHandlersRef: React.MutableRefObject<
    Record<string, ((...a: any[]) => void) | null>
  >;
  labelOvRef: React.MutableRefObject<Record<string, any>>;
  hitboxOvRef: React.MutableRefObject<Record<string, any>>;
  clustererRef: React.MutableRefObject<any>;
  onMarkerClickRef: React.MutableRefObject<((id: string) => void) | undefined>;
  forceHideAll: boolean;
};

export function useRebuildScene(args: Args) {
  const {
    isReady,
    kakao,
    map,
    markers,
    reservationOrderMap,
    reservationOrderByPosKey,
    defaultPinKind,
    labelGapPx,
    hitboxSizePx,
    safeLabelMax,
    clusterMinLevel,
    selectedKey,
    realMarkersKey,
    markerObjsRef,
    markerClickHandlersRef,
    labelOvRef,
    hitboxOvRef,
    clustererRef,
    onMarkerClickRef,
    forceHideAll,
  } = args;

  const sceneKey = useMemo(() => buildSceneKey(markers), [markers]);

  // 🔥 [핵심 추가] DOM 파괴/재생성 시에도 예약 순서를 잃어버리지 않도록 React 메모리에 백업
  const lastValidOrderRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isReady) return;

    // ⑤ 지도 상태에 따른 가시성 제어 및 가드 로직
    const level = map.getLevel();

    // [V4 최적화] 지역 클러스터링 모드(forceHideAll)일 때 개별 마커 루프를 스킵하여 성능 확보
    if (forceHideAll) {
      clustererRef.current?.clear?.();
      Object.keys(markerObjsRef.current).forEach((key) => {
        const mk = markerObjsRef.current[key];
        const handler = markerClickHandlersRef.current[key];
        if (mk && handler) kakao.maps.event.removeListener(mk, "click", handler);
        mk?.setMap(null);
        labelOvRef.current[key]?.setMap(null);
        hitboxOvRef.current[key]?.setMap(null);
      });
      markerObjsRef.current = {};
      markerClickHandlersRef.current = {};
      labelOvRef.current = {};
      hitboxOvRef.current = {};
      return; // 루프를 더 이상 돌지 않고 조기 종료
    }

    // ── Diffing 로직 시작 ──────────────────────────────────────
    const nextKeys = new Set<string>();

    // ① enriched 단계 수행
    const enriched: EnrichedMarker[] = enrichMarkers(
      markers,
      reservationOrderMap,
      reservationOrderByPosKey
    );

    // ② posKey 단위로 라벨 1개만 유지하기 위한 준비
    const labelByPos: Record<string, { key: string; isPlan: boolean }> = {};
    const ordered = enriched.sort((a, b) =>
      a.isPlan === b.isPlan ? 0 : a.isPlan ? 1 : -1
    );

    // 우선순위가 높은(isPlan이 true이거나 나중에 나온) 마커를 해당 posKey의 대표 라벨로 설정
    ordered.forEach(({ key, isPlan, posKey }) => {
      if (!posKey) return;
      labelByPos[posKey] = { key, isPlan };
    });

    // 거리 계산 유틸
    const distM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    // ③ 개별 마커 처리 (Diffing)
    ordered.forEach(
      ({ m, key, order, isDraft, isPlan, isAddressOnly, posKey }) => {
        nextKeys.add(key);
        const pos = new kakao.maps.LatLng(m.position.lat, m.position.lng);

        const primaryName =
          firstNonEmpty(
            cleanLabelCandidate((m as any).name),
            cleanLabelCandidate((m as any).propertyName),
            cleanLabelCandidate((m as any).property?.name),
            cleanLabelCandidate((m as any).data?.propertyName)
          ) || "";

        const displayName =
          primaryName ||
          firstNonEmpty(
            cleanLabelCandidate((m as any).property?.title),
            cleanLabelCandidate((m as any).data?.name),
            cleanLabelCandidate(m.title),
            cleanLabelCandidate(String(m.id ?? ""))
          ) ||
          "";

        const isSalesStopped = !!(m as any).isSalesStopped;

        const planText = m.regionLabel;
        const planDisplayName = displayName || planText;
        let labelText = isPlan ? planDisplayName : displayName;

        if (isSalesStopped) {
          labelText = `${labelText} (분양중지)`;
        }

        // ── marker 처리 ──
        let mk = markerObjsRef.current[key];
        if (mk) {
          mk.setPosition(pos);
          updateMarkerIcon(kakao, mk, {
            isDraft,
            key,
            kind: (m.kind ?? defaultPinKind) as PinKind,
            title: labelText,
            badge: m.badge,
            isCompleted: m.isCompleted,
          });
        } else {
          mk = createMarker(kakao, pos, {
            isDraft,
            key,
            kind: (m.kind ?? defaultPinKind) as PinKind,
            title: labelText,
            badge: m.badge,
            isCompleted: m.isCompleted,
          });
          markerObjsRef.current[key] = mk;

          const handler = () => onMarkerClickRef.current?.(key);
          kakao.maps.event.addListener(mk, "click", handler);
          markerClickHandlersRef.current[key] = handler;

          if (key === "__draft__" || key === DRAFT_ID || key.startsWith("__visit__")) {
            mk.setZIndex(-99999);
          }
        }

        // ── label/hitbox 처리 ──
        if (isAddressOnly) {
          // 주소 전용은 라벨 생략 (필요시 히트박스만)
        } else {
          const isRepresentativeLabel = posKey ? labelByPos[posKey]?.key === key : true;

          if (!isRepresentativeLabel) {
            let lb = labelOvRef.current[key];
            if (lb) {
              lb.setMap(null);
              delete labelOvRef.current[key];
            }
          } else {
            let lb = labelOvRef.current[key];

          let safeOrder = order;
          if (typeof safeOrder === "number" && Number.isFinite(safeOrder)) {
            // 정상적인 순서가 들어오면 Ref에 안전하게 백업 (다른 로직에서 참조할 수 있도록 유지)
            lastValidOrderRef.current[key] = safeOrder;
          }

          const isReserved =
            (typeof safeOrder === "number" && Number.isFinite(safeOrder)) ||
            m.draftState === "SCHEDULED";

          if (lb) {
            lb.setPosition(pos);
            const el = lb.getContent?.() as HTMLDivElement | null;
            if (el) {
              const currentOrder = el.dataset.order;
              const currentText = el.dataset.rawTitle;
              const currentSalesStopped = el.dataset.salesStopped;
              const currentReserved = el.dataset.reserved;

              const newOrder = String(safeOrder ?? "");
              const newSalesStopped = String(isSalesStopped);
              const newReserved = String(isReserved);

              if (
                currentOrder !== newOrder ||
                currentText !== String(labelText ?? "") ||
                currentSalesStopped !== newSalesStopped ||
                currentReserved !== newReserved
              ) {
                let bgColor: string | undefined;
                if (isSalesStopped) bgColor = "#111827";
                else if (isReserved) bgColor = "#EF4444";
                else bgColor = "#3B82F6";

                el.style.background = bgColor;
                applyOrderBadgeToLabel(el, labelText, safeOrder);
                el.dataset.order = newOrder;
                el.dataset.rawTitle = String(labelText ?? "");
                el.dataset.salesStopped = newSalesStopped;
                el.dataset.reserved = newReserved;
              }
            }
          } else {
            lb = createLabelOverlay(kakao, pos, labelText, labelGapPx, safeOrder, isReserved, isSalesStopped);
            const el = lb.getContent?.() as HTMLDivElement | null;
            if (el) {
              el.dataset.salesStopped = String(isSalesStopped);
              el.dataset.reserved = String(isReserved);
              el.dataset.order = String(safeOrder ?? "");
              el.dataset.rawTitle = String(labelText ?? "");
            }
            labelOvRef.current[key] = lb;
          }
        }
      }
        let hb = hitboxOvRef.current[key];
        if (hb) {
          hb.setPosition(pos);
        } else {
          hb = createHitboxOverlay(kakao, pos, hitboxSizePx, () => onMarkerClickRef.current?.(key));
          hitboxOvRef.current[key] = hb;
        }
      }
    );

    // ④ 제거된 마커 정리 (Cleanup)
    Object.keys(markerObjsRef.current).forEach((key) => {
      if (!nextKeys.has(key)) {
        const mk = markerObjsRef.current[key];
        const handler = markerClickHandlersRef.current[key];
        if (mk && handler) kakao.maps.event.removeListener(mk, "click", handler);

        mk?.setMap(null);
        labelOvRef.current[key]?.setMap(null);
        hitboxOvRef.current[key]?.setMap(null);

        delete markerObjsRef.current[key];
        delete markerClickHandlersRef.current[key];
        delete labelOvRef.current[key];
        delete hitboxOvRef.current[key];
      }
    });

    // ⑤ 가시성 업데이트
    if (level <= safeLabelMax) {
      clustererRef.current?.clear?.();
      Object.values(markerObjsRef.current).forEach(m => m.setMap(map));
      Object.entries(labelOvRef.current).forEach(([k, l]) => {
        const cleanK = k.replace(/^__visit__/, "");
        l.setMap(k === selectedKey || cleanK === selectedKey ? null : map);
      });
      Object.values(hitboxOvRef.current).forEach(h => h.setMap(map));
    } else if (level >= clusterMinLevel) {
      mountClusterMode({ kakao, map }, { markerObjsRef, markerClickHandlersRef, labelOvRef, hitboxOvRef, clustererRef, onMarkerClickRef }, selectedKey);
    } else {
      Object.values(labelOvRef.current).forEach(l => l.setMap(null));
      clustererRef.current?.clear?.();
      Object.values(markerObjsRef.current).forEach(m => m.setMap(map));
      Object.values(hitboxOvRef.current).forEach(h => h.setMap(map));
    }

    return () => {
      Object.entries(markerClickHandlersRef.current).forEach(
        ([id, handler]) => {
          const mk = markerObjsRef.current[id];
          if (mk && handler) {
            kakao.maps.event.removeListener(mk, "click", handler);
          }
        }
      );
      markerClickHandlersRef.current = {};
      clustererRef.current?.clear?.();
      Object.values(labelOvRef.current).forEach((ov: any) => ov.setMap(null));
      Object.values(hitboxOvRef.current).forEach((ov: any) => ov.setMap(null));
      Object.values(markerObjsRef.current).forEach((mk: any) =>
        mk.setMap(null)
      );
      labelOvRef.current = {};
      hitboxOvRef.current = {};
      markerObjsRef.current = {};
    };
  }, [
    isReady,
    sceneKey,
    realMarkersKey,
    kakao,
    map,
    reservationOrderMap,
    reservationOrderByPosKey,
    defaultPinKind,
    labelGapPx,
    hitboxSizePx,
    safeLabelMax,
    clusterMinLevel,
    selectedKey,
    forceHideAll,
  ]);
}