"use client";

import { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import { MergedMarker } from "../../pages/hooks/useMergedMarkers";
import { CreateFromPinArgs } from "./PinContextMenu/PinContextMenuContainer.types";
import { LatLng } from "@/lib/geo/types";

/** 컨텍스트 메뉴에서 예약 생성 시 전달되는 payload */
export type ReserveFromMenuArgs =
  | { visitId: string; dateISO: string; assigneeId?: number }
  | {
      lat: number;
      lng: number;
      title?: string | null;
      roadAddress?: string | null;
      jibunAddress?: string | null;
      dateISO: string;
      assigneeId?: number;
    };

/** 클릭된 핀 or underlying 핀을 normalized 형태로 표현 */
export type EffectiveTarget = {
  id: string;
  marker?: MapMarker;
};

export type ContextMenuHostProps = {
  open: boolean;
  kakaoSDK: any;
  mapInstance: any;
  menuAnchor?: LatLng | null;
  menuTargetId?: string | number | null;
  menuTitle?: string | null;
  menuRoadAddr?: string | null;
  menuJibunAddr?: string | null;
  visibleMarkers: MapMarker[];
  favById: Record<string, boolean>;
  siteReservations?: any[];
  onCloseMenu?: () => void;
  onViewFromMenu?: (id: string) => void;
  onCreateFromMenu?: (args: CreateFromPinArgs) => void;
  onPlanFromMenu?: (pos: LatLng) => void;
  onReserveFromMenu?: (args: ReserveFromMenuArgs) => Promise<void>;
  onAddFav?: () => void;
  onChangeHideLabelForId?: (id?: string) => void;
  mergedMeta?: MergedMarker[];
  upsertDraftMarker?: (m: {
    id: string | number;
    lat: number;
    lng: number;
    address?: string | null;
    source?: "draft";
    kind?: string;
  }) => void;
  refreshViewportPins?: (bounds: {
    sw: LatLng;
    ne: LatLng;
  }) => Promise<void> | void;
  onDeleteProperty?: (id: string | null) => void;
};
