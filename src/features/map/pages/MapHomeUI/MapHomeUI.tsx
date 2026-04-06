"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";

import { useSidebar as useSidebarCtx, Sidebar } from "@/features/sidebar";

import { useMergedMarkers } from "../hooks/useMergedMarkers";
import MapCanvas from "./components/MapCanvas";
import ModalsHost from "./components/ModalsHost";

import type { PinKind } from "@/features/pins/types";
import type { ListItem, SubListItem } from "@/features/sidebar/types/sidebar";

import { useRoadview } from "@/features/map/hooks/roadview/useRoadview";
import { MapMenuKey } from "@/features/map/components/menu/types/mapMenu.types";
import { NoResultDialog } from "@/features/map/components/NoResultDialog";
import { MapHomeUIProps } from "./mapHomeUI.types";

import { usePlannedDrafts } from "../../hooks/pins/usePlannedDrafts";
import { FilterFab, FilterSearch } from "../../components/filterSearch";

import { useViewModalState } from "./hooks/useViewModalState";
import { usePanelsAndToggles } from "./hooks/usePanelsAndToggles";

/* 🔎 검색 / 필터 훅들 */
import { useFilterSearch } from "./hooks/useFilterSearch";
import { useViewportPinsForMapHome } from "./hooks/useViewportPinsForMapHome";
import { useAfterCreateHandler } from "./hooks/useAfterCreateHandler";
import { useSalePinSearch } from "@/features/map/hooks/search/useSalePinSearch";

/* 👀 지도 포커스 유틸 */
import { focusMapToPosition } from "./lib/viewUtils";
import { TopRegion } from "./components/TopRegion";
import usePlaceSearchOnMap from "./hooks/usePlaceSearchOnMap";
import ContextMenuHost from "../../components/contextMenu/ContextMenuHost";
import { AddressModal } from "../../components/AddressModal";
import { MapDistanceMeasure } from "../../components/MapDistanceMeasure/MapDistanceMeasure";
import { hideLabelsAround } from "../../engine/overlays/labelRegistry";
import { useBounds } from "../../hooks/viewport/useBounds";
import { useBoundsRaw } from "../../hooks/viewport/useBoundsRaw";
import { type Bounds } from "../../shared/types/bounds.type";
import { distM } from "../../poi/lib/geometry";
import { Viewport } from "../hooks/useMapHomeState/mapHome.types";


