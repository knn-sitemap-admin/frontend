"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MapRadiusMeasureProps = {
  visible: boolean;
  kakaoSDK: any;
  mapInstance: any;
};

const STROKE_COLOR = "#2563eb";
const FILL_COLOR = "#2563eb";

export function MapRadiusMeasure({
  visible,
  kakaoSDK,
  mapInstance,
}: MapRadiusMeasureProps) {
  const [drawingFlag, setDrawingFlag] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const centerPointRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const polylineRef = useRef<any>(null); // 반경을 보여줄 선
  const distanceOverlayRef = useRef<any>(null);
  const radiusRef = useRef<number>(0);

  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  // --- 유틸리티 함수들 ---

  const clearDrawing = useCallback(() => {
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (distanceOverlayRef.current) {
      distanceOverlayRef.current.setMap(null);
      distanceOverlayRef.current = null;
    }
    centerPointRef.current = null;
    radiusRef.current = 0;
  }, []);

  const showRadius = useCallback(
    (radius: number, position: any) => {
      if (!kakaoSDK || !mapInstance) return;

      const formatTime = (totalMinutes: number) => {
        if (totalMinutes <= 0) return "1분 미만";
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0) {
          return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
        }
        return `${m}분`;
      };

      const walkDisplay = formatTime(Math.floor(radius / 67));
      const cycleDisplay = formatTime(Math.floor(radius / 227));

      const distDisplay = radius >= 1000 
        ? `${(radius / 1000).toFixed(2)}km` 
        : `${Math.round(radius)}m`;

      const content = `
        <div style="position:relative;top:5px;left:5px;padding:8px 12px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:12px;line-height:1.6;min-width:130px;border:1px solid #cbd5e1;z-index:100;font-family:sans-serif;">
          <div style="margin-bottom:6px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;font-weight:bold;color:#1e293b;font-size:13px;">
            반경 <span style="color:#2563eb;">${distDisplay}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <span style="color:#64748b;font-size:11px;">🚶 도보</span>
            <span style="font-weight:600;color:#334155;">${walkDisplay}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="color:#64748b;font-size:11px;">🚲 자전거</span>
            <span style="font-weight:600;color:#334155;">${cycleDisplay}</span>
          </div>
        </div>
      `;
      
      if (distanceOverlayRef.current) {
        distanceOverlayRef.current.setPosition(position);
        distanceOverlayRef.current.setContent(content);
      } else {
        const overlay = new kakaoSDK.maps.CustomOverlay({
          map: mapInstance,
          content,
          position,
          xAnchor: 0,
          yAnchor: 0,
          zIndex: 3,
        });
        distanceOverlayRef.current = overlay;
      }
    },
    [kakaoSDK, mapInstance]
  );

  const finishDrawing = useCallback(() => {
    setDrawingFlag(false);
    setShowIntro(true);
  }, []);

  const cancelDrawing = useCallback(() => {
    clearDrawing();
    setDrawingFlag(false);
    setShowIntro(true);
  }, [clearDrawing]);

  // --- Effects ---
  
  // 측정 도구가 활성화되면 지도의 드래그를 막아 드래그 측정이 가능하게 함
  useEffect(() => {
    if (!mapInstance) return;
    if (visible) {
      mapInstance.setDraggable(false);
    } else {
      mapInstance.setDraggable(true);
    }
    return () => {
      if (mapInstance) mapInstance.setDraggable(true);
    };
  }, [visible, mapInstance]);

  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;

    const container = mapInstance.getNode();
    const projection = mapInstance.getProjection();

    const getLatLngFromEvent = (e: any) => {
      const rect = container.getBoundingClientRect();
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const point = new kakaoSDK.maps.Point(clientX - rect.left, clientY - rect.top);
      return projection.coordsFromContainerPoint(point);
    };

    const onStart = (e: any) => {
      if (drawingFlag) return;
      const latLng = getLatLngFromEvent(e);
      if (!latLng) return;

      isDraggingRef.current = true;
      hasMovedRef.current = false;
      
      clearDrawing();
      setDrawingFlag(true);
      setShowIntro(false);
      centerPointRef.current = latLng;

      const circle = new kakaoSDK.maps.Circle({
        center: latLng,
        radius: 0,
        strokeWeight: 2,
        strokeColor: STROKE_COLOR,
        strokeOpacity: 0.8,
        strokeStyle: "solid",
        fillColor: FILL_COLOR,
        fillOpacity: 0.2,
      });
      circle.setMap(mapInstance);
      circleRef.current = circle;

      const polyline = new kakaoSDK.maps.Polyline({
        path: [latLng, latLng],
        strokeWeight: 2,
        strokeColor: STROKE_COLOR,
        strokeOpacity: 0.8,
        strokeStyle: "dash",
      });
      polyline.setMap(mapInstance);
      polylineRef.current = polyline;
    };

    const onMove = (e: any) => {
      if (!drawingFlag || !centerPointRef.current || !circleRef.current) return;
      const latLng = getLatLngFromEvent(e);
      if (!latLng) return;

      hasMovedRef.current = true;

      // 거리 계산을 위한 임시 폴리라인
      const tempPolyline = new kakaoSDK.maps.Polyline({
        path: [centerPointRef.current, latLng],
      });
      const radius = tempPolyline.getLength();
      radiusRef.current = radius;

      circleRef.current.setRadius(radius);
      polylineRef.current.setPath([centerPointRef.current, latLng]);
      
      showRadius(radius, latLng);
      
      if (isDraggingRef.current && e.cancelable) {
        e.preventDefault();
      }
    };

    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      
      if (drawingFlag && centerPointRef.current) {
        finishDrawing();
      }
    };

    // 네이티브 이벤트 등록
    container.addEventListener("touchstart", onStart, { passive: false });
    container.addEventListener("touchmove", onMove, { passive: false });
    container.addEventListener("touchend", onEnd);
    container.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", onEnd);
      container.removeEventListener("mousedown", onStart);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [visible, kakaoSDK, mapInstance, drawingFlag, clearDrawing, finishDrawing, showRadius]);

  // 비활성 시 제거
  useEffect(() => {
    if (!visible) {
      setDrawingFlag(false);
      setShowIntro(true);
      clearDrawing();
    }
  }, [visible, clearDrawing]);

  if (!visible) return null;

  return (
    <>
      {showIntro && !drawingFlag && (
        <div
          className="hidden md:block fixed left-1/2 top-24 z-[100] -translate-x-1/2 px-5 py-3 rounded-2xl bg-gray-900/90 text-white shadow-2xl pointer-events-none text-center border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold">중심점을 누른 채 바깥으로 드래그하세요</span>
            <span className="text-[11px] opacity-80">손을 떼면 측정이 완료됩니다</span>
          </div>
        </div>
      )}

      {drawingFlag && (
        <div className="fixed left-1/2 bottom-24 z-[100] -translate-x-1/2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            type="button"
            onClick={finishDrawing}
            className="px-6 py-3 rounded-full bg-blue-600 text-white shadow-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition flex items-center gap-2"
          >
            확정
          </button>
          <button
            type="button"
            onClick={cancelDrawing}
            className="px-6 py-3 rounded-full bg-gray-800 text-white shadow-lg font-bold text-sm hover:bg-gray-900 active:scale-95 transition"
          >
            취소
          </button>
        </div>
      )}
    </>
  );
}
