"use client";

import * as React from "react";
import ReactDOM from "react-dom/client";
import type { LucideProps } from "lucide-react";

import type { PoiKind, PoiPoint } from "../../poi/lib/poiTypes";
import {
  POI_BG,
  POI_ICON_COMP,
  POI_LABEL,
  calcPoiSizeByLevel,
} from "../../poi/lib/poiMeta";

/** 오버레이 내용: React 컴포넌트(재렌더로만 갱신 → 깜빡임 최소화) */
function PoiBubble({
  kind,
  size,
  iconSize,
  onClick,
}: {
  kind: PoiKind;
  size: number;
  iconSize: number;
  onClick?: () => void;
}) {
  const Icon = POI_ICON_COMP[kind];
  return (
    <div
      onClick={onClick}
      role="img"
      aria-label={POI_LABEL[kind]}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: POI_BG[kind],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        color: "#fff",
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {Icon ? (
        <Icon
          size={iconSize as LucideProps["size"]}
          strokeWidth={2.25}
          color="#fff"
        />
      ) : (
        <span
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: "9999px",
            border: "2px solid rgba(255, 255, 255, 0.9)",
          }}
        />
      )}
    </div>
  );
}

/** 하나의 CustomOverlay 생성 */
export function createPoiOverlay(
  kakaoSDK: typeof window.kakao,
  map: kakao.maps.Map,
  poi: PoiPoint,
  opts?: { onClick?: (poiId: string) => void; size?: number; iconSize?: number }
) {
  let curKind: PoiKind = poi.kind;
  let curSize = opts?.size ?? 32;
  let curIconSize = opts?.iconSize ?? 16;

  // DOM 컨테이너 & React root (한 번만 생성)
  const el = document.createElement("div");
  el.style.position = "relative";
  const root = ReactDOM.createRoot(el);

  const render = () => {
    root.render(
      <PoiBubble
        kind={curKind}
        size={curSize}
        iconSize={curIconSize}
        onClick={opts?.onClick ? () => opts.onClick!(poi.id) : undefined}
      />
    );
  };
  render();

  const overlay = new kakaoSDK.maps.CustomOverlay({
    position: new kakaoSDK.maps.LatLng(poi.lat, poi.lng),
    content: el,
    xAnchor: 0.5,
    yAnchor: 1.0,
    zIndex: poi.zIndex ?? 3,
  });
  overlay.setMap(map);

  /** 제거 */
  const destroy = () => {
    overlay.setMap(null);
    // ✅ React 18: 렌더링 주기와 충돌 방지를 위해 unmount를 지연 호출
    setTimeout(() => {
      try {
        root.unmount();
      } catch (e) {
        // 이미 언마운트된 경우 등 예외 처리
      }
    }, 0);
  };

  /** 변경 사항 반영(위치/zIndex/종류/크기) — React root는 재사용 */
  const update = (
    next: Partial<PoiPoint> & { size?: number; iconSize?: number }
  ) => {
    if (typeof next.lat === "number" && typeof next.lng === "number") {
      overlay.setPosition(new kakaoSDK.maps.LatLng(next.lat, next.lng));
    }
    if (typeof next.zIndex === "number") {
      overlay.setZIndex(next.zIndex);
    }

    let needRender = false;
    if (next.kind && next.kind !== curKind) {
      curKind = next.kind as PoiKind;
      needRender = true;
    }
    if (typeof next.size === "number" && next.size !== curSize) {
      curSize = next.size;
      needRender = true;
    }
    if (typeof next.iconSize === "number" && next.iconSize !== curIconSize) {
      curIconSize = next.iconSize;
      needRender = true;
    }
    if (needRender) render();
  };

  /** 보여주기 / 숨기기 (destroy 없이 재사용) */
  const show = () => {
    overlay.setMap(map);
  };

  const hide = () => {
    overlay.setMap(null);
  };

  return { overlay, update, destroy, show, hide };
}

