import { PinKind } from "@/features/pins/types";
import { LatLng } from "@/lib/geo/types";

export type MapMarker = {
  id: string;
  position: LatLng;
  name?: string;
  title?: string;
  address?: string;
  kind?: PinKind;
  isNew?: boolean;
  source?: "pin" | "draft";
  pinDraftId?: number | string;
  posKey?: string;
  badge?: string | null;
  isCompleted?: boolean;
};

export type MapMarkerTagged = MapMarker & {
  tag?: "property" | "visit" | "draft";
};
