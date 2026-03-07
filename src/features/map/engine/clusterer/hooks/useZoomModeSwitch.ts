"use client";

import { useEffect } from "react";
import { applyMode } from "../applyMode";
import type { KakaoDeps, RefsBag } from "../clusterer.types";

export function useZoomModeSwitch(
  isReady: boolean,
  kakao: any,
  map: any,
  refs: RefsBag,
  selectedKey: string | null,
  safeLabelMax: number,
  clusterMinLevel: number,
  forceHideAll: boolean
) {
  useEffect(() => {
    if (!isReady) return;
    const deps: KakaoDeps = { kakao, map };
    const state = { selectedKey, safeLabelMax, clusterMinLevel, forceHideAll };
    const handler = () => applyMode(deps, refs, state);
    kakao.maps.event.addListener(map, "zoom_changed", handler);
    handler();
    return () =>
      kakao?.maps?.event?.removeListener?.(map, "zoom_changed", handler);
  }, [isReady, kakao, map, refs, selectedKey, safeLabelMax, clusterMinLevel, forceHideAll]);
}
