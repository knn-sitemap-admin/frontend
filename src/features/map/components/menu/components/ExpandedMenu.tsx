"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";
import {
  Train,
  Coffee,
  Store,
  ShoppingCart,
  Pill,
  Cross,
  School,
  ParkingCircle,
  ShieldCheck,
  Landmark,
  TreePine,
} from "lucide-react";

import type { MapMenuKey } from "../types/mapMenu.types";
import { FilterSection } from "./FilterSection";
import RoadviewToggleButton from "./RoadviewToggleButton";
import DistrictToggleButton from "./DistrictToggleButton";
import DistanceMeasureToggleButton from "./DistanceMeasureToggleButton";
import { POI_LABEL } from "../../../engine/overlays/poiOverlays";
import { PoiKind } from "@/features/map/poi/lib/poiTypes";
import {
  POI_CATEGORY_ITEMS,
  POI_CATEGORY_KEYS,
  POI_CATEGORY_LABEL,
} from "../lib/poiCategories";

// top 모듈에 있는 로드뷰 토글 (기존 default export 유지)

interface ExpandedMenuProps {
  active: MapMenuKey;
  activeSubmenu: "filter" | "edit" | null;

  // 지적편집도
  isDistrictOn: boolean;
  onToggleDistrict: () => void;

  // (과거 콜백 호환—현재 이 컴포넌트에서는 사용하지 않음)
  onSubmenuClick: (submenu: "filter" | "edit") => void;
  onMenuItemClick: (key: MapMenuKey) => void;
  onToggle?: () => void; // ✅ MapMenu 에서 api.close 넘어옴

  // 주변시설
  poiKinds: readonly PoiKind[];
  onChangePoiKinds: (next: PoiKind[]) => void;

  // 로드뷰
  roadviewVisible: boolean;
  roadviewRoadOn: boolean;
  onToggleRoadview: () => void;

  // 거리재기
  distanceMeasureVisible: boolean;
  onToggleDistanceMeasure: () => void;
}

export type PoiCategoryKey = (typeof POI_CATEGORY_KEYS)[number];

/* ───────── 메뉴용 아이콘 ───────── */

const POI_MENU_ICON: Partial<Record<PoiKind, LucideIcon>> = {
  subway: Train,
  school: School,
  convenience: Store,
  mart: ShoppingCart,
  cafe: Coffee,
  pharmacy: Pill,
  hospital: Cross,
  parking: ParkingCircle,
  safety: ShieldCheck, // 안전기관(경찰/소방)
  culture: Landmark,
  park: TreePine,
};

