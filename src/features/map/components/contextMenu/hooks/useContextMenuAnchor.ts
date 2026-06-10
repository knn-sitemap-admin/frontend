"use client";

import { useEffect, useMemo, useState } from "react";

import {
  normalizeLL,
  toGroupingPosKeyFromPos,
} from "../../../shared/utils/coords";
import { useLabelMaskOnMenuOpen } from "./useLabelMaskOnMenuOpen";
import { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import { LatLng } from "@/lib/geo/types";

export type EffectiveTarget = {
  id: string;
  marker?: MapMarker;
};

type UseContextMenuAnchorArgs = {
  open: boolean;
  kakaoSDK: any;
  mapInstance: any;
  menuAnchor?: LatLng | null;
  menuTargetId?: string | number | null;
  visibleMarkers: MapMarker[];
};

/**
 * - anchorBase / underlyingMarker / effectiveTarget / anchorPos 계산
 * - center 이동 완료(idleReady) 감시
 * - 라벨 마스크/디버그 로그 처리
 * - overlayLatLng / shouldRender 반환
 */
export function useContextMenuAnchor({
  open,
  kakaoSDK,
  mapInstance,
  menuAnchor,
  menuTargetId,
  visibleMarkers,
}: UseContextMenuAnchorArgs) {
  const targetPin = useMemo(
    () =>
      menuTargetId
        ? visibleMarkers.find((m) => String(m.id) === String(menuTargetId))
        : undefined,
    [menuTargetId, visibleMarkers]
  );

  /** 1) 앵커 후보: menuAnchor 우선, 없으면 클릭된 핀 좌표 */
  const anchorBase = useMemo(() => {
    if (menuAnchor) return { lat: menuAnchor.lat, lng: menuAnchor.lng };
    if (menuTargetId && targetPin?.position) {
      const p = normalizeLL((targetPin as any).position);
      return { lat: p.lat, lng: p.lng };
    }
    return null;
  }, [menuAnchor, menuTargetId, targetPin]);

  /** 2) 주소검색 보정: 앵커 후보 아래 ‘실제 등록핀’ 탐색 */
  const underlyingMarker = useMemo(() => {
    if (!anchorBase) return undefined;

    const isDraftLike = (id: any) =>
      typeof id === "string" &&
      (id.startsWith("__draft__") || id.startsWith("__visit__"));

    // 2-1) posKey(소수 5자리) 완전일치
    const key = toGroupingPosKeyFromPos(anchorBase);
    let cand = visibleMarkers.find((m) => {
      if (isDraftLike(m.id)) return false;
      const p = normalizeLL((m as any).position);
      return toGroupingPosKeyFromPos(p) === key;
    });
    if (cand) return cand;

    // 2-2) 근접 스냅 로직 제거 (검색 좌표에 엉뚱한 매물 팝업 방지)
    return undefined;
  }, [visibleMarkers, anchorBase]);

  /** 3) effective target: 클릭된 핀 있으면 그것, 없으면 underlying 등록핀, 없으면 draft */
  const effectiveTarget: EffectiveTarget = useMemo(() => {
    // 1) 내가 명시적으로 클릭한 대상이 검색이 아닌 어떤 "존재하는" 핀(실매물 혹은 답사예정 "__visit__")이라면 그걸 그대로 쓴다.
    // 데이터 로딩 전이라 targetPin이 아직 없더라도, ID를 유지해야 순간적으로 '답사예정지 등록' 모달로 렌더링되는 깜빡임을 방지함.
    if (menuTargetId) {
      const idStr = String(menuTargetId);
      if (idStr !== "__draft__" && idStr !== "__search__") {
        return { id: idStr, marker: targetPin as MapMarker | undefined };
      }
    }

    // 2) 빈 곳 클릭(__draft__)이나 임시검색핀(__search__)인데, 반경 20m 내에 실제 매물이 있다면 스냅
    if (underlyingMarker) {
      return { id: String(underlyingMarker.id), marker: underlyingMarker };
    }

    // 3) 스냅할 대상도 없으면 당초 클릭했던 핀(예: __draft__, __search__) 유지
    if (menuTargetId) {
      return { id: String(menuTargetId), marker: targetPin as MapMarker | undefined };
    }

    return { id: "__new__", marker: undefined };
  }, [menuTargetId, targetPin, underlyingMarker]);

  /**
   * 4) 최종 앵커:
   *    - 가능한 경우 항상 "실제 타겟 핀의 좌표"를 기준으로 사용
   *    - 아직 핀이 없고 검색 좌표만 있을 때는 anchorBase 사용
   */
  const anchorPos = useMemo<LatLng | null>(() => {
    if (effectiveTarget.marker?.position) {
      const p = normalizeLL((effectiveTarget.marker as any).position);
      return { lat: p.lat, lng: p.lng };
    }
    return anchorBase;
  }, [effectiveTarget.marker, anchorBase]);

  const [idleReady, setIdleReady] = useState(false);

  // center가 anchorPos 근처까지 이동 완료되면 ready
  useEffect(() => {
    if (!open || !mapInstance || !kakaoSDK || !anchorPos) {
      setIdleReady(false);
      return;
    }

    let stopped = false;
    setIdleReady(false);

    // 위경도 차이 제곱합 기준 (0.0001 ≈ 대략 10m 근처)
    const TH = 0.0001;
    const TH2 = TH * TH;

    const checkCenter = () => {
      if (stopped) return;

      try {
        const center = mapInstance.getCenter?.();
        if (center) {
          const dx = center.getLat() - anchorPos.lat;
          const dy = center.getLng() - anchorPos.lng;
          const d2 = dx * dx + dy * dy;

          if (d2 <= TH2) {
            setIdleReady(true);
            stopped = true;
            return;
          }
        }
      } catch {
        // center 못 가져와도 계속 시도
      }

      requestAnimationFrame(checkCenter);
    };

    // 안전장치: 애니메이션이 너무 길어도 120ms 안에는 강제로 띄우기
    const timeoutId = window.setTimeout(() => {
      if (!stopped) {
        setIdleReady(true);
        stopped = true;
      }
    }, 120);

    requestAnimationFrame(checkCenter);

    return () => {
      stopped = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, mapInstance, kakaoSDK, anchorPos?.lat, anchorPos?.lng]);

  const shouldRender =
    !!open && !!mapInstance && !!kakaoSDK && !!anchorPos && idleReady;

  // 디버그 로그
  useEffect(() => {
    if (!shouldRender || !anchorPos) return;

    const draftMarkerPos =
      effectiveTarget.marker &&
      (effectiveTarget.marker as any).kind === "question"
        ? normalizeLL((effectiveTarget.marker as any).position)
        : null;
  }, [
    shouldRender,
    anchorPos?.lat,
    anchorPos?.lng,
    anchorBase?.lat,
    anchorBase?.lng,
    menuTargetId,
    effectiveTarget.id,
    targetPin,
    underlyingMarker,
    visibleMarkers,
  ]);

  // ★ open 기준 라벨 마스크
  useLabelMaskOnMenuOpen({
    open: shouldRender,
    map: mapInstance,
    kakaoSDK,
    anchor: anchorPos,
    radius: 240,
  });

  /** 컨텍스트 메뉴가 붙을 좌표: 항상 anchorPos 그대로 사용 */
  const overlayLatLng = useMemo(() => {
    if (!anchorPos || !kakaoSDK?.maps) return null;
    return new kakaoSDK.maps.LatLng(anchorPos.lat, anchorPos.lng);
  }, [anchorPos?.lat, anchorPos?.lng, kakaoSDK]);

  return {
    anchorPos,
    overlayLatLng,
    effectiveTarget,
    shouldRender,
  };
}
