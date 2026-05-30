"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // 🔹 useState 추가
import type { PinKind } from "@/features/pins/types";
import { distM } from "@/features/map/poi/lib/geometry";
import { useSearchDraftMarkers } from "./useSearchDraftMarkers";
import { searchPlaceOnMap } from "./searchPlaceOnMap";
import type { AddressCandidate } from "./searchPlaceOnMap"; // 🔹 타입 import

type Args = {
  kakaoSDK: any;
  mapInstance: any;
  effectiveServerPoints: any[];
  effectiveServerDrafts: any[];
  onSubmitSearch?: (q: string) => void;
  onOpenMenu?: (args: {
    position: { lat: number; lng: number };
    propertyId: string | number;
    propertyTitle: string;
    pin?: { kind: PinKind; isFav: boolean };
    source?: string;
  }) => void;
  onChangeHideLabelForId?: (id?: string) => void;
  menuOpen: boolean;
  menuAnchor: { lat: number; lng: number } | null;
  hideLabelForId?: string;
  onMarkerClick?: (id: string | number) => void;
};

// 🔹 모달 상태 타입
type AddressPickerState = {
  candidates: AddressCandidate[];
  query: string;
  onSelect: (c: AddressCandidate) => void;
} | null;

function usePlaceSearchOnMap({
  kakaoSDK,
  mapInstance,
  effectiveServerPoints,
  effectiveServerDrafts,
  onSubmitSearch,
  onOpenMenu,
  onChangeHideLabelForId,
  menuOpen,
  menuAnchor,
  hideLabelForId,
  onMarkerClick,
}: Args) {
  const lastSearchCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastQueryRef = useRef<string>(""); // 🔹 모달에 query 전달용

  // 🔹 주소 선택 모달 상태
  const [addressPickerState, setAddressPickerState] = useState<AddressPickerState>(null);

  const {
    localDraftMarkers: rawLocalDraftMarkers,
    upsertDraftMarker,
    replaceTempByRealId,
    clearTempMarkers,
    clearSearchMarkers,
  } = useSearchDraftMarkers();

  const extractLatLng = (obj: any): { lat: number; lng: number } | null => {
    if (!obj) return null;
    if (typeof obj.getLat === "function" && typeof obj.getLng === "function") {
      const lat = obj.getLat();
      const lng = obj.getLng();
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
    const src = obj.position ?? obj.latlng ?? obj;
    const lat = Number(src?.lat);
    const lng = Number(src?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  const safeUpsertDraftMarker = useCallback(
    (marker: any) => {
      const pos = extractLatLng(marker);
      if (!pos) return;
      const { lat, lng } = pos;
      const NEAR_THRESHOLD_M = 800;
      const hasServerPointNear = (effectiveServerPoints ?? []).some((p) => {
        const pp = extractLatLng(p);
        return pp && distM(lat, lng, pp.lat, pp.lng) <= NEAR_THRESHOLD_M;
      });
      const hasServerDraftNear = (effectiveServerDrafts ?? []).some((d) => {
        const dd = extractLatLng(d);
        return dd && distM(lat, lng, dd.lat, dd.lng) <= NEAR_THRESHOLD_M;
      });
      const hasLocalDraftNear = (rawLocalDraftMarkers ?? []).some((m) => {
        const mm = extractLatLng(m);
        return mm && distM(lat, lng, mm.lat, mm.lng) <= NEAR_THRESHOLD_M;
      });
      if (hasServerPointNear || hasServerDraftNear || hasLocalDraftNear) return;
      upsertDraftMarker({ ...marker, lat, lng });
    },
    [upsertDraftMarker, effectiveServerPoints, effectiveServerDrafts, rawLocalDraftMarkers]
  );

  const localDraftMarkers = useMemo(() => {
    const NEAR_THRESHOLD_M = 800;
    return (rawLocalDraftMarkers ?? []).filter((m) => {
      const mm = extractLatLng(m);
      if (!mm) return false;
      const hasServerPointNear = (effectiveServerPoints ?? []).some((p) => {
        const pp = extractLatLng(p);
        return pp && distM(mm.lat, mm.lng, pp.lat, pp.lng) <= NEAR_THRESHOLD_M;
      });
      const hasServerDraftNear = (effectiveServerDrafts ?? []).some((d) => {
        const dd = extractLatLng(d);
        return dd && distM(mm.lat, mm.lng, dd.lat, dd.lng) <= NEAR_THRESHOLD_M;
      });
      return !hasServerPointNear && !hasServerDraftNear;
    });
  }, [rawLocalDraftMarkers, effectiveServerPoints, effectiveServerDrafts]);

  /** 검색 실행 */
  const handleSubmitSearch = useCallback(
    (text: string) => {
      lastQueryRef.current = text; // 🔹 모달 표시용 query 저장
      return searchPlaceOnMap(text, {
        kakaoSDK,
        mapInstance,
        effectiveServerPoints,
        effectiveServerDrafts,
        localDraftMarkers,
        upsertDraftMarker: safeUpsertDraftMarker,
        clearTempMarkers,
        onSubmitSearch,
        onOpenMenu,
        onChangeHideLabelForId,
        lastSearchCenterRef,
        onMarkerClick,
        // 🔹 여러 주소 후보가 있을 때 모달 상태 세팅
        onShowAddressPicker: (candidates, onCandidateSelected) => {
          setAddressPickerState({
            candidates,
            query: lastQueryRef.current,
            onSelect: onCandidateSelected,
          });
        },
      });
    },
    [
      kakaoSDK,
      mapInstance,
      effectiveServerPoints,
      effectiveServerDrafts,
      localDraftMarkers,
      safeUpsertDraftMarker,
      clearTempMarkers,
      onSubmitSearch,
      onOpenMenu,
      onChangeHideLabelForId,
      onMarkerClick,
    ]
  );

  // 🔹 모달 닫기 핸들러
  const closeAddressPicker = useCallback(() => {
    setAddressPickerState(null);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      if (hideLabelForId === "__search__") {
        onChangeHideLabelForId?.(undefined);
      }
      return;
    }
    if (menuAnchor) {
      lastSearchCenterRef.current = { lat: menuAnchor.lat, lng: menuAnchor.lng };
    }
  }, [menuOpen, menuAnchor, hideLabelForId, onChangeHideLabelForId]);

  return {
    localDraftMarkers,
    upsertDraftMarker,
    replaceTempByRealId,
    clearTempMarkers,
    clearSearchMarkers,
    lastSearchCenterRef,
    handleSubmitSearch,
    // 🔹 모달 관련 — 렌더링하는 컴포넌트에서 사용
    addressPickerState,
    closeAddressPicker,
  };
}

export default usePlaceSearchOnMap;