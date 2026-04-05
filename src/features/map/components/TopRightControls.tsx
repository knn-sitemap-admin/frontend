"use client";

import { useEffect, useRef, useCallback } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import ToggleSidebar from "./ToggleSidebar/ToggleSidebar";
import { usePlannedDrafts } from "../hooks/pins/usePlannedDrafts";
import { useMemoViewMode } from "@/features/properties/view/store/useMemoViewMode";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/use-toast";
import { MapMenuKey } from "@/features/map/components/menu/types/mapMenu.types";
import MapMenu from "@/features/map/components/menu/MapMenu";
import { PoiKind } from "../poi/lib/poiTypes";
import { POI_VISIBLE_MIN_SCALE_M } from "../poi/lib/constants";

function isPlannedKey(k: MapMenuKey | string) {
  return k === "planned";
}

// 카카오맵 level → 대략적인 m 단위로 변환
const getScaleMetersFromLevel = (level: number) => {
  switch (level) {
    case 1:
      return 10;
    case 2:
      return 20;
    case 3:
      return 50;
    case 4:
      return 100;
    case 5:
      return 250;
    default:
      return 500;
  }
};

export default function TopRightControls(props: {
  activeMenu: MapMenuKey;
  onChangeFilter: (next: MapMenuKey) => void;
  isDistrictOn: boolean;
  setIsDistrictOn: (v: boolean) => void;
  poiKinds: readonly PoiKind[];
  onChangePoiKinds: (next: PoiKind[]) => void;
  roadviewVisible: boolean;
  onToggleRoadview: () => void;
  distanceMeasureVisible?: boolean;
  onToggleDistanceMeasure?: () => void;
  rightOpen: boolean;
  setRightOpen: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  getBounds: () => kakao.maps.LatLngBounds | undefined;
  getLevel: () => number | undefined;

  /** 🔵 로드뷰 도로(파란 라인) 토글 상태 & 핸들러 */
  roadviewRoadOn: boolean;
  onToggleRoadviewRoad: () => void;

  /** 현위치로 이동 핸들러 */
  onMoveToCurrentLocation?: () => void;
}) {
  const stop = (e: any) => {
    e.stopPropagation?.();
    e.nativeEvent?.stopPropagation?.();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  // ✅ 토스트 훅은 컴포넌트 안에서 호출해야 함
  const { toast } = useToast();

  // kakao Bounds -> 커스텀 Bounds 어댑터
  const getBoundsForHook = () => {
    const b = props.getBounds?.();
    if (!b) return undefined;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    return {
      swLat: sw.getLat(),
      swLng: sw.getLng(),
      neLat: ne.getLat(),
      neLng: ne.getLng(),
    };
  };

  const { reloadPlanned } = usePlannedDrafts({
    filter: isPlannedKey(props.activeMenu) ? "planned" : "all",
    getBounds: getBoundsForHook,
  });

  const loadingRef = useRef(false);

  // 메뉴가 planned일 때만 데이터 로드
  useEffect(() => {
    const run = async () => {
      if (isPlannedKey(props.activeMenu)) {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
          await Promise.resolve(reloadPlanned());
        } finally {
          loadingRef.current = false;
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activeMenu, reloadPlanned]);

  // ✅ 편의시설 토글을 가로채서 축척 체크 + 자동 줌 + 토스트
  const handleChangePoiKinds = useCallback(
    (next: PoiKind[]) => {
      // 모두 꺼져있다가 처음 켜는 상황에서만 체크
      const turningOn = props.poiKinds.length === 0 && next.length > 0;

      if (turningOn) {
        const level = props.getLevel?.();
        if (typeof level === "number") {
          const scaleM = getScaleMetersFromLevel(level);

          // 50m보다 축소(= 숫자 큼)면 자동으로 50m로 줌 + 토스트
          if (scaleM > POI_VISIBLE_MIN_SCALE_M) {
            toast({
              title: "지도를 확대했어요",
              description:
                "편의시설은 지도 축척이 50m 이상일 때 표시됩니다. 지도를 자동으로 확대했어요.",
            });

            const mapLevelFor50m = 3; // 현재 로직 기준 3레벨을 50m로 가정
            const map = (window as any).kakaoMapInstance;
            if (map && typeof map.setLevel === "function") {
              map.setLevel(mapLevelFor50m, { animate: true });
            }

            // 토글 자체는 그대로 반영 (유저 입장에서는 '켜진 상태' 유지)
            props.onChangePoiKinds(next);
            return;
          }
        }
      }

      props.onChangePoiKinds(next);
    },
    [props.poiKinds.length, props.getLevel, props.onChangePoiKinds, toast]
  );

  /* 🔸 50m보다 축소되면 주변시설 토글 전부 해제 */
  useEffect(() => {
    const checkZoomAndClear = () => {
      const level = props.getLevel?.();
      if (typeof level !== "number") return;

      const scaleM = getScaleMetersFromLevel(level);

      // 50m보다 축소인데 토글이 켜져 있으면 모두 해제
      if (scaleM > POI_VISIBLE_MIN_SCALE_M && props.poiKinds.length > 0) {
        props.onChangePoiKinds([]);
      }
    };

    // idle 이벤트를 못 받으니까 간단히 폴링 (0.5초마다 한 번)
    const timer = window.setInterval(checkZoomAndClear, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, [props.getLevel, props.poiKinds.length, props.onChangePoiKinds]);

  // ✅ 전역 메모 보기 모드 (K&N / R)
  const { mode: memoMode, setMode: setMemoMode } = useMemoViewMode();

  // 🔧 roadviewVisible일 때 살짝 비활성/투명 처리 (이제 고정 위치는 아님)
  const rootClass = cn(
    "fixed flex flex-row items-center gap-1 md:gap-2", // 공통
    "bottom-4 left-[4.5rem]", // 기본: 모바일
    "lg:top-3 lg:right-3 lg:bottom-auto lg:left-auto", // PC 이상에서 override
    props.roadviewVisible
      ? "z-[5] pointer-events-none opacity-40"
      : "z-[10] pointer-events-auto"
  );

  return (
    <>
      <div
        id="top-right-controls"
        className={rootClass}
        aria-hidden={props.roadviewVisible}
        onPointerDown={stop}
        onMouseDown={stop}
        onTouchStart={stop}
      >
        {/* 🔵 로드뷰 도로(파란 라인) 토글 버튼 - 제일 왼쪽 */}
        <button
          type="button"
          onClick={props.onToggleRoadviewRoad}
          className={`h-8 px-2 text-xs rounded-md border shadow-sm shrink-0 whitespace-nowrap ${
            props.roadviewRoadOn || props.roadviewVisible
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          로드뷰도로
        </button>

        {/* 🟡 전역 메모 보기 토글 (K&N 단일 버튼: 주황/빨강) */}
        <div className="relative z-[2] shrink-0">
          <button
            type="button"
            onClick={() =>
              setMemoMode(memoMode === "public" ? "secret" : "public")
            }
            className={cn(
              "px-3 h-8 text-sm rounded-md border shadow-sm transition-colors",
              memoMode === "public"
                ? "bg-amber-500 text-white border-amber-500" // 주황
                : "bg-rose-600 text-white border-rose-600" // 빨강
            )}
          >
            K&N
          </button>
        </div>

        {/* 현위치로 이동 버튼 - 필터 왼쪽 */}
        {props.onMoveToCurrentLocation && (
          <div className="relative z-[2] shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={props.onMoveToCurrentLocation}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-10 w-10 rounded-xl"
              aria-label="현위치로 이동"
              title="현위치로 이동"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 🔵 지도 메뉴 (등록/답사/임시핀 등 필터) - 가운데 */}
        <div className="relative z-[30] shrink-0">
          <MapMenu
            active={props.activeMenu}
            onChange={(next) => {
              const resolved = next === props.activeMenu ? "all" : next;
              if (isPlannedKey(resolved)) reloadPlanned();
              props.onChangeFilter(resolved as MapMenuKey);
            }}
            isDistrictOn={props.isDistrictOn}
            onToggleDistrict={props.setIsDistrictOn}
            poiKinds={props.poiKinds}
            onChangePoiKinds={handleChangePoiKinds}
            roadviewVisible={props.roadviewVisible}
            roadviewRoadOn={props.roadviewRoadOn}
            onToggleRoadview={props.onToggleRoadview}
            distanceMeasureVisible={props.distanceMeasureVisible ?? false}
            onToggleDistanceMeasure={props.onToggleDistanceMeasure ?? (() => {})}
            expanded={props.rightOpen}
            onExpandChange={(expanded) => {
              props.setRightOpen(expanded);
              if (expanded && props.sidebarOpen) props.setSidebarOpen(false);
            }}
          />
        </div>

        {/* 🟢 사이드바 토글 버튼 - 오른쪽 */}
        <div className="relative z-[10] shrink-0">
          <ToggleSidebar
            overlay={false}
            controlledOpen={props.sidebarOpen}
            onChangeOpen={(open) => {
              props.setSidebarOpen(open);
              if (open) props.setRightOpen(false);
            }}
          />
        </div>
      </div>
    </>
  );
}
