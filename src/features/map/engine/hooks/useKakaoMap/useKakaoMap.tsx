import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { loadKakaoOnce } from "@/lib/kakao/loader";
import { DEFAULT_VIEWPORT_DEBOUNCE } from "@/features/map/shared/constants/mapBehavior";
import type { LatLng } from "@/lib/geo/types";
import { useToast } from "@/hooks/use-toast";
import { installHttpsImagePatch, patchKakaoHttps } from "./httpsPatch";
import { createSearchController, type SearchOptions } from "./searchController";
import { KOREA_BOUNDS } from "@/features/map/shared/constants/mapDefaults";

type Args = {
  appKey: string;
  center: LatLng;
  level?: number;
  /** 초기 로드시 전국 bounds에 맞추기 */
  fitKoreaBounds?: boolean;
  /** 최초 로드시 브라우저 현재 위치를 center로 사용 */
  useCurrentLocationOnInit?: boolean;
  /** 우리가 허용하는 최대 축소 레벨 */
  maxLevel?: number;
  /** center prop 변경 시 자동 panTo 비활성화 */
  disableAutoPan?: boolean;
  /** idle 콜백 디바운스(ms). 기본 120ms */
  viewportDebounceMs?: number;
  /** 지도 위에 로드뷰 도로 라인을 표시할지 여부 (기본 false) */
  showRoadviewOverlay?: boolean;
  onMapReady?: (args: { kakao: any; map: any }) => void;
  onViewportChange?: (query: {
    leftTop: LatLng;
    leftBottom: LatLng;
    rightTop: LatLng;
    rightBottom: LatLng;
    zoomLevel: number;
  }) => void;
};

function useStableRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

