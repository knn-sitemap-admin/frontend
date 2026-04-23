import { PropertyViewDetails } from "@/features/properties/view/types";

/* 🔍 사이드바 → 지도 포커스 공통 레벨 */
export const TARGET_FOCUS_LEVEL = 4;

type FocusArgs = {
  kakaoSDK: any;
  mapInstance: any;
  lat: number;
  lng: number;
  level?: number;
};

/**
 * 주어진 좌표로 지도 포커스 + 레벨 맞추기
 */
export function focusMapToPosition({
  kakaoSDK,
  mapInstance,
  lat,
  lng,
  level = TARGET_FOCUS_LEVEL,
}: FocusArgs) {
  if (!kakaoSDK || !mapInstance) return;

  try {
    const ll = new kakaoSDK.maps.LatLng(lat, lng);
    const current = mapInstance.getLevel?.();

    if (typeof current === "number" && current !== level) {
      // 줌 레벨이 다를 경우(보통 첫 클릭): 애니메이션을 주면 panTo와 충돌하여 씹히므로 즉시 꽂아줌
      mapInstance.setLevel(level);
      mapInstance.setCenter(ll);
    } else {
      // 줌 레벨이 이미 같을 경우(보통 두 번째 이후 클릭): 부드럽게 스르륵 이동
      mapInstance.panTo(ll);
    }
  } catch (e) {
    console.error("[focusMapToPosition] map 이동 실패:", e);
  }
}

/**
 * 뷰 모달에서 항상 editInitial.view 가 들어있도록 보정
 */
export function ensureViewForEdit(
  v: PropertyViewDetails | (PropertyViewDetails & { editInitial?: any }) | null
): (PropertyViewDetails & { editInitial: any }) | null {
  if (!v) return null;

  const id = (v as any).id ?? (v as any)?.view?.id ?? undefined;
  const view = { ...(v as any), ...(id != null ? { id } : {}) };

  if ((view as any).editInitial?.view) {
    return view as any;
  }
  return {
    ...(view as any),
    editInitial: { view: { ...(view as any) } },
  } as any;
}
