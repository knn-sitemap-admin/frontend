"use client";

import { useEffect } from "react";

export function useRestoreClosedBubbles(
  isReady: boolean,
  map: any,
  selectedKey: string | null,
  safeLabelMax: number,
  labelOvRef: React.MutableRefObject<Record<string, any>>,
  hitboxOvRef: React.MutableRefObject<Record<string, any>>,
  forceHideAll: boolean
) {
  useEffect(() => {
    if (!isReady || forceHideAll) return;
    if (selectedKey != null) return;
    const level = map.getLevel();
    if (level > safeLabelMax) return;

    Object.values(labelOvRef.current).forEach((ov: any) => ov.setMap(map));
    Object.values(hitboxOvRef.current).forEach((ov: any) => ov.setMap(map));
  }, [isReady, map, selectedKey, safeLabelMax, forceHideAll]);
}
