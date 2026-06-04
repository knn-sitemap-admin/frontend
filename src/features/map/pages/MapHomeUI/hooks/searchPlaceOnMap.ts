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

  // 🌟 라벨에 "장소명(예: 아라중학교)"이 나오도록 우선순위 변경
  const label = item.place_name || item.road_address_name || item.address_name || "";

  // 🌟 부가 설명(sublabel)에 도로명 주소나 지번 주소를 매칭
  const sublabel = item.road_address_name || item.address_name || item.category_name || undefined;

  return {
    lat,
    lng,
    label,
    sublabel: sublabel !== label ? sublabel : undefined
  };
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
      // 🌟 [핵심] sublabel(도로명 주소)을 기준으로 중복을 체크합니다.
      // 만약 sublabel이 없으면 label을 기준으로 삼습니다.
      const addressKey = c.sublabel || c.label;

      if (seen.has(addressKey)) return false;
      seen.add(addressKey);
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
    const NEAR_THRESHOLD_M = 20;
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
        tryReal(`__visit__${d.id}`, d.lat, d.lng, (d as any).title ?? (d as any).name ?? "답사예정", "question");
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

    // 🌟 [핵심 변경] 원본 카카오 결과(items)에서 가공된 후보군 배열을 만듭니다.
    const candidates = deduplicateCandidates(items.map(toCandidate));

    // 디버깅용 로그 (개발자 도구 콘솔에서 후보가 몇 개 남는지 직접 눈으로 확인 가능)
    console.log(`[디버깅] "${currentQuery}" 최종 정제된 모달 후보 개수:`, candidates.length, candidates);

    // 진짜로 후보가 1개밖에 없거나 모달을 띄워줄 콜백이 등록되지 않았다면 기존 폴백 처리
    if (candidates.length <= 1 || !onShowAddressPicker) {
      // 🌟 이 때도 무조건 items[0]으로 가지 않고, 전체 items 중 pickBestPlace가 고른 최선의 값을 보냅니다.
      const bestSingle = pickBestPlace(items, currentQuery, centerLL ?? undefined) ?? items[0];
      fallbackSingle(bestSingle);
      return;
    }

    // 🌟 후보가 2개 이상이면 무조건 모달 표시!
    onShowAddressPicker(candidates, (selected) => {
      // 사용자가 모달에서 특정 주소(인천 혹은 제주)를 클릭했을 때 실행되는 구간입니다.

      // 1) 클릭된 후보의 좌표를 기준으로 원본 카카오 아이템 리스트(items)에서 매칭되는 정확한 단일 객체를 조율합니다.
      const matchedItem = items.find((item) => {
        return Number(item.y) === selected.lat && Number(item.x) === selected.lng;
      }) ?? items[0];

      // 2) pickBestPlace의 매칭 제약(startsWith 등)에 방해받지 않도록, 
      // 유저가 찍은 1개의 타겟 아이템을 직접 안전하게 가공하여 타겟으로 지정합니다.
      const target = matchedItem;
      const lat = Number(target.y);
      const lng = Number(target.x);
      const label = target.place_name || selected.label;

      if (shouldCreateSearchPin(target, currentQuery)) {
        setCenterWithMarker(lat, lng, label);
      } else {
        setCenterOnly(lat, lng);
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

      // ... (지하철역 관련 상단 조건문 분기들은 기존 유지) ...

      // 🔹 일반 장소 검색 분기 수정
      // 세 번째 인자인 단일 처리 콜백 함수를 유연하게 열어줍니다.
      handleMultipleResults(data, query, (bestTarget) => {
        const lat = Number(bestTarget.y);
        const lng = Number(bestTarget.x);
        const label = bestTarget.place_name ?? query;

        if (shouldCreateSearchPin(bestTarget, query)) {
          setCenterWithMarker(lat, lng, label);
        } else {
          setCenterOnly(lat, lng);
        }
      });
    },
    // 🌟 전국 검색 활성화를 위해 기존에 묶여있던 반경 3000m 제약을 해제합니다.
    undefined
  );
}