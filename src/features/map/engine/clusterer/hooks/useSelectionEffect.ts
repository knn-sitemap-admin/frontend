"use client";

import { useEffect, useRef } from "react";
import { DRAFT_ID, SELECTED_Z } from "../overlays/overlayStyles";

export function useSelectionEffect(
  isReady: boolean,
  kakao: any,
  map: any,
  selectedKey: string | null,
  safeLabelMax: number,
  clusterMinLevel: number,
  clustererRef: React.MutableRefObject<any>,
  labelOvRef: React.MutableRefObject<Record<string, any>>,
  hitboxOvRef: React.MutableRefObject<Record<string, any>>,
  markerObjsRef: React.MutableRefObject<Record<string, any>>,
  forceHideAll: boolean
) {
  const prevSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || forceHideAll) return;
    const level = map.getLevel();
    const prevId = prevSelectedIdRef.current;

    if (level <= safeLabelMax) {
      Object.entries(labelOvRef.current).forEach(([id, ov]: any[]) => {
        ov.setMap(selectedKey && id === selectedKey ? null : map);
      });
      Object.entries(hitboxOvRef.current).forEach(([id, ov]: any[]) => {
        ov.setMap(selectedKey && id === selectedKey ? null : map);
      });

      if (prevId && prevId !== selectedKey) {
        labelOvRef.current[prevId]?.setMap(map);
        hitboxOvRef.current[prevId]?.setMap(map);
      }

      if (selectedKey) {
        const mk = markerObjsRef.current[selectedKey];
        mk?.setMap?.(map);
        mk?.setZIndex?.(SELECTED_Z);
      }

      prevSelectedIdRef.current = selectedKey;
      return;
    }

    if (level >= clusterMinLevel) {
      const clusterer = clustererRef.current;
      if (prevId && prevId !== selectedKey) {
        const prevMk = markerObjsRef.current[prevId];
        try {
          prevMk?.setMap?.(null);
          clusterer?.addMarker?.(prevMk);
        } catch {}
      }
      if (selectedKey) {
        const sel = markerObjsRef.current[selectedKey];
        try {
          clusterer?.removeMarker?.(sel);
        } catch {}
        sel?.setMap?.(map);
        sel?.setZIndex?.(SELECTED_Z);
      }

      const draftMk = markerObjsRef.current[DRAFT_ID];
      if (draftMk) {
        try {
          clusterer?.removeMarker?.(draftMk);
        } catch {}
        draftMk.setMap(map);
        draftMk.setZIndex(SELECTED_Z + 100);
      }

      clusterer?.redraw?.();
      prevSelectedIdRef.current = selectedKey;
      return;
    }

    prevSelectedIdRef.current = selectedKey;
  }, [isReady, kakao, map, selectedKey, safeLabelMax, clusterMinLevel, forceHideAll]);
}