/** 여러 개를 관리하는 훅 (id 기준 diff + 캐싱) */
export function usePoiOverlays(params: {
  kakaoSDK: typeof window.kakao | null;
  map: kakao.maps.Map | null;
  pois: PoiPoint[];
  /** 주변시설 토글 ON/OFF */
  enabled: boolean;
  onClick?: (poiId: string) => void;
}) {
  const { kakaoSDK, map, pois, enabled } = params;

  // ✅ onClick이 바뀌어도 오버레이를 재생성하지 않도록 ref로 고정
  const onClickRef = React.useRef(params.onClick);
  React.useEffect(() => {
    onClickRef.current = params.onClick;
  }, [params.onClick]);

  type OverlayInst = {
    destroy: () => void;
    update: (
      p: Partial<PoiPoint> & { size?: number; iconSize?: number }
    ) => void;
    show: () => void;
    hide: () => void;
    visible: boolean;
  };

  const overlaysRef = React.useRef<Map<string, OverlayInst>>(new Map());

  // upsert / show / hide
  React.useEffect(() => {
    if (!kakaoSDK || !map) return;

    const overlays = overlaysRef.current;

    // 🔹 1) 주변시설 토글이 꺼진 경우: 전부 숨기고 끝
    if (!enabled) {
      for (const [, inst] of overlays) {
        if (inst.visible) {
          inst.hide();
          inst.visible = false;
        }
      }
      return;
    }

    // 🔹 2) 토글은 켜져 있지만, 로딩 때문에 pois가 잠깐 빈 배열일 수 있음
    //  → 이때는 "기존 것 유지"해서 깜빡임 방지
    const isEmpty = pois.length === 0;

    const nextIds = new Set<string>(pois.map((p) => p.id));

    // upsert + show
    for (const p of pois) {
      const ex = overlays.get(p.id);
      if (ex) {
        ex.update({
          lat: p.lat,
          lng: p.lng,
          zIndex: p.zIndex,
          kind: p.kind,
        });
        if (!ex.visible) {
          ex.show();
          ex.visible = true;
        }
      } else {
        const { destroy, update, show, hide } = createPoiOverlay(
          kakaoSDK,
          map,
          p,
          {
            onClick: (id) => onClickRef.current?.(id),
          }
        );
        overlays.set(p.id, { destroy, update, show, hide, visible: true });
      }
    }

    // stale 처리
    if (!isEmpty) {
      for (const [id, inst] of overlays.entries()) {
        if (!nextIds.has(id) && inst.visible) {
          inst.hide();
          inst.visible = false;
        }
      }
    }

    return () => {
      // SDK/Map 교체 시에만 진짜 destroy
      for (const [, inst] of overlays) {
        inst.destroy();
      }
      overlays.clear();
    };
  }, [kakaoSDK, map, enabled, pois]);

  // ✅ 줌 레벨에 따른 크기 자동 스케일링
  React.useEffect(() => {
    if (!kakaoSDK || !map) return;

    const applyZoomSize = () => {
      const level = map.getLevel();
      const { size, iconSize } = calcPoiSizeByLevel(level);
      for (const [, inst] of overlaysRef.current) {
        inst.update({ size, iconSize });
      }
    };

    kakaoSDK.maps.event.addListener(map, "zoom_changed", applyZoomSize);
    applyZoomSize(); // 초기 1회

    return () => {
      kakaoSDK.maps.event.removeListener(map, "zoom_changed", applyZoomSize);
    };
  }, [kakaoSDK, map]);

  return { count: overlaysRef.current.size };
}

/* ───────────── 외부에서 쓰던 것들 re-export (기존 import 안 깨지게) ───────────── */

export type { PoiKind, PoiPoint } from "../../poi/lib/poiTypes";
export {
  POI_LABEL,
  KAKAO_CATEGORY,
  KAKAO_KEYWORD,
  POI_ICON,
} from "../../poi/lib/poiMeta";
