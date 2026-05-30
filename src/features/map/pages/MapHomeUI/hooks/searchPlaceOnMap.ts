"use client";
import type { MutableRefObject } from "react";
import {
  parseStationAndExit,
  pickBestStation,
  pickBestExitStrict,
  pickBestPlace,
  shouldCreateSearchPin,
} from "../lib/searchUtils";
import type { PinKind } from "@/features/pins/types";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import { mapBadgeToPinKind } from "@/features/properties/lib/badge";
import { getDisplayPinKind } from "@/features/pins/lib/getDisplayPinKind";
import { distM } from "@/features/map/poi/lib/geometry";
import { hideLabelsAround } from "@/features/map/engine/overlays/labelRegistry";
import {
  isTooBroadKeyword,
  getBroadKeywordZoomLevel,
} from "@/features/map/shared/utils/isTooBroadKeyword";

// 🔹 주소 선택 모달에 전달되는 후보 아이템 타입
export type AddressCandidate = {
  lat: number;
  lng: number;
  /** 표시용 라벨 (도로명 or 지번) */
  label: string;
  /** 부가 설명 (카테고리, 지번 등) — 없으면 undefined */
  sublabel?: string;
};

type SearchDeps = {
  kakaoSDK: any;
  mapInstance: any;
  effectiveServerPoints: any[];
  effectiveServerDrafts: any[];
  localDraftMarkers: MapMarker[];
  upsertDraftMarker: (m: {
    id: string | number;
    lat: number;
    lng: number;
    address?: string | null;
    source?: "geocode" | "search" | "draft";
    kind?: PinKind;
  }) => void;
  clearTempMarkers: () => void;
  onSubmitSearch?: (q: string) => void;
  onOpenMenu?: (args: {
    position: { lat: number; lng: number };
    propertyId: string | number;
    propertyTitle: string;
    pin?: { kind: PinKind; isFav: boolean };
  }) => void;
  onChangeHideLabelForId?: (id?: string) => void;
  lastSearchCenterRef: MutableRefObject<{ lat: number; lng: number } | null>;
  onMarkerClick?: (id: string | number) => void;

  /**
   * 🔹 NEW — 검색 결과가 여러 후보일 때 호출됩니다.
   * 호출처는 모달을 띄운 뒤, 사용자가 선택한 candidate로
   *   `onCandidateSelected(candidate)` 를 호출해야 합니다.
   *
   * @param candidates  선택 가능한 주소 후보 목록 (2개 이상)
   * @param onCandidateSelected  모달에서 사용자가 선택했을 때 호출할 콜백
   */
  onShowAddressPicker?: (
    candidates: AddressCandidate[],
    onCandidateSelected: (candidate: AddressCandidate) => void
  ) => void;
};

// ─────────────────────────────────────────────────────────
// 헬퍼: 카카오 Places/Geocoder 결과 → AddressCandidate 변환
// ─────────────────────────────────────────────────────────
function toCandidate(item: any): AddressCandidate {
  const lat = Number(item.y);
  const lng = Number(item.x);
  const label =
    item.road_address_name ||
    item.road_address?.address_name ||
    item.address_name ||
    item.address?.address_name ||
    item.place_name ||
    "";
  const sublabel =
    item.category_name ||
    item.address_name ||
    item.place_name ||
    undefined;
  return { lat, lng, label, sublabel: sublabel !== label ? sublabel : undefined };
}

/**
 * 🔹 여러 결과를 '보여줄 만한' 후보 리스트로 정제합니다.
 * - 중복 좌표(소수점 4자리 기준) 제거
 * - label이 비어있는 항목 제거
 * - 최대 MAX_CANDIDATES개로 제한
 */
const MAX_CANDIDATES = 7;