export function MapHomeUI(props: MapHomeUIProps) {
  const {
    appKey,
    kakaoSDK,
    mapInstance,
    markers,
    fitAllOnce,
    q,
    filter,
    onChangeQ,
    onChangeFilter,
    onSubmitSearch,
    useSidebar,
    setUseSidebar,
    distanceMeasureVisible = false,
    onToggleDistanceMeasure,
    poiKinds,
    onChangePoiKinds,
    menuOpen,
    menuAnchor,
    menuTargetId,
    menuRoadAddr,
    menuJibunAddr,
    menuTitle,
    onCloseMenu,
    onCreateFromMenu,
    onPlanFromMenu,
    onMarkerClick,
    onMapReady,
    onViewportChange,
    createOpen,
    createPinKind,
    draftHeaderPrefill,
    selectedViewItem,
    prefillAddress,
    draftPin,
    selectedPos,
    onSaveViewPatch,
    onDeleteFromView,
    createHostHandlers,
    hideLabelForId,
    onOpenMenu,
    onChangeHideLabelForId,
    onAddFav,
    favById = {},
    onReserveFromMenu,
    onViewFromMenu,
    closeView,
    /** ✅ 숫자로 내려오는 draft id */
    pinDraftId,
    /** ✅ 부모(MapHomeState)에서 내려온 강제 리로드 */
    refetchPins: refetchFromParent,
    /** 하단 카드 높이 ref */
    bottomCardHeightRef,
  } = props;

  const getBoundsLLB = useBounds(kakaoSDK, mapInstance);
  const getBoundsRaw = useBoundsRaw(kakaoSDK, mapInstance);

  const [bounds, setBounds] = useState<(Bounds & { zoom: number }) | null>(null);

  // 🔭 로드뷰
  const {
    roadviewContainerRef,
    roadviewRef,
    visible: roadviewVisible,
    openAtCenter,
    openAt,
    close,
  } = useRoadview({ kakaoSDK, map: mapInstance, autoSync: true });

  // 🔧 패널 / 토글 묶음 훅
  const {
    isDistrictOn,
    rightOpen,
    filterSearchOpen,
    noResultDialogOpen,
    roadviewRoadOn,
    handleSetDistrictOn,
    handleSetRightOpen,
    setFilterSearchOpen,
    setNoResultDialogOpen,
    handleOpenFilterSearch,
    handleToggleSidebar,
    toggleRoadviewRoad,
    rightAreaRef,
    filterAreaRef,
    sidebarAreaRef,
  } = usePanelsAndToggles({
    useSidebar,
    setUseSidebar,
    roadviewVisible,
    closeRoadview: close,
  });

  // 하단 메뉴 카드 ref — ResizeObserver로 실제 높이 측정 (동적 pan 오프셋용)
  const contextMenuWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = contextMenuWrapRef.current;
    if (!el || !bottomCardHeightRef) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height ?? 0;
      (bottomCardHeightRef as React.MutableRefObject<number>).current = h;
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [bottomCardHeightRef]);

  // 지도 빈 곳 클릭 → 주소 모달 (클릭 위치에 띄움)
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalPosition, setAddressModalPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [addressModalPoint, setAddressModalPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const handleMapClickForAddress = useCallback(
    (
      pos: { lat: number; lng: number },
      point?: { x: number; y: number }
    ) => {
      // 레벨 3 초과(약 500m 이상)면 주소 모달 안 열기 — 100m(레벨 3) 이하에서만 동작
      const level = mapInstance?.getLevel?.();
      if (typeof level === "number" && level > 3) return;

      setAddressModalPosition(pos);
      setAddressModalPoint(point ?? null);
      setAddressModalOpen(true);
    },
    [mapInstance]
  );

  // 🔍 필터 검색 상태/로직 (API + bounds 맞추기)
  const {
    searchRes,
    searchLoading,
    searchError,
    handleApplyFilters,
    clearSearch,
  } = useFilterSearch({
    kakaoSDK,
    mapInstance,
    setFilterSearchOpen,
    setNoResultDialogOpen,
  });

  // 🔍 뷰포트 기준 서버 핀 + 검색 결과 머지된 형태
  const {
    pinsLoading,
    pinsError,
    effectiveServerPoints,
    effectiveServerDrafts,
    reloadPins, // ✅ /map 다시 치는 훅
  } = useViewportPinsForMapHome({
    bounds, // mapInstance 대신 bounds 전달
    zoom: bounds?.zoom,
    filter: filter as MapMenuKey,
    searchRes,
  });

  const {
    results: saleResults,
    loading: saleLoading,
    isOpen: saleModalOpen,
    setIsOpen: setSaleModalOpen,
    performSearch: performSaleSearch,
  } = useSalePinSearch();

  const [qSale, setQSale] = useState("");

  // 🔁 메뉴 오픈 핸들러 래핑: 클릭된 핀 id 기준으로 라벨 숨김
  const handleOpenMenuInternal = useCallback(
    (args: {
      position: { lat: number; lng: number };
      propertyId: string | number;
      propertyTitle: string;
      pin?: { kind: PinKind; isFav: boolean };
      // searchPlaceOnMap 쪽에서만 넣는 디버그 필드
      source?: string;
    }) => {
      const idStr = String(args.propertyId);

      // 🔥 임시핀(__search__)이든 실핀이든 "그 핀 id 그대로"
      onChangeHideLabelForId?.(idStr);

      onOpenMenu?.(args);
    },
    [onOpenMenu, onChangeHideLabelForId, hideLabelForId, menuOpen, menuAnchor]
  );

  const handleSelectSalePin = useCallback(
    (item: any) => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      setSaleModalOpen(false);

      // 1) 지도 이동 + 확대 (레벨 2)
      focusMapToPosition({ kakaoSDK, mapInstance, lat, lng, level: 2 });

      // 2) 메뉴 강제 오픈
      const propertyId = item.isDraft ? `__visit__${item.id}` : String(item.id);
      handleOpenMenuInternal({
        position: { lat, lng },
        propertyId,
        propertyTitle: item.name || "매물 정보",
        pin: item.isDraft ? { kind: "question", isFav: false } : undefined,
      });
    },
    [kakaoSDK, mapInstance, setSaleModalOpen, handleOpenMenuInternal]
  );

  // 🔍 상단 장소 검색 + 검색핀 관리
  const {
    localDraftMarkers,
    upsertDraftMarker,
    replaceTempByRealId,
    handleSubmitSearch,
    clearSearchMarkers,
    lastSearchCenterRef,
  } = usePlaceSearchOnMap({
    kakaoSDK,
    mapInstance,
    effectiveServerPoints,
    effectiveServerDrafts,
    onSubmitSearch,
    onOpenMenu: handleOpenMenuInternal,
    onChangeHideLabelForId,
    menuOpen,
    menuAnchor,
    hideLabelForId: hideLabelForId ?? undefined,
    onMarkerClick,
  });

  // --- 뷰포트 변경 처리 ---
  const lastViewportRef = useRef<Viewport | null>(null);

  const isSameViewport = (a: Viewport, b: Viewport) => {
    if (!a || !b) return false;
    const EPS = 1e-6;

    const diff =
      Math.abs(a.leftTop.lat - b.leftTop.lat) +
      Math.abs(a.leftTop.lng - b.leftTop.lng) +
      Math.abs(a.rightBottom.lat - b.rightBottom.lat) +
      Math.abs(a.rightBottom.lng - b.rightBottom.lng);

    return diff < EPS;
  };

  const handleViewportChange = useCallback((v: Viewport) => {
    if (!v) return;

    if (lastViewportRef.current && isSameViewport(lastViewportRef.current, v))
      return;

    lastViewportRef.current = v;

    // 데이터 조회를 위한 영역(bounds) 업데이트
    setBounds({
      swLat: v.leftBottom.lat,
      swLng: v.leftBottom.lng,
      neLat: v.rightTop.lat,
      neLng: v.rightTop.lng,
      zoom: v.zoomLevel,
    });

    // usePlaceSearchOnMap의 기존 로직 유지
    if (lastSearchCenterRef.current) {
      const centerLat = (v.leftTop.lat + v.rightBottom.lat) / 2;
      const centerLng = (v.leftTop.lng + v.rightBottom.lng) / 2;

      const d = distM(
        centerLat,
        centerLng,
        lastSearchCenterRef.current.lat,
        lastSearchCenterRef.current.lng
      );

      const THRESHOLD_M = 300;
      if (d > THRESHOLD_M) {
        clearSearchMarkers();
        lastSearchCenterRef.current = null;
      }
    }

    // 기존 prop 호출 유지
    onViewportChange?.(v);

  }, [onViewportChange, clearSearchMarkers, lastSearchCenterRef]);
  // --- 뷰포트 변경 처리 종료 ---

  // 서버핀 + 로컬 임시핀 merge
  const { mergedWithTempDraft, mergedMeta } = useMergedMarkers({
    localMarkers: useMemo(
      () => [...(markers ?? []), ...localDraftMarkers],
      [markers, localDraftMarkers]
    ),
    serverPoints: effectiveServerPoints,
    serverDrafts: effectiveServerDrafts,
    menuOpen,
    menuAnchor,
    filterKey: filter,
  });

  // 답사 예정 draft 핀 (오렌지/빨강 토글용)
  usePlannedDrafts({ filter, getBounds: getBoundsRaw });

  const handleRoadviewClickOnMap = useCallback(
    (pos: { lat: number; lng: number }) => {
      openAt(pos, { face: pos });
      if (isDistrictOn) {
        handleSetDistrictOn(false);
      }
    },
    [openAt, isDistrictOn, handleSetDistrictOn]
  );

  const toggleRoadview = useCallback(() => {
    if (roadviewVisible) {
      // 로드뷰 패널 닫기 + 오버레이도 끄기
      close();
      if (roadviewRoadOn) toggleRoadviewRoad();
      return;
    }

    // 로드뷰 패널이 닫혀있을 때:
    // 오버레이(파란 도로선)가 꺼져있으면 활성화만 하고 대기
    // → 사용자가 파란 도로를 클릭하면 handleRoadviewClickOnMap에서 열림
    if (!roadviewRoadOn) {
      toggleRoadviewRoad();
    }

    if (isDistrictOn) {
      handleSetDistrictOn(false);
    }
  }, [
    roadviewVisible,
    close,
    roadviewRoadOn,
    toggleRoadviewRoad,
    isDistrictOn,
    handleSetDistrictOn,
  ]);

  const [didInit, setDidInit] = useState(false);

  const handleMapReady = useCallback(
    (api: unknown) => {
      onMapReady?.(api);
      requestAnimationFrame(() => setDidInit(true));
    },
    [onMapReady]
  );

  const activeMenu = (filter as MapMenuKey) ?? "all";

  // --- 마커 컬링 (Slack Culling) ---
  // 메모리에 캐시된 수천 개의 마커 중, 현재 가시 영역(+ 여유분) 내에 있는 것만 필터링합니다.
  // 지도가 미세하게 움직일 때는 필터링을 다시 하지 않아 렌더링 성능을 확보합니다.
  const [culledMarkers, setCulledMarkers] = useState<typeof mergedWithTempDraft>([]);
  const lastCullingBoundsRef = useRef<typeof bounds | null>(null);
  const lastMergedWithTempDraftRef = useRef<typeof mergedWithTempDraft | null>(null);

  useEffect(() => {
    if (!bounds) {
      setCulledMarkers(mergedWithTempDraft);
      return;
    }

    // 1) [V5 최적화] 지역 클러스터링 모드(줌 8 이상)일 때는 UI 단의 필터링을 생략(Bypass)합니다.
    // 이를 통해 드래그 시 CPU 부하를 제거하고, 클러스터 숫자가 지역 전체 합계로 나오게 합니다.
    if (bounds.zoom >= 8) {
      setCulledMarkers(mergedWithTempDraft);
      lastCullingBoundsRef.current = bounds;
      return;
    }

    // 2) 일반 마커 모드(줌 7 이하)에서는 기존 Slack Culling 로직을 수행합니다.
    const { swLat, swLng, neLat, neLng } = bounds;
    const last = lastCullingBoundsRef.current;

    const latSpan = neLat - swLat;
    const lngSpan = neLng - swLng;

    const isDataChanged = lastMergedWithTempDraftRef.current !== mergedWithTempDraft;

    const shouldUpdate = !last ||
      isDataChanged ||
      Math.abs(swLat - last.swLat) > latSpan * 0.05 ||
      Math.abs(swLng - last.swLng) > lngSpan * 0.05 ||
      Math.abs(latSpan - (last.neLat - last.swLat)) > latSpan * 0.1 ||
      last.zoom >= 8; // 모드 전환 시 즉시 업데이트

    if (shouldUpdate || culledMarkers.length === 0) {
      const latMargin = latSpan * 0.1;
      const lngMargin = lngSpan * 0.1;

      const minLat = swLat - latMargin;
      const maxLat = neLat + latMargin;
      const minLng = swLng - lngMargin;
      const maxLng = neLng + lngMargin;

      const filtered = mergedWithTempDraft.filter((m) => {
        const { lat, lng } = m.position;
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      });

      setCulledMarkers(filtered);
      lastCullingBoundsRef.current = bounds;
      lastMergedWithTempDraftRef.current = mergedWithTempDraft;
    }
  }, [mergedWithTempDraft, bounds]);

  // ✅ 메뉴가 열려 있으면 menuTargetId 기준으로 라벨 숨김 강제
  const effectiveHideLabelForId = useMemo(() => {
    if (menuOpen && menuTargetId != null) {
      return String(menuTargetId);
    }
    return hideLabelForId ?? undefined;
  }, [menuOpen, menuTargetId, hideLabelForId]);

  // 🔄 메뉴가 열린 상태에서 마커 세트가 바뀌면 앵커 주변 라벨 다시 숨기기
  useEffect(() => {
    if (!menuOpen || !menuAnchor) return;
    if (!kakaoSDK || !mapInstance) return;

    try {
      hideLabelsAround(mapInstance, menuAnchor.lat, menuAnchor.lng, 56);
    } catch (e) { }
  }, [menuOpen, menuAnchor, culledMarkers, kakaoSDK, mapInstance]);

  // 🔄 /map 다시 치도록 하는 함수: 이제는 훅의 reloadPins 사용
  const refreshViewportPins = useCallback(async () => {
    await reloadPins?.();
    await refetchFromParent?.({ draftState: "all" });
  }, [reloadPins, refetchFromParent]);

  const {
    viewOpenLocal,
    selectedViewForModal,
    handleViewFromMenu,
    handleOpenViewAfterCreate,
    handleDeleteFromView,
    handleCloseView,
  } = useViewModalState({
    selectedViewItem: selectedViewItem ?? null,
    onViewFromMenu,
    onDeleteFromView,
    refreshViewportPins,
    closeView,
  });

  // 생성 후 임시핀/방문핀 처리 (커스텀 훅)
  const { handleAfterCreate } = useAfterCreateHandler({
    createHostHandlers,
    closeView,
    replaceTempByRealId,
    upsertDraftMarker,
  });

  const { siteReservations } = useSidebarCtx();

  const handleFocusItemMap = useCallback(
    (item: ListItem | null) => {
      if (!item) return;
      const lat = (item as any).lat;
      const lng = (item as any).lng;
      if (lat == null || lng == null) return;

      focusMapToPosition({ kakaoSDK, mapInstance, lat, lng });
    },
    [kakaoSDK, mapInstance]
  );

  const handleFocusSubItemMap = useCallback(
    (sub: SubListItem | null) => {
      if (!sub) return;
      const lat = (sub as any).lat;
      const lng = (sub as any).lng;
      if (lat == null || lng == null) return;

      focusMapToPosition({ kakaoSDK, mapInstance, lat, lng });
    },
    [kakaoSDK, mapInstance]
  );

  return (
    <div className="fixed inset-0">
      <MapCanvas
        appKey={appKey}
        kakaoSDK={kakaoSDK}
        mapInstance={mapInstance}
        markers={culledMarkers}
        fitAllOnce={didInit ? fitAllOnce : undefined}
        poiKinds={poiKinds}
        pinsLoading={pinsLoading || searchLoading}
        pinsError={pinsError || searchError}
        menuOpen={menuOpen}
        menuAnchor={menuAnchor}
        hideLabelForId={effectiveHideLabelForId}
        onMarkerClick={onMarkerClick}
        onOpenMenu={handleOpenMenuInternal}
        onChangeHideLabelForId={onChangeHideLabelForId}
        onMapReady={handleMapReady}
        onViewportChange={handleViewportChange}
        isDistrictOn={isDistrictOn}
        showRoadviewOverlay={roadviewRoadOn}
        onRoadviewClick={roadviewRoadOn ? handleRoadviewClickOnMap : undefined}
        onMapClick={
          distanceMeasureVisible ? undefined : handleMapClickForAddress
        }
      />

      <MapDistanceMeasure
        visible={distanceMeasureVisible}
        kakaoSDK={kakaoSDK}
        mapInstance={mapInstance}
      />

      <AddressModal
        open={addressModalOpen}
        onOpenChange={setAddressModalOpen}
        position={addressModalPosition}
        anchorPoint={addressModalPoint}
        kakaoSDK={kakaoSDK}
        onCreateDraft={() => {
          if (!addressModalPosition) return;
          setAddressModalOpen(false); // 주소 모달 닫기
          handleOpenMenuInternal({
            position: addressModalPosition,
            propertyId: "__draft__",
            propertyTitle: "선택 위치",
            pin: { kind: "question", isFav: false },
          });
        }}
      />

      <div ref={contextMenuWrapRef}>
        <ContextMenuHost
          open={menuOpen}
          kakaoSDK={kakaoSDK}
          mapInstance={mapInstance}
          menuAnchor={menuAnchor}
          menuTargetId={menuTargetId}
          menuTitle={menuTitle}
          menuRoadAddr={menuRoadAddr}
          menuJibunAddr={menuJibunAddr}
          visibleMarkers={culledMarkers}
          mergedMeta={mergedMeta}
          favById={favById}
          siteReservations={siteReservations}
          onCloseMenu={onCloseMenu}
          onViewFromMenu={(id) => handleViewFromMenu(String(id))}
          onCreateFromMenu={onCreateFromMenu}
          onPlanFromMenu={onPlanFromMenu}
          onReserveFromMenu={onReserveFromMenu}
          onAddFav={onAddFav}
          onChangeHideLabelForId={onChangeHideLabelForId}
          upsertDraftMarker={(m) =>
            upsertDraftMarker({
              id: m.id,
              lat: m.lat,
              lng: m.lng,
              address: m.address ?? null,
              source: (m as any).source,
              kind: (m as any).kind as PinKind | undefined,
            })
          }
          refreshViewportPins={refreshViewportPins}
        />
      </div>

      {/* 상단 검색 + 필터 + 토글 */}
      <TopRegion
        ref={rightAreaRef}
        q={q}
        onChangeQ={onChangeQ}
        onSubmitSearch={handleSubmitSearch}
        activeMenu={activeMenu}
        onChangeFilter={(next: MapMenuKey) => {
          const resolved: MapMenuKey = next === activeMenu ? "all" : next;
          (onChangeFilter as any)(resolved);
        }}
        isDistrictOn={isDistrictOn}
        setIsDistrictOn={handleSetDistrictOn}
        poiKinds={[...poiKinds]}
        onChangePoiKinds={onChangePoiKinds}
        roadviewVisible={roadviewVisible}
        onToggleRoadview={toggleRoadview}
        distanceMeasureVisible={distanceMeasureVisible}
        onToggleDistanceMeasure={onToggleDistanceMeasure ?? (() => { })}
        rightOpen={rightOpen}
        setRightOpen={handleSetRightOpen}
        sidebarOpen={useSidebar}
        onToggleSidebar={handleToggleSidebar}
        getBounds={getBoundsLLB}
        getLevel={() => mapInstance?.getLevel?.()}
        roadviewRoadOn={roadviewRoadOn}
        onToggleRoadviewRoad={toggleRoadviewRoad}
        onMoveToCurrentLocation={useCallback(() => {
          if (!kakaoSDK || !mapInstance || !("geolocation" in navigator)) {
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              const next = new kakaoSDK.maps.LatLng(latitude, longitude);
              const cur = mapInstance.getCenter?.();

              if (
                !cur ||
                cur.getLat() !== next.getLat() ||
                cur.getLng() !== next.getLng()
              ) {
                mapInstance.setCenter(next);
                const safeLevel = 4;
                mapInstance.setLevel(safeLevel);
              }
            },
            (err) => {
              console.warn("[MapHomeUI] 현재 위치 가져오기 실패:", err);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60_000,
            }
          );
        }, [kakaoSDK, mapInstance])}
        qSale={qSale}
        onChangeQSale={setQSale}
        onSubmitSearchSale={performSaleSearch}
        saleResults={saleResults}
        saleLoading={saleLoading}
        saleModalOpen={saleModalOpen}
        onSaleModalOpenChange={setSaleModalOpen}
        onSelectSalePin={handleSelectSalePin}
      />

      {/* 필터 플로팅 버튼 + 필터 검색 패널 영역 */}
      <div ref={filterAreaRef}>
        <FilterFab onOpen={handleOpenFilterSearch} />

        <FilterSearch
          isOpen={filterSearchOpen}
          onClose={() => setFilterSearchOpen(false)}
          onApply={handleApplyFilters}
          onClear={clearSearch}
        />
      </div>

      {/* 사이드바 영역 */}
      <div ref={sidebarAreaRef}>
        <Sidebar
          isSidebarOn={useSidebar}
          onToggleSidebar={handleToggleSidebar}
          onFocusItemMap={handleFocusItemMap}
          onFocusSubItemMap={handleFocusSubItemMap}
        />
      </div>

      <ModalsHost
        viewOpen={viewOpenLocal}
        selectedViewItem={selectedViewForModal}
        onCloseView={handleCloseView}
        onSaveViewPatch={onSaveViewPatch}
        onDeleteFromView={handleDeleteFromView}
        createOpen={createOpen}
        prefillAddress={prefillAddress}
        draftPin={draftPin}
        selectedPos={selectedPos}
        createHostHandlers={{
          ...createHostHandlers,
          onAfterCreate: async (res) => {
            await handleAfterCreate(res);
          },
          onOpenViewAfterCreate: handleOpenViewAfterCreate,
        }}
        /* ✅ 훅에서 숫자로 내려온 pinDraftId 그대로 전달 */
        pinDraftId={pinDraftId}
        roadviewVisible={roadviewVisible}
        roadviewContainerRef={roadviewContainerRef}
        roadviewRef={roadviewRef}
        onCloseRoadview={close}
        createPinKind={createPinKind ?? null}
        draftHeaderPrefill={draftHeaderPrefill ?? undefined}
        onLabelChanged={() => {
          refreshViewportPins();
        }}
        refetchPins={() => refreshViewportPins()}
        kakaoSDK={kakaoSDK}
        mapInstance={mapInstance}
      />

      <NoResultDialog
        open={noResultDialogOpen}
        onOpenChange={setNoResultDialogOpen}
        onResetFilters={() => {
          clearSearch();
          setFilterSearchOpen(true);
        }}
      />
    </div>
  );
}

export default MapHomeUI;