export const ExpandedMenu: React.FC<ExpandedMenuProps> = React.memo(
  function ExpandedMenu({
    active,
    activeSubmenu,
    isDistrictOn,
    onSubmenuClick,
    onMenuItemClick,
    onToggleDistrict,
    poiKinds,
    onChangePoiKinds,
    roadviewVisible,
    roadviewRoadOn,
    onToggleRoadview,
    distanceMeasureVisible,
    onToggleDistanceMeasure,
    onToggle,
  }) {
    // ✅ 주변시설 카테고리 탭 상태
    const [activePoiCategory, setActivePoiCategory] =
      React.useState<PoiCategoryKey>("transport");

    // ✅ 드래그해서 닫기 상태
    const [dragY, setDragY] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragHandleRef = React.useRef<HTMLDivElement>(null);
    const startYRef = React.useRef<number | null>(null);

    const handleClose = React.useCallback(() => {
      onToggle?.();
    }, [onToggle]);

    const getClientY = (e: any): number => {
      const touch = e.touches?.[0] ?? e.changedTouches?.[0];
      if (touch) return touch.clientY;
      return e.clientY ?? 0;
    };

    const handleDragStart = React.useCallback((e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
      // 🛑 stopPropagation은 React 이벤트와 네이티브 이벤트 모두에서 작동하도록 처리
      if ('stopPropagation' in e) e.stopPropagation();
      const y = getClientY(e);
      startYRef.current = y;
      setIsDragging(true);
    }, []);

    const handleDragMove = React.useCallback((e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
      // isDragging 상태를 ref나 functional update 등으로 체크할 수도 있으나, 
      // 여기서는 useEffect 가 latest handler를 참조하도록 하거나 state를 dependency에 넣음
      // 여기서는 간단하게 state dependency 포함 useCallback 사용
      if (startYRef.current == null) return;
      if ('stopPropagation' in e) e.stopPropagation();
      const y = getClientY(e);
      const delta = y - startYRef.current;
      if (delta > 0) {
        setDragY(delta); // 아래로만
      } else {
        setDragY(0);
      }
    }, []);

    const handleDragEnd = React.useCallback(() => {
      startYRef.current = null;
      setIsDragging((prevDragging) => {
        if (!prevDragging) return false;
        
        // dragY가 threshold(80)를 넘었는지 체크하기 위해 
        // functional update 대신 클로저의 dragY를 쓰면 stale할 수 있으므로
        // 여기서는 ref로 관리하거나 그냥 클로저를 따름 (useEffect에서 갱신됨)
        return false;
      });

      // dragY 체크 및 처리 (이 부분은 state version 보다는 ref version 이나 
      // useEffect cleanup + re-bind 가 안전함)
      setDragY((currY) => {
        if (currY > 80) {
          handleClose();
        }
        return 0;
      });
    }, [handleClose]);

    // ✅ 모바일에서 preventDefault()를 쓰기 위해 non-passive 리스너 수동 등록
    React.useEffect(() => {
      const el = dragHandleRef.current;
      if (!el) return;

      const onTouchMove = (e: TouchEvent) => {
        // passive: false 인 경우에만 허용됨
        if (startYRef.current !== null) {
          e.preventDefault();
          handleDragMove(e);
        }
      };

      const onTouchStart = (e: TouchEvent) => handleDragStart(e);
      const onTouchEnd = () => handleDragEnd();

      el.addEventListener("touchstart", onTouchStart);
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      el.addEventListener("touchend", onTouchEnd);
      el.addEventListener("touchcancel", onTouchEnd);

      return () => {
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("touchcancel", onTouchEnd);
      };
    }, [handleDragStart, handleDragMove, handleDragEnd]);

    // ✅ POI 토글 핸들러
    const toggleKind = React.useCallback(
      (k: PoiKind) => {
        const has = poiKinds.includes(k);
        const next = has ? poiKinds.filter((x) => x !== k) : [...poiKinds, k];
        onChangePoiKinds(next);
      },
      [poiKinds, onChangePoiKinds]
    );

    const currentKinds = POI_CATEGORY_ITEMS[activePoiCategory];

    // ✅ 현재 카테고리에 해당하는 버튼 목록
    const poiButtons = React.useMemo(
      () =>
        currentKinds.map((k) => {
          const Icon = POI_MENU_ICON[k];
          const isActive = poiKinds.includes(k);

          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-16 rounded-lg text-[11px] border transition",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
              aria-pressed={isActive}
              title={POI_LABEL[k] ?? ""}
            >
              {Icon && <Icon className="w-5 h-5" aria-hidden />}
              <span>{POI_LABEL[k] ?? k}</span>
            </button>
          );
        }),
      [currentKinds, poiKinds, toggleKind]
    );

    // ✅ 카테고리 탭 렌더
    const categoryTabs = React.useMemo(
      () =>
        POI_CATEGORY_KEYS.map((key) => {
          const isActive = activePoiCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActivePoiCategory(key)}
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium border transition",
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {POI_CATEGORY_LABEL[key]}
            </button>
          );
        }),
      [activePoiCategory]
    );

    return (
      <div
        className={cn(
          "fixed z-[220] pointer-events-auto bg-white border border-gray-200 shadow-xl",
          // 📱 모바일: 바텀시트 (아래에서 올라오는 패널)
          "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:top-auto max-md:w-full",
          "max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-x-0 max-md:border-t",
          // 🖥 PC: 기존처럼 우측 상단 카드
          "md:right-4 md:top-[65px] md:bottom-auto md:left-auto",
          "md:w-[318px] md:max-w-[calc(100vw-2rem)] md:rounded-md"
        )}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.18s ease-out",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="region"
        aria-label="지도 도구 및 주변시설"
      >
        {/* 📱 모바일 전용 드래그바 헤더 */}
        <div
          ref={dragHandleRef}
          className="max-md:flex md:hidden items-center justify-center px-4 pt-2 pb-1 border-b"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          // onTouchStart, onTouchMove 등은 useEffect에서 수동 등록 (passive: false를 위해)
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* 안쪽 스크롤 영역 (모바일에서 70vh 정도만 보이게) */}
        <div className="max-md:max-h-[70vh] max-md:overflow-y-auto p-2 md:p-3">
          <FilterSection
            active={active}
            activeSubmenu={activeSubmenu}
            onSubmenuClick={onSubmenuClick}
            onMenuItemClick={onMenuItemClick}
          />

          {/* 지도 도구 */}
          <div className="px-2 pb-1">
            <div className="mb-2 text-xs font-semibold text-gray-600">
              지도 도구
            </div>
            <div className="grid grid-cols-3 gap-2">
              <DistrictToggleButton
                pressed={isDistrictOn}
                onPress={onToggleDistrict}
                showLabel
              />

              <RoadviewToggleButton
                pressed={roadviewVisible || roadviewRoadOn}
                onPress={onToggleRoadview}
                showLabel
              />

              <DistanceMeasureToggleButton
                pressed={distanceMeasureVisible}
                onPress={onToggleDistanceMeasure}
                showLabel
              />
            </div>
          </div>

          {/* 주변시설 */}
          <div className="px-2 pb-2">
            <div className="mb-2 text-xs font-semibold text-gray-600">
              주변시설
            </div>

            {/* 카테고리 탭 */}
            <div className="mb-2 flex flex-wrap gap-1">{categoryTabs}</div>

            {/* 현재 카테고리의 POI 토글들 */}
            <div className="grid grid-cols-3 gap-2">{poiButtons}</div>
          </div>
        </div>
      </div>
    );
  }
);