function deduplicateCandidates(candidates: AddressCandidate[]): AddressCandidate[] {
  const seen = new Set<string>();
  return candidates
    .filter((c) => c.label.trim().length > 0)
    .filter((c) => {
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CANDIDATES);
}

// ─────────────────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────────────────
export async function searchPlaceOnMap(text: string, deps: SearchDeps) {
  const {
    kakaoSDK,
    mapInstance,
    effectiveServerPoints,
    effectiveServerDrafts,
    localDraftMarkers,
    upsertDraftMarker,
    clearTempMarkers,
    onSubmitSearch,
    onOpenMenu,
    onChangeHideLabelForId,
    lastSearchCenterRef,
    onMarkerClick,
    onShowAddressPicker, // 🔹 NEW
  } = deps;

  const query = text.trim();
  if (!query || !kakaoSDK || !mapInstance) return;

  onSubmitSearch?.(query);

  // 0) 광역 키워드
  if (isTooBroadKeyword(query)) {
    const geocoder = new kakaoSDK.maps.services.Geocoder();
    geocoder.addressSearch(query, (res: any[], status: string) => {
      if (status === kakaoSDK.maps.services.Status.OK && res?.[0]) {
        const r0 = res[0];
        const lat = Number(r0.y);
        const lng = Number(r0.x);
        const coords = new kakaoSDK.maps.LatLng(lat, lng);
        const zoomLevel = getBroadKeywordZoomLevel(query);
        mapInstance.setCenter(coords);
        mapInstance.setLevel(zoomLevel);
        clearTempMarkers?.();
        onChangeHideLabelForId?.(undefined);
      } else {
        console.warn("[searchPlaceOnMap] failed to geo-locate broad keyword", query);
      }
    });
    return;
  }

  const setCenterOnly = (lat: number, lng: number) => {
    const ll = new kakaoSDK.maps.LatLng(lat, lng);
    mapInstance.setCenter(ll);
    mapInstance.setLevel(3);
  };

  const runAfterIdle = (fn: () => void) => {
    if (!kakaoSDK || !mapInstance || !(kakaoSDK as any).maps?.event) {
      fn();
      return;
    }
    try {
      const event = (kakaoSDK as any).maps.event;
      let fired = false;
      const listener = event.addListener(mapInstance, "idle", () => {
        if (fired) return;
        fired = true;
        event.removeListener(listener);
        fn();
      });
      setTimeout(() => {
        if (fired) return;
        fired = true;
        event.removeListener(listener);
        fn();
      }, 400);
    } catch {
      fn();
    }
  };

  const setCenterWithMarker = async (lat: number, lng: number, label?: string | null) => {
    const NEAR_THRESHOLD_M = 800;
    type RealAroundPin = {
      id: string;
      lat: number;
      lng: number;
      title?: string | null;
      kind?: PinKind;
    };

    try {
      const ll = new kakaoSDK.maps.LatLng(lat, lng);
      mapInstance.setCenter(ll);
      mapInstance.setLevel(3);
    } catch { }

    const findBestRealAround = (): RealAroundPin | null => {
      let bestReal: RealAroundPin | null = null;
      let bestDist = Infinity;
      const tryReal = (
        id: string | number,
        plat: number,
        plng: number,
        title?: string | null,
        kind?: PinKind
      ) => {
        const d = distM(lat, lng, plat, plng);
        if (d <= NEAR_THRESHOLD_M && d < bestDist) {
          bestDist = d;
          bestReal = { id: String(id), lat: plat, lng: plng, title, kind };
        }
      };
      (effectiveServerPoints ?? []).forEach((p: any) => {
        const baseKind = mapBadgeToPinKind(p.badge, p.isCompleted);
        const displayKind = getDisplayPinKind(baseKind, p.ageType ?? null);
        const kind = (displayKind ?? baseKind ?? "1room") as PinKind;
        tryReal(p.id, p.lat, p.lng, (p as any).title ?? (p as any).name ?? null, kind);
      });
      (effectiveServerDrafts ?? []).forEach((d: any) => {
        tryReal(d.id, d.lat, d.lng, (d as any).title ?? (d as any).name ?? "답사예정", "question");
      });
      localDraftMarkers.forEach((m: any) => {
        const idStr = String(m.id);
        if (!idStr.startsWith("__visit__")) return;
        const pos = m.position;
        if (!pos) return;
        tryReal(idStr, pos.lat, pos.lng, m.title ?? null, "question");
      });
      return bestReal;
    };

    let bestReal = findBestRealAround();
    if (!bestReal && kakaoSDK && mapInstance?.getLevel) {
      try {
        const level = mapInstance.getLevel();
        const center = mapInstance.getCenter();
        mapInstance.setLevel(level + 1, { animate: false });
        mapInstance.setLevel(level, { animate: false });
        mapInstance.setCenter(center);
      } catch { }
      bestReal = findBestRealAround();
    }

    if (bestReal) {
      const { id, lat: realLat, lng: realLng, title: realTitle, kind } = bestReal;
      const title = realTitle ?? label ?? "선택 위치";
      const pinKind: PinKind = (kind ?? "question") as PinKind;
      runAfterIdle(() => {
        clearTempMarkers();
        lastSearchCenterRef.current = { lat: realLat, lng: realLng };
        try {
          if (mapInstance) hideLabelsAround(mapInstance, realLat, realLng, 56);
        } catch (e) {
          console.warn("[searchPlaceOnMap] hideLabelsAround error", e);
        }
        onChangeHideLabelForId?.(String(id));
        onOpenMenu?.({
          position: { lat: realLat, lng: realLng },
          propertyId: id,
          propertyTitle: title,
          pin: { kind: pinKind, isFav: false },
        });
        onMarkerClick?.(id);
      });
      return;
    }

    const hasRealNow =
      (effectiveServerPoints ?? []).some((p: any) => distM(lat, lng, p.lat, p.lng) <= NEAR_THRESHOLD_M) ||
      (effectiveServerDrafts ?? []).some((d: any) => distM(lat, lng, d.lat, d.lng) <= NEAR_THRESHOLD_M);
    if (hasRealNow) return;

    clearTempMarkers();
    lastSearchCenterRef.current = { lat, lng };
    const id = "__search__";
    const openMenu = () => {
      onOpenMenu?.({
        position: { lat, lng },
        propertyId: id,
        propertyTitle: label ?? query ?? "선택 위치",
        pin: { kind: "question", isFav: false },
      });
      onChangeHideLabelForId?.(id);
    };
    if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
      window.requestAnimationFrame(openMenu);
    } else {
      setTimeout(openMenu, 0);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 🔹 NEW: 여러 결과 → 모달 또는 단일 처리
  // ─────────────────────────────────────────────────────────
  /**
   * items: 카카오 Places/Geocoder 원본 배열
   * fallbackSingle: onShowAddressPicker가 없거나 후보가 1개일 때 사용할 단일 처리 함수
   */
  const handleMultipleResults = (
    items: any[],
    currentQuery: string,
    fallbackSingle: (item: any) => void
  ) => {
    if (!items?.length) return;

    const candidates = deduplicateCandidates(items.map(toCandidate));

    // 단일이거나 모달 콜백이 없으면 기존 방식
    if (candidates.length <= 1 || !onShowAddressPicker) {
      fallbackSingle(items[0]);
      return;
    }

    // 🔹 모달 표시
    onShowAddressPicker(candidates, (selected) => {
      if (shouldCreateSearchPin(
        { place_name: selected.label, road_address_name: selected.label },
        currentQuery
      )) {
        setCenterWithMarker(selected.lat, selected.lng, selected.label);
      } else {
        setCenterOnly(selected.lat, selected.lng);
      }
    });
  };

  const places = new kakaoSDK.maps.services.Places();
  const geocoder = new kakaoSDK.maps.services.Geocoder();
  const Status = kakaoSDK.maps.services.Status;
  const centerLL = mapInstance.getCenter?.();

  // ─────────────────────────────────────────────────────────
  // 주소 검색 폴백 — 🔹 여러 결과 처리 추가
  // ─────────────────────────────────────────────────────────
  const doAddressFallback = () => {
    geocoder.addressSearch(query, (addrRes: any[], addrStatus: string) => {
      if (addrStatus !== Status.OK || !addrRes?.length) return;

      // 🔹 여러 후보를 모달로
      handleMultipleResults(addrRes, query, (first) => {
        const { x, y, road_address, address } = first ?? {};
        const lat = Number(y);
        const lng = Number(x);
        const label =
          road_address?.address_name || address?.address_name || query || null;
        const pseudoItem = {
          place_name: query,
          road_address_name: label,
          address_name: label,
          address: { address_name: label },
          category_group_code: "",
        };
        if (shouldCreateSearchPin(pseudoItem, query)) {
          setCenterWithMarker(lat, lng, label);
        } else {
          setCenterOnly(lat, lng);
        }
      });
    });
  };

  const { stationName, exitNo, hasExit } = parseStationAndExit(query);

  // ─────────────────────────────────────────────────────────
  // 장소 키워드 검색 — 🔹 여러 결과 처리 추가
  // ─────────────────────────────────────────────────────────
  places.keywordSearch(
    query,
    (data: any[], status: string) => {
      if (status !== Status.OK || !data?.length) {
        doAddressFallback();
        return;
      }

      // 역 + 출구 검색
      if (hasExit && stationName) {
        const station = pickBestStation(data, stationName);
        if (!station) { doAddressFallback(); return; }
        const stationLL = new kakaoSDK.maps.LatLng(Number(station.y), Number(station.x));
        places.keywordSearch(
          `${station.place_name} 출구`,
          (exitData: any[], exitStatus: string) => {
            if (exitStatus !== Status.OK || !exitData?.length) {
              const lat = stationLL.getLat();
              const lng = stationLL.getLng();
              if (shouldCreateSearchPin(station, query)) {
                setCenterWithMarker(lat, lng, station.place_name);
              } else {
                setCenterOnly(lat, lng);
              }
              return;
            }
            const picked =
              pickBestExitStrict(exitData, stationName, exitNo ?? null, stationLL) ?? station;
            const lat = Number(picked.y);
            const lng = Number(picked.x);
            const label = picked.place_name ?? query;
            if (shouldCreateSearchPin(picked, query)) {
              setCenterWithMarker(lat, lng, label);
            } else {
              setCenterOnly(lat, lng);
            }
          },
          { location: stationLL, radius: 600 }
        );
        return;
      }

      // 역명만 있는 경우
      if (stationName) {
        const target = pickBestStation(data, stationName);
        if (!target) { doAddressFallback(); return; }
        const lat = Number(target.y);
        const lng = Number(target.x);
        const label = target.place_name ?? query;
        if (shouldCreateSearchPin(target, query)) {
          setCenterWithMarker(lat, lng, label);
        } else {
          setCenterOnly(lat, lng);
        }
        return;
      }

      // 🔹 일반 장소 검색: 여러 결과 → 모달
      handleMultipleResults(data, query, (first) => {
        const target = pickBestPlace([first], query, centerLL ?? undefined) ?? first;
        const lat = Number(target.y);
        const lng = Number(target.x);
        const label = target.place_name ?? query;
        if (shouldCreateSearchPin(target, query)) {
          setCenterWithMarker(lat, lng, label);
        } else {
          setCenterOnly(lat, lng);
        }
      });
    },
    centerLL ? { location: centerLL, radius: 3000 } : undefined
  );
}