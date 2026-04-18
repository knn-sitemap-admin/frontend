type Entry = {
  el: HTMLElement;
  lat: number;
  lng: number;
  map: kakao.maps.Map;
};

type Zone = {
  map?: kakao.maps.Map; // ← 맵 미지정(글로벌)도 허용
  lat: number;
  lng: number;
  radius: number; // px
};

const entries = new Set<Entry>();
const activeZones = new Set<Zone>();

/**
 * 좌표 -> 화면 픽셀 좌표 변환 (Forced Reflow 유발 가능성이 크므로 최소화 필요)
 */
function containerPointFromLatLng(
  map: kakao.maps.Map,
  lat: number,
  lng: number,
  proj: any
) {
  const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(lat, lng));
  return { x: pt.x, y: pt.y };
}

/**
 * 두 지점 간의 픽셀 거리 계산
 * @param proj 성능을 위해 반드시 전달하는 것을 권장 (안 주면 내부에서 getProjection 호출하여 리플로우 발생 가능)
 */
function distPx(
  map: kakao.maps.Map,
  a: { lat: number; lng: number } | { x: number; y: number },
  b: { lat: number; lng: number },
  proj: any
) {
  const aPt = ("x" in a) ? a : containerPointFromLatLng(map, (a as any).lat, (a as any).lng, proj);
  const bPt = containerPointFromLatLng(map, b.lat, b.lng, proj);
  return Math.hypot(aPt.x - bPt.x, aPt.y - bPt.y);
}

/**
 * 대략적인 위경도 거리 (픽셀 계산 전 필터링용)
 */
function isRoughlyClose(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  margin = 0.005
) {
  return Math.abs(a.lat - b.lat) < margin && Math.abs(a.lng - b.lng) < margin;
}

export function registerLabel(
  el: HTMLElement,
  lat: number,
  lng: number,
  map: kakao.maps.Map
) {
  entries.add({ el, lat, lng, map });
  el.dataset.mapLabel = "1";
  el.style.pointerEvents = "none";

  const proj = map.getProjection();
  const centerPt = containerPointFromLatLng(map, lat, lng, proj);

  // 이미 존재하는 억제영역에 들어오면 즉시 숨김
  for (const z of activeZones) {
    if (z.map && z.map !== map) continue;
    if (!isRoughlyClose(z, { lat, lng })) continue;

    // 4개 인자 모두 전달 (map, a, b, proj)
    if (distPx(map, centerPt, { lat: z.lat, lng: z.lng }, proj) <= z.radius) {
      el.classList.add("hidden");
      break;
    }
  }
}

export function unregisterLabel(el: HTMLElement) {
  for (const e of entries) {
    if (e.el === el) {
      entries.delete(e);
      break;
    }
  }
}

/** 특정 map에만 적용 */
export function hideLabelsAround(
  map: kakao.maps.Map,
  lat: number,
  lng: number,
  radiusPx = 36
) {
  activeZones.add({ map, lat, lng, radius: radiusPx });

  const proj = map.getProjection();
  const centerPt = containerPointFromLatLng(map, lat, lng, proj);

  for (const e of entries) {
    if (e.map !== map) continue;
    if (!isRoughlyClose(e, { lat, lng })) continue;

    if (distPx(map, centerPt, { lat: e.lat, lng: e.lng }, proj) <= radiusPx) {
      e.el.classList.add("hidden");
    }
  }
}

/** map 미지정: 모든 엔트리에 적용 (fallback) */
export function hideLabelsAroundAny(lat: number, lng: number, radiusPx = 36) {
  activeZones.add({ lat, lng, radius: radiusPx });

  for (const e of entries) {
    if (!isRoughlyClose(e, { lat, lng })) continue;
    const proj = e.map.getProjection();
    if (distPx(e.map, { lat: e.lat, lng: e.lng }, { lat, lng }, proj) <= radiusPx) {
      e.el.classList.add("hidden");
    }
  }
}

export function showLabelsAround(
  map: kakao.maps.Map,
  lat: number,
  lng: number,
  radiusPx = 48
) {
  const proj = map.getProjection();
  const centerPt = containerPointFromLatLng(map, lat, lng, proj);

  // 근처 억제영역 제거
  for (const z of activeZones) {
    if (z.map && z.map !== map) continue;
    if (!isRoughlyClose(z, { lat, lng })) continue;

    if (
      distPx(map, centerPt, { lat: z.lat, lng: z.lng }, proj) <=
      Math.max(4, Math.min(radiusPx, z.radius))
    ) {
      activeZones.delete(z);
    }
  }

  // 라벨 다시 보이게
  for (const e of entries) {
    if (e.map !== map) continue;
    if (!isRoughlyClose(e, { lat, lng })) continue;

    if (distPx(map, centerPt, { lat: e.lat, lng: e.lng }, proj) <= radiusPx) {
      e.el.classList.remove("hidden");
    }
  }
}

export function showLabelsAroundAny(lat: number, lng: number, radiusPx = 48) {
  const target = { lat, lng };

  for (const z of activeZones) {
    if (z.map) continue;
    if (isRoughlyClose(z, target)) {
      activeZones.delete(z);
    }
  }

  for (const e of entries) {
    if (!isRoughlyClose(e, target)) continue;
    const proj = e.map.getProjection();
    if (distPx(e.map, { lat: e.lat, lng: e.lng }, target, proj) <= radiusPx) {
      e.el.classList.remove("hidden");
    }
  }
}

// 전역 이벤트 핸들러 중복 등록 방지 플래그
let handlersAttached = false;

// 전역 이벤트 핸들러
export function attachLabelRegistryGlobalHandlers() {
  if (typeof window === "undefined") return;
  if (handlersAttached) return;
  handlersAttached = true;

  const hideHandler = (ev: Event) => {
    const d = (ev as CustomEvent).detail ?? {};
    const { map, lat, lng, radiusPx } = d;
    if (typeof lat === "number" && typeof lng === "number") {
      if (map) hideLabelsAround(map, lat, lng, radiusPx ?? 36);
      else hideLabelsAroundAny(lat, lng, radiusPx ?? 36);
    }
  };

  const showHandler = (ev: Event) => {
    const d = (ev as CustomEvent).detail ?? {};
    const { map, lat, lng, radiusPx } = d;
    if (typeof lat === "number" && typeof lng === "number") {
      if (map) showLabelsAround(map, lat, lng, radiusPx ?? 48);
      else showLabelsAroundAny(lat, lng, radiusPx ?? 48);
    }
  };

  window.addEventListener(
    "map:hide-labels-around",
    hideHandler as EventListener
  );
  window.addEventListener(
    "map:cleanup-overlays-at",
    showHandler as EventListener
  );
}
