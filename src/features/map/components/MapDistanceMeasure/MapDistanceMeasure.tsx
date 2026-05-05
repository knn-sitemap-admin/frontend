"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MapDistanceMeasureProps = {
  visible: boolean;
  kakaoSDK: any;
  mapInstance: any;
};

const STROKE_COLOR = "#2563eb";

export function MapDistanceMeasure({
  visible,
  kakaoSDK,
  mapInstance,
}: MapDistanceMeasureProps) {
  const [drawingFlag, setDrawingFlag] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

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
  }, []);

  const deleteCircleDot = useCallback(() => {
    dotsRef.current.forEach((d) => {
      if (d.circle) d.circle.setMap(null);
      if (d.distance) d.distance.setMap(null);
    });
    dotsRef.current = [];
  }, []);

  const showDistance = useCallback(
    (content: string, position: any) => {
      if (!kakaoSDK || !mapInstance) return;
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

  const getTimeHTML = useCallback((distance: number) => {
    const walkkTime = Math.floor(distance / 67);
    let walkHour = "";
    const walkMin = `${walkkTime % 60}분`;
    if (walkkTime > 60) {
      walkHour = `${Math.floor(walkkTime / 60)}시간 `;
    }
    const bycicleTime = Math.floor(distance / 227);
    let bycicleHour = "";
    const bycicleMin = `${bycicleTime % 60}분`;
    if (bycicleTime > 60) {
      bycicleHour = `${Math.floor(bycicleTime / 60)}시간 `;
    }
    return `
      <ul style="position:relative;top:5px;left:5px;list-style:none;margin:0;padding:6px 10px;background:#fff;border-radius:6px;box-shadow:0 1px 2px #888;font-size:12px">
        <li><span style="display:inline-block;width:50px">총거리</span><span style="font-weight:bold;color:#2563eb">${distance}</span>m</li>
        <li><span style="display:inline-block;width:50px">도보</span>${walkHour}${walkMin}</li>
        <li><span style="display:inline-block;width:50px">자전거</span>${bycicleHour}${bycicleMin}</li>
      </ul>
    `;
  }, []);

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
      const content = getTimeHTML(distance);
      showDistance(content, path[path.length - 1]);
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
      const content = `<div style="position:relative;top:5px;left:5px;padding:4px 8px;background:#fff;border-radius:6px;box-shadow:0 1px 2px #888;font-size:12px">총거리 <span style="font-weight:bold;color:#2563eb">${distance}</span>m</div>`;
      showDistance(content, mousePosition);
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

  if (!visible) return null;

  return (
    <>
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

      {drawingFlag && (
        <div className="fixed left-1/2 bottom-24 z-[100] -translate-x-1/2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            type="button"
            onClick={finishDrawing}
            className="px-6 py-3 rounded-full bg-blue-600 text-white shadow-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition flex items-center gap-2"
          >
            측정 완료
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
