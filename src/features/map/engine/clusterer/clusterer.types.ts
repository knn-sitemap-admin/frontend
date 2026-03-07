import type { PinKind } from "@/features/pins/types";

export type ClustererWithLabelsOptions = {
  labelMaxLevel?: number;
  clusterMinLevel?: number;
  onMarkerClick?: (id: string) => void;
  fitToMarkers?: boolean;
  labelGapPx?: number;
  hitboxSizePx?: number;
  defaultPinKind?: PinKind;
  hideLabelForId?: string | null;
  forceHideAll?: boolean;
};

export type KakaoDeps = {
  kakao: any;
  map: any;
};

export type RefsBag = {
  markerObjsRef: React.MutableRefObject<Record<string, any>>;
  markerClickHandlersRef: React.MutableRefObject<
    Record<string, ((...a: any[]) => void) | null>
  >;
  labelOvRef: React.MutableRefObject<Record<string, any>>;
  hitboxOvRef: React.MutableRefObject<Record<string, any>>;
  clustererRef: React.MutableRefObject<any>;
  onMarkerClickRef: React.MutableRefObject<((id: string) => void) | undefined>;
};

export type SelectionState = {
  selectedKey: string | null;
  safeLabelMax: number;
  clusterMinLevel: number;
  forceHideAll: boolean;
};
