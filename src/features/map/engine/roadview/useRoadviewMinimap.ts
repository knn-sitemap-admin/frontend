"use client";

import { useEffect, useRef } from "react";
import { installHttpsImagePatch } from "../hooks/useKakaoMap/httpsPatch";

type UseRoadviewMinimapProps = {
  open: boolean;
  kakaoSDK?: any;
  mapInstance?: any;
  roadviewRef: React.MutableRefObject<any>;
};

export function useRoadviewMinimap({
  open,
  kakaoSDK,
  mapInstance,
  roadviewRef,
}: UseRoadviewMinimapProps) {
  const minimapContainerRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const roadviewListenersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!open || !kakaoSDK || !mapInstance || !minimapContainerRef.current) {
      // 미니맵 정리
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (minimapRef.current) {
        if (minimapRef.current._hasRoadviewLayer && kakaoSDK) {
          minimapRef.current.removeOverlayMapTypeId(
            kakaoSDK.maps.MapTypeId.ROADVIEW
          );
        }
        if (minimapRef.current.__detachHttpsPatch__) {
          minimapRef.current.__detachHttpsPatch__();
        }
        minimapRef.current = null;
      }
      // 이벤트 리스너 정리
      if (kakaoSDK && roadviewRef.current) {
        roadviewListenersRef.current.forEach((listenerObj) => {
          if (listenerObj) {
            try {
              kakaoSDK.maps.event.removeListener(
                roadviewRef.current,
                listenerObj.event,
                listenerObj.listener
              );
            } catch (e) {
              // ignore
            }
          }
        });
      }
      roadviewListenersRef.current = [];
      return;
    }

    const kakao = kakaoSDK;
    const container = minimapContainerRef.current;
    if (!container) return;

    // 미니맵 생성
    if (!minimapRef.current) {
      let center: any;
      let level: number;

      try {
        const mainCenter = mapInstance.getCenter();
        center = new kakao.maps.LatLng(
          mainCenter.getLat(),
          mainCenter.getLng()
        );
        level = mapInstance.getLevel();
      } catch (e) {
        center = new kakao.maps.LatLng(37.5665, 126.978);
        level = 4;
      }

      const mapOptions = {
        center,
        level,
        mapTypeId: kakao.maps.MapTypeId.ROADMAP,
      };

      try {
        minimapRef.current = new kakao.maps.Map(container, mapOptions);

        // 미니맵 클릭 시 로드뷰 위치 이동
        kakao.maps.event.addListener(
          minimapRef.current,
          "click",
          (mouseEvent: any) => {
            const position = mouseEvent.latLng;
            const rvClient = new kakao.maps.RoadviewClient();
            rvClient.getNearestPanoId(
              position,
              50,
              (panoId: number | null) => {
                if (panoId && roadviewRef.current) {
                  roadviewRef.current.setPanoId(panoId, position);
                }
              }
            );
          }
        );

        // 미니맵 컨테이너에 HTTPS 패치 적용
        try {
          const detach = installHttpsImagePatch(container);
          minimapRef.current.__detachHttpsPatch__ = detach;
        } catch (e) {
          console.warn("[RoadviewHost] 미니맵 HTTPS 패치 적용 실패:", e);
        }

        // 파란색 로드뷰 선 추가
        if (!minimapRef.current._hasRoadviewLayer) {
          try {
            minimapRef.current.addOverlayMapTypeId(
              kakao.maps.MapTypeId.ROADVIEW
            );
            minimapRef.current._hasRoadviewLayer = true;
          } catch (e) {
            console.error(
              "[RoadviewHost] 미니맵 ROADVIEW 타입 추가 실패 (init):",
              e
            );
          }
        }

        // relayout
        requestAnimationFrame(() => {
          if (minimapRef.current) {
            try {
              minimapRef.current.relayout();
            } catch (e) {}
          }
        });
      } catch (e) {
        console.error("[RoadviewHost] 미니맵 생성 실패:", e);
      }
    } else {
      // 기존 맵
      requestAnimationFrame(() => {
        if (minimapRef.current) {
          try {
            minimapRef.current.relayout();
          } catch (e) {}
        }
      });

      if (minimapRef.current && !minimapRef.current._hasRoadviewLayer) {
        try {
          minimapRef.current.addOverlayMapTypeId(
            kakao.maps.MapTypeId.ROADVIEW
          );
          minimapRef.current._hasRoadviewLayer = true;
        } catch (e) {}
      }
    }

    const createMarker = (position: any) => {
      if (markerRef.current) return;
      if (!minimapRef.current) return;

      try {
        if (!position) {
          position = minimapRef.current.getCenter();
        }

        if (position) {
          const lat = position.getLat ? position.getLat() : position.lat;
          const lng = position.getLng ? position.getLng() : position.lng;
          const markerPos = new kakao.maps.LatLng(lat, lng);

          const markImage = new kakao.maps.MarkerImage(
            "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png",
            new kakao.maps.Size(26, 46),
            {
              spriteSize: new kakao.maps.Size(1666, 168),
              spriteOrigin: new kakao.maps.Point(705, 114),
              offset: new kakao.maps.Point(13, 46),
            }
          );

          const marker = new kakao.maps.Marker({
            image: markImage,
            position: markerPos,
            map: minimapRef.current,
            zIndex: 1000,
            draggable: true,
          });
          markerRef.current = marker;

          // 마커 드래그 시 로드뷰 이동
          kakao.maps.event.addListener(marker, "dragend", () => {
            const position = marker.getPosition();
            const rvClient = new kakao.maps.RoadviewClient();
            rvClient.getNearestPanoId(
              position,
              50,
              (panoId: number | null) => {
                if (panoId && roadviewRef.current) {
                  roadviewRef.current.setPanoId(panoId, position);
                } else {
                  const currentRvPos = roadviewRef.current?.getPosition();
                  if (currentRvPos) {
                    marker.setPosition(currentRvPos);
                  }
                }
              }
            );
          });
        }
      } catch (e) {}
    };

    const updateMarkerPosition = () => {
      if (!roadviewRef.current || !minimapRef.current) return;

      try {
        const position = roadviewRef.current.getPosition();
        if (position) {
          if (!markerRef.current) {
            createMarker(position);
          }
          if (markerRef.current) {
            const lat = position.getLat();
            const lng = position.getLng();
            const newPos = new kakao.maps.LatLng(lat, lng);
            markerRef.current.setPosition(newPos);
            minimapRef.current.setCenter(newPos);
          }
        }
      } catch (e) {}
    };

    const onInit = () => {
      if (!roadviewRef.current || !minimapRef.current) return;

      const hasPositionListener = roadviewListenersRef.current.some(
        (l) => l.event === "position_changed"
      );

      if (hasPositionListener) {
        updateMarkerPosition();
        return;
      }

      try {
        const position = roadviewRef.current.getPosition();
        if (position) {
          createMarker(position);
          updateMarkerPosition();
        }

        const positionChangedHandler = () => {
          updateMarkerPosition();
        };

        const positionChangedListener = kakao.maps.event.addListener(
          roadviewRef.current,
          "position_changed",
          positionChangedHandler
        );

        roadviewListenersRef.current.push({
          event: "position_changed",
          listener: positionChangedListener,
        });
      } catch (e) {}
    };

    if (!roadviewRef.current) {
      const checkInterval = setInterval(() => {
        if (roadviewRef.current && minimapRef.current) {
          clearInterval(checkInterval);

          const hasInitListener = roadviewListenersRef.current.some(
            (l) => l.event === "init"
          );

          if (!hasInitListener) {
            const initListener = kakao.maps.event.addListener(
              roadviewRef.current,
              "init",
              onInit
            );

            roadviewListenersRef.current.push({
              event: "init",
              listener: initListener,
            });

            try {
              if (roadviewRef.current.getPosition()) {
                onInit();
              }
            } catch (e) {}
          }
        }
        if (!open) {
          clearInterval(checkInterval);
        }
      }, 100);

      setTimeout(() => clearInterval(checkInterval), 3000);
      return () => clearInterval(checkInterval);
    }

    const hasInitListener = roadviewListenersRef.current.some(
      (l) => l.event === "init"
    );

    if (hasInitListener) return;

    try {
      if (roadviewRef.current.getPosition()) {
        onInit();
      } else {
        const initListener = kakao.maps.event.addListener(
          roadviewRef.current,
          "init",
          onInit
        );
        roadviewListenersRef.current.push({
          event: "init",
          listener: initListener,
        });
      }
    } catch (e) {
      const initListener = kakao.maps.event.addListener(
        roadviewRef.current,
        "init",
        onInit
      );
      roadviewListenersRef.current.push({
        event: "init",
        listener: initListener,
      });
    }

    return () => {
      if (kakao && roadviewRef.current) {
        roadviewListenersRef.current.forEach((listenerObj) => {
          if (listenerObj) {
            try {
              kakao.maps.event.removeListener(
                roadviewRef.current,
                listenerObj.event,
                listenerObj.listener
              );
            } catch (e) {}
          }
        });
      }
      roadviewListenersRef.current = [];
    };
  }, [open, kakaoSDK, mapInstance, roadviewRef]);

  return minimapContainerRef;
}