const useKakaoMap = ({
  appKey,
  center,
  level = 5,
  fitKoreaBounds = false,
  useCurrentLocationOnInit = false,
  maxLevel = 11,
  disableAutoPan = false,
  viewportDebounceMs = DEFAULT_VIEWPORT_DEBOUNCE,
  showRoadviewOverlay = false,
  onMapReady,
  onViewportChange,
}: Args) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const kakaoRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const { toast } = useToast();

  // 옵션/콜백 ref로 고정
  const maxLevelRef = useRef<number>(maxLevel);
  const onViewportChangeRef = useStableRef(onViewportChange);

  // Kakao services 재사용
  const geocoderRef = useRef<any>(null);
  const placesRef = useRef<any>(null);

  // 검색 마커 1개 유지
  const lastSearchMarkerRef = useRef<any>(null);

  // 로드뷰 도로 오버레이
  const roadviewOverlayRef = useRef<any>(null);

  // 리스너/타이머
  const zoomListenerRef = useRef<((...a: any[]) => void) | null>(null);
  const idleListenerRef = useRef<((...a: any[]) => void) | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // center prop → map.panTo 동기화 시 첫 호출은 스킵
  const firstCenterSyncRef = useRef(true);

  // 자동 이동 중일 때 bound 제한 로직을 우회하기 위한 플래그
  const isProgrammaticPanRef = useRef(false);

  // ─────────────────────────────────────────────
  // 1) 지도 초기화: 최초 1회만 생성
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    (async () => {
      try {
        const kakao = await loadKakaoOnce(appKey, {
          autoload: false,
          libs: ["services", "clusterer"],
        });
        if (cancelled || !containerRef.current) return;

        kakaoRef.current = kakao;

        // HTTPS 패치
        patchKakaoHttps(kakao);

        if (!mapRef.current) {
          const map = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(center.lat, center.lng),
            level,
          });
          mapRef.current = map;

          if (typeof window !== "undefined") {
            (window as any).kakaoMapInstance = map;
          }

          // 지도 DOM 아래 http→https 강제 옵저버 설치
          try {
            const node: HTMLElement = map.getNode();
            const detach = installHttpsImagePatch(node);
            (map as any).__detachHttpsPatch__ = detach;
          } catch (e) {
            console.warn("[https image patch] attach failed:", e);
          }

          // services 준비 (전역 재사용)
          geocoderRef.current = new kakao.maps.services.Geocoder();
          placesRef.current = new kakao.maps.services.Places();

          // 전국 보기 옵션 (초기 1회)
          if (fitKoreaBounds) {
            const bounds = new kakao.maps.LatLngBounds(
              new kakao.maps.LatLng(KOREA_BOUNDS.sw.lat, KOREA_BOUNDS.sw.lng),
              new kakao.maps.LatLng(KOREA_BOUNDS.ne.lat, KOREA_BOUNDS.ne.lng)
            );
            map.setBounds(bounds);
          }

          // 축소 상한 설정 (fitKoreaBounds와 별개로 설정)
          maxLevelRef.current = maxLevel;
          map.setMaxLevel(maxLevelRef.current);

          // 로드뷰 도로 오버레이 인스턴스만 생성 (초기엔 꺼둔다)
          try {
            if (!roadviewOverlayRef.current && kakao?.maps?.RoadviewOverlay) {
              roadviewOverlayRef.current = new kakao.maps.RoadviewOverlay();
            }
            if (roadviewOverlayRef.current) {
              roadviewOverlayRef.current.setMap(
                showRoadviewOverlay ? map : null
              );
            }
          } catch (e) {
            console.warn("[RoadviewOverlay] init failed:", e);
          }

          // 현재 위치 중심 이동 옵션
          if (useCurrentLocationOnInit && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                const next = new kakao.maps.LatLng(latitude, longitude);
                const cur = map.getCenter?.();

                if (
                  !cur ||
                  cur.getLat() !== next.getLat() ||
                  cur.getLng() !== next.getLng()
                ) {
                  isProgrammaticPanRef.current = true;
                  const safeLevel = 4;
                  map.setLevel(safeLevel);
                  map.setCenter(next);
                  setTimeout(() => {
                    isProgrammaticPanRef.current = false;
                  }, 500);
                }
              },
              (err) => {
                console.warn("[useKakaoMap] 현재 위치 가져오기 실패:", err);

                // 위치 실패/거부 시 전국 한눈에 보기 강제
                try {
                  const bounds = new kakao.maps.LatLngBounds(
                    new kakao.maps.LatLng(
                      KOREA_BOUNDS.sw.lat,
                      KOREA_BOUNDS.sw.lng
                    ),
                    new kakao.maps.LatLng(
                      KOREA_BOUNDS.ne.lat,
                      KOREA_BOUNDS.ne.lng
                    )
                  );
                  map.setBounds(bounds);
                } catch (e) {
                  console.warn(
                    "[useKakaoMap] fallback fitKoreaBounds 실패:",
                    e
                  );
                }
              },
              {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 60_000,
              }
            );
          }
        }

        setReady(true);
        onMapReady?.({ kakao, map: mapRef.current });
      } catch (e) {
        console.error("Kakao SDK load failed:", e);
      }
    })();

    return () => {
      cancelled = true;

      const kakao = kakaoRef.current;
      const map = mapRef.current;

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      if (kakao?.maps?.event && map) {
        if (zoomListenerRef.current) {
          kakao.maps.event.removeListener(
            map,
            "zoom_changed",
            zoomListenerRef.current
          );
          zoomListenerRef.current = null;
        }
        if (idleListenerRef.current) {
          kakao.maps.event.removeListener(map, "idle", idleListenerRef.current);
          idleListenerRef.current = null;
        }
      }

      if (lastSearchMarkerRef.current) {
        lastSearchMarkerRef.current.setMap(null);
        lastSearchMarkerRef.current = null;
      }

      // 로드뷰 도로 오버레이 제거
      try {
        if (roadviewOverlayRef.current) {
          roadviewOverlayRef.current.setMap(null);
          roadviewOverlayRef.current = null;
        }
      } catch { }

      // https 패치 옵저버 해제
      try {
        (map as any)?.__detachHttpsPatch__?.();
      } catch { }

      if (
        typeof window !== "undefined" &&
        (window as any).kakaoMapInstance === map
      ) {
        (window as any).kakaoMapInstance = null;
      }

      mapRef.current = null;
      // kakaoRef는 SDK 전역이므로 유지
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로드뷰 도로 오버레이 on/off 토글
  useEffect(() => {
    const map = mapRef.current;
    const rv = roadviewOverlayRef.current;
    if (!ready || !map || !rv) return;

    try {
      rv.setMap(showRoadviewOverlay ? map : null);
    } catch (e) {
      console.warn("[RoadviewOverlay] toggle failed:", e);
    }
  }, [ready, showRoadviewOverlay]);

  // 2) 이벤트 리스너 등록 (1회)
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!ready || !kakao || !map) return;

    if (!zoomListenerRef.current) {
      const onZoomChanged = () => {
        const lv = map.getLevel();
        if (lv > maxLevelRef.current) map.setLevel(maxLevelRef.current);
      };
      kakao.maps.event.addListener(map, "zoom_changed", onZoomChanged);
      zoomListenerRef.current = onZoomChanged;
    }

    if (!idleListenerRef.current) {
      const onIdle = () => {
        if (!onViewportChangeRef.current) return;

        if (idleTimerRef.current) {
          window.clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = window.setTimeout(() => {
          if (!mapRef.current) return;
          const b = mapRef.current.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onViewportChangeRef.current?.({
            leftTop: { lat: ne.getLat(), lng: sw.getLng() },
            leftBottom: { lat: sw.getLat(), lng: sw.getLng() },
            rightTop: { lat: ne.getLat(), lng: ne.getLng() },
            rightBottom: { lat: sw.getLat(), lng: ne.getLng() },
            zoomLevel: mapRef.current.getLevel(),
          });
        }, viewportDebounceMs);
      };
      kakao.maps.event.addListener(map, "idle", onIdle);
      idleListenerRef.current = onIdle;
    }

    // 영역 이탈 방지 + 축소 시 중앙 정렬 (viewport span 고려)
    const restrictBounds = () => {
      if (isProgrammaticPanRef.current) return;

      const bounds = map.getBounds();
      const center = map.getCenter();
      if (!bounds || !center) return;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      const viewLatSpan = ne.getLat() - sw.getLat();
      const viewLngSpan = ne.getLng() - sw.getLng();

      let minLat = KOREA_BOUNDS.sw.lat + viewLatSpan / 2;
      let maxLat = KOREA_BOUNDS.ne.lat - viewLatSpan / 2;
      
      let minLng = KOREA_BOUNDS.sw.lng + viewLngSpan / 2;
      let maxLng = KOREA_BOUNDS.ne.lng - viewLngSpan / 2;

      let lat = center.getLat();
      let lng = center.getLng();
      let isChanged = false;

      // viewport가 KOREA_BOUNDS보다 크면 강하게 중심을 잡지 않고 여유를 줌으로써
      // 상하 통통 튀는 무한 바운스를 방지합니다 (단, 한반도 좌표 안에만 머물게 느슨한 제한 추가)
      if (minLat > maxLat) {
        minLat = KOREA_BOUNDS.sw.lat;
        maxLat = KOREA_BOUNDS.ne.lat;
      }
      if (minLng > maxLng) {
        minLng = KOREA_BOUNDS.sw.lng;
        maxLng = KOREA_BOUNDS.ne.lng;
      }

      if (lat < minLat - 0.0001) { lat = minLat; isChanged = true; }
      else if (lat > maxLat + 0.0001) { lat = maxLat; isChanged = true; }

      if (lng < minLng - 0.0001) { lng = minLng; isChanged = true; }
      else if (lng > maxLng + 0.0001) { lng = maxLng; isChanged = true; }

      if (isChanged) {
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      }
    };

    kakao.maps.event.addListener(map, "center_changed", restrictBounds);

    return () => {
      kakao.maps.event.removeListener(map, "center_changed", restrictBounds);
    };
  }, [ready, viewportDebounceMs, onViewportChangeRef]);

  // 3) center prop → panTo 동기화
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!ready || !kakao || !map || disableAutoPan) return;

    if (firstCenterSyncRef.current) {
      firstCenterSyncRef.current = false;
      return;
    }

    const current = map.getCenter?.();
    const next = new kakao.maps.LatLng(center.lat, center.lng);

    if (
      current &&
      current.getLat() === next.getLat() &&
      current.getLng() === next.getLng()
    ) {
      return;
    }

    const raf = requestAnimationFrame(() => {
      isProgrammaticPanRef.current = true;
      map.panTo(next);
      setTimeout(() => {
        isProgrammaticPanRef.current = false;
      }, 500);
    });
    return () => cancelAnimationFrame(raf);
  }, [center.lat, center.lng, disableAutoPan, ready]);

  // ─────────────────────────────────────────────
  // 검색 컨트롤러 생성 (ready / toast 변화에만 재생성)
  // ─────────────────────────────────────────────
  const { searchPlace, clearLastMarker } = useMemo(
    () =>
      createSearchController({
        kakaoRef,
        mapRef,
        geocoderRef,
        placesRef,
        maxLevelRef,
        lastSearchMarkerRef,
        toast,
        isReady: ready,
      }),
    [ready, toast]
  );

  // 외부 제어 API
  const panTo = useCallback((p: LatLng) => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const next = new kakao.maps.LatLng(p.lat, p.lng);
    const cur = map.getCenter?.();
    if (
      !cur ||
      cur.getLat() !== next.getLat() ||
      cur.getLng() !== next.getLng()
    ) {
      isProgrammaticPanRef.current = true;
      map.panTo(next);
      setTimeout(() => {
        isProgrammaticPanRef.current = false;
      }, 500);
    }
  }, []);

  const fitBounds = useCallback((points: LatLng[]) => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map || !points?.length) return;
    const b = new kakao.maps.LatLngBounds();
    points.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
    isProgrammaticPanRef.current = true;
    map.setBounds(b);
    setTimeout(() => {
      isProgrammaticPanRef.current = false;
    }, 500);
  }, []);

  const setMaxLevel = useCallback((maxLv: number) => {
    const map = mapRef.current;
    if (!map) return;
    maxLevelRef.current = maxLv;
    map.setMaxLevel(maxLv);
    const lv = map.getLevel?.();
    if (typeof lv === "number" && lv > maxLv) {
      map.setLevel(maxLv);
    }
  }, []);

  const api = useMemo(
    () => ({
      containerRef,
      kakao: kakaoRef.current,
      map: mapRef.current,
      ready,
      searchPlace,
      clearLastMarker,
      panTo,
      fitBounds,
      setMaxLevel,
    }),
    [ready, searchPlace, clearLastMarker, panTo, fitBounds, setMaxLevel]
  );

  return api;
};

export default useKakaoMap;
export type { SearchOptions };
