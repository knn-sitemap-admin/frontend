"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

export type MapDistanceMeasureProps = {
  visible: boolean;
  kakaoSDK: any;
  mapInstance: any;
  onClose?: () => void;
};

const STROKE_COLOR = "#2563eb";

export function MapDistanceMeasure({
  visible,
  kakaoSDK,
  mapInstance,
  onClose,
}: MapDistanceMeasureProps) {
  const [drawingFlag, setDrawingFlag] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  const clickLineRef = useRef<any>(null);
  const moveLineRef = useRef<any>(null);
  const distanceOverlayRef = useRef<any>(null);
  const dotsRef = useRef<{ circle: any; distance?: any }[]>([]);

  // --- 유틸리티 함수들 ---

  const deleteClickLine = useCallback(() => {
    if (clickLineRef.current && mapInstance) {
      clickLineRef.current.setMap(null);
      clickLineRef.current = null;
    }
  }, [mapInstance]);

  const deleteDistance = useCallback(() => {
    if (distanceOverlayRef.current) {
      distanceOverlayRef.current.setMap(null);
      distanceOverlayRef.current = null;
    }
    setCurrentDistance(null);
  }, []);

  const deleteCircleDot = useCallback(() => {
    dotsRef.current.forEach((d) => {
      if (d.circle) d.circle.setMap(null);
      if (d.distance) d.distance.setMap(null);
    });
    dotsRef.current = [];
  }, []);

  const showDistance = useCallback(
    (distance: number) => {
      setCurrentDistance(distance);
    },
    []
  );

  const displayCircleDot = useCallback(
    (position: any, distance: number) => {
      if (!kakaoSDK || !mapInstance) return;
      const circleContent =
        '<span style="display:block;width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)"></span>';
      const circleOverlay = new kakaoSDK.maps.CustomOverlay({
        content: circleContent,
        position,
        zIndex: 1,
      });
      circleOverlay.setMap(mapInstance);

      let distanceOverlay: any = null;
      if (distance > 0) {
        const distContent = `<div style="position:relative;bottom:10px;border-radius:6px;border:1px solid #ccc;float:left;font-size:12px;padding:4px 8px;background:#fff;box-shadow:0 1px 2px #888"><span style="font-weight:bold;color:#2563eb">${distance}</span>m</div>`;
        distanceOverlay = new kakaoSDK.maps.CustomOverlay({
          content: distContent,
          position,
          yAnchor: 1,
          zIndex: 2,
        });
        distanceOverlay.setMap(mapInstance);
      }
      dotsRef.current.push({ circle: circleOverlay, distance: distanceOverlay ?? undefined });
    },
    [kakaoSDK, mapInstance]
  );



  // --- 비즈니스 로직 함수들 ---

  const finishDrawing = useCallback(() => {
    if (!drawingFlag) return;

    if (moveLineRef.current) {
      moveLineRef.current.setMap(null);
      moveLineRef.current = null;
    }

    const path = clickLineRef.current?.getPath();
    if (path && path.length > 1) {
      const lastDot = dotsRef.current[dotsRef.current.length - 1];
      if (lastDot?.distance) {
        lastDot.distance.setMap(null);
        lastDot.distance = null;
      }
      const distance = Math.round(clickLineRef.current.getLength());
      showDistance(distance);
    } else {
      deleteClickLine();
      deleteCircleDot();
      deleteDistance();
    }

    setDrawingFlag(false);
    setShowIntro(true);
  }, [drawingFlag, getTimeHTML, showDistance, deleteClickLine, deleteCircleDot, deleteDistance]);

  const cancelDrawing = useCallback(() => {
    if (moveLineRef.current) {
      moveLineRef.current.setMap(null);
      moveLineRef.current = null;
    }
    deleteClickLine();
    deleteCircleDot();
    deleteDistance();
    setDrawingFlag(false);
    setShowIntro(true);
  }, [deleteClickLine, deleteCircleDot, deleteDistance]);

  // --- Effects (이벤트 리스너 등록) ---
  
  // 거리 재기는 지도를 옮기며 찍는 경우가 많으므로 드래그를 허용함
  useEffect(() => {
    if (mapInstance) mapInstance.setDraggable(true);
  }, [mapInstance, visible]);

  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;
    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev?.addListener) return;

    // 클릭 시 지점 추가
    const onClick = (e: any) => {
      const pos = e?.latLng;
      if (!pos) return;

      if (!drawingFlag) {
        // 처음 시작
        setDrawingFlag(true);
        setShowIntro(false);
        deleteClickLine();
        deleteDistance();
        deleteCircleDot();

        const line = new kakaoSDK.maps.Polyline({
          map: mapInstance,
          path: [pos],
          strokeWeight: 3,
          strokeColor: STROKE_COLOR,
          strokeOpacity: 1,
          strokeStyle: "solid",
        });
        clickLineRef.current = line;

        const moveLine = new kakaoSDK.maps.Polyline({
          strokeWeight: 3,
          strokeColor: STROKE_COLOR,
          strokeOpacity: 0.5,
          strokeStyle: "solid",
        });
        moveLineRef.current = moveLine;

        displayCircleDot(pos, 0);
      } else {
        // 지점 추가
        const path = clickLineRef.current.getPath();
        const lastPoint = path[path.length - 1];
        
        // 중복 클릭 방지
        const tempLine = new kakaoSDK.maps.Polyline({ path: [lastPoint, pos] });
        if (tempLine.getLength() < 5) return;

        path.push(pos);
        clickLineRef.current.setPath(path);
        const distance = Math.round(clickLineRef.current.getLength());
        displayCircleDot(pos, distance);
      }
    };

    // 마우스 이동 시 미리보기 선
    const onMouseMove = (e: any) => {
      if (!drawingFlag || !clickLineRef.current || !moveLineRef.current) return;
      const mousePosition = e?.latLng;
      if (!mousePosition) return;

      const path = clickLineRef.current.getPath();
      const movepath = [path[path.length - 1], mousePosition];
      moveLineRef.current.setPath(movepath);
      moveLineRef.current.setMap(mapInstance);

      const distance = Math.round(
        clickLineRef.current.getLength() + moveLineRef.current.getLength()
      );
      showDistance(distance);
    };

    ev.addListener(mapInstance, "click", onClick);
    ev.addListener(mapInstance, "mousemove", onMouseMove);
    ev.addListener(mapInstance, "rightclick", finishDrawing);

    return () => {
      ev.removeListener(mapInstance, "click", onClick);
      ev.removeListener(mapInstance, "mousemove", onMouseMove);
      ev.removeListener(mapInstance, "rightclick", finishDrawing);
    };
  }, [visible, kakaoSDK, mapInstance, drawingFlag, deleteClickLine, deleteDistance, deleteCircleDot, displayCircleDot, showDistance, finishDrawing]);

  // 비활성 시 전부 제거
  useEffect(() => {
    if (!visible) {
      setDrawingFlag(false);
      setShowIntro(true);
      if (moveLineRef.current) {
        moveLineRef.current.setMap(null);
        moveLineRef.current = null;
      }
      deleteClickLine();
      deleteDistance();
      deleteCircleDot();
    }
  }, [visible, deleteClickLine, deleteDistance, deleteCircleDot]);

  // --- 측정 결과 포맷팅 ---
  const hasCurrentDistance = currentDistance != null && currentDistance > 0;
  let displayDist = "";
  let walkDisplay = "";
  let cycleDisplay = "";

  if (hasCurrentDistance) {
    const dist = currentDistance!;
    displayDist = dist >= 1000 ? `${(dist / 1000).toFixed(2)}km` : `${dist}m`;

    // 도보: 분당 67m 가정
    const walkTimeTotal = Math.floor(dist / 67);
    const wH = Math.floor(walkTimeTotal / 60);
    const wM = walkTimeTotal % 60;
    walkDisplay = wH > 0 ? `${wH}시간 ${wM}분` : `${Math.max(1, wM)}분`;

    // 자전거: 분당 227m 가정
    const cycleTimeTotal = Math.floor(dist / 227);
    const cH = Math.floor(cycleTimeTotal / 60);
    const cM = cycleTimeTotal % 60;
    cycleDisplay = cH > 0 ? `${cH}시간 ${cM}분` : `${Math.max(1, cM)}분`;
  }

  if (!visible) return null;

  return (
    <>
      {/* 📱 모바일 고정 측정 결과 패널 (화면 중앙 배치) */}
      {hasCurrentDistance && (
        <div className="fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded-2xl bg-white shadow-2xl flex items-center gap-4 min-w-[240px] border border-gray-100 animate-in fade-in zoom-in-95 duration-300 pointer-events-none">
          <div className="flex flex-col border-r border-gray-100 pr-4">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">이동거리</span>
            <span className="text-lg font-bold text-blue-600 tracking-tight leading-tight">{displayDist}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="opacity-60">🚶 도보</span>
              <span className="font-semibold text-gray-900">{walkDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">🚲 자전거</span>
              <span className="font-semibold text-gray-900">{cycleDisplay}</span>
            </div>
          </div>
        </div>
      )}

      {showIntro && !drawingFlag && (
        <div
          className="hidden md:block fixed left-1/2 top-24 z-[100] -translate-x-1/2 px-5 py-3 rounded-2xl bg-gray-900/90 text-white shadow-2xl pointer-events-none text-center border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold">지도를 클릭해 거리 측정 구간을 정하세요</span>
            <span className="text-[11px] opacity-80">마지막 지점에서 한 번 더 클릭하거나 완료를 누르세요</span>
          </div>
        </div>
      )}

      <div className="fixed left-1/2 bottom-24 z-[100] -translate-x-1/2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {drawingFlag && (
          <>
            <button
              type="button"
              onClick={finishDrawing}
              className="px-5 py-3 rounded-full bg-blue-600 text-white shadow-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition whitespace-nowrap"
            >
              측정 완료
            </button>
            <button
              type="button"
              onClick={cancelDrawing}
              className="px-5 py-3 rounded-full bg-gray-800 text-white shadow-lg font-bold text-sm hover:bg-gray-900 active:scale-95 transition whitespace-nowrap"
            >
              초기화
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            cancelDrawing();
            onClose?.();
          }}
          className="px-5 py-3 rounded-full bg-rose-600 text-white shadow-xl font-bold text-sm hover:bg-rose-700 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          종료
        </button>
      </div>
    </>
  );
}
