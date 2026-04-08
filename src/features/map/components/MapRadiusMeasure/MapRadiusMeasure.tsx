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

  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;
    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev?.addListener) return;

    const onClick = (e: any) => {
      const position = e?.latLng;
      if (!position) return;

      if (!drawingFlag) {
        // 그리기 시작 (원점 지정)
        clearDrawing();
        setDrawingFlag(true);
        setShowIntro(false);
        centerPointRef.current = position;

        const circle = new kakaoSDK.maps.Circle({
          center: position,
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
          path: [position, position],
          strokeWeight: 2,
          strokeColor: STROKE_COLOR,
          strokeOpacity: 0.8,
          strokeStyle: "dash",
        });
        polyline.setMap(mapInstance);
        polylineRef.current = polyline;
      } else {
        // 그리기 종료 (두 번째 클릭)
        finishDrawing();
      }
    };

    const onMouseMove = (e: any) => {
      if (!drawingFlag || !centerPointRef.current || !circleRef.current) return;
      const mousePosition = e?.latLng;
      if (!mousePosition) return;

      const polyline = new kakaoSDK.maps.Polyline({
        path: [centerPointRef.current, mousePosition],
      });
      const radius = polyline.getLength();
      radiusRef.current = radius;

      circleRef.current.setRadius(radius);
      polylineRef.current.setPath([centerPointRef.current, mousePosition]);
      
      showRadius(radius, mousePosition);
    };

    const onRightClick = () => {
      if (drawingFlag) finishDrawing();
    };

    ev.addListener(mapInstance, "click", onClick);
    ev.addListener(mapInstance, "mousemove", onMouseMove);
    ev.addListener(mapInstance, "rightclick", onRightClick);

    return () => {
      ev.removeListener(mapInstance, "click", onClick);
      ev.removeListener(mapInstance, "mousemove", onMouseMove);
      ev.removeListener(mapInstance, "rightclick", onRightClick);
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
          className="fixed left-1/2 bottom-20 z-[100] -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-800/90 text-white shadow-lg pointer-events-none text-center"
          aria-live="polite"
        >
          <span className="text-sm">지도의 원점과 끝점을 클릭해 반경을 측정하세요.</span>
          <br />
          <em className="text-[11px] opacity-90 block">
            두 번 클릭 또는 우클릭으로 종료
          </em>
        </div>
      )}

      {drawingFlag && (
        <div className="fixed left-1/2 bottom-20 z-[100] -translate-x-1/2 flex items-center gap-2">
          <button
            type="button"
            onClick={finishDrawing}
            className="px-5 py-2.5 rounded-full bg-blue-600 text-white shadow-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition"
          >
            확정
          </button>
          <button
            type="button"
            onClick={cancelDrawing}
            className="px-5 py-2.5 rounded-full bg-gray-700 text-white shadow-lg font-bold text-sm hover:bg-gray-800 active:scale-95 transition"
          >
            취소
          </button>
        </div>
      )}
    </>
  );
}
