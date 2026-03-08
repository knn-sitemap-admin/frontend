"use client";

import { useMemo } from "react";
import type { PinKind } from "@/features/pins/types";
import { mapBadgeToPinKind } from "@/features/properties/lib/badge";
import { getDisplayPinKind } from "@/features/pins/lib/getDisplayPinKind";
import { distM } from "@/features/map/poi/lib/geometry";
import { MapMarker } from "../../shared/types/mapMarker.type";

/** kakao LatLng/Point 등 다양한 포맷을 좌표 객체로 정규화 */
function toNumericPos(pos: any) {
  if (!pos) return pos;
  if (typeof pos.lat === "number" && typeof pos.lng === "number") return pos;
  if (typeof pos.getLat === "function" && typeof pos.getLng === "function") {
    return { lat: pos.getLat(), lng: pos.getLng() };
  }
  if (typeof pos.lat === "function" && typeof pos.lng === "function") {
    return { lat: pos.lat(), lng: pos.lng() };
  }
  if (typeof pos.y === "number" && typeof pos.x === "number") {
    return { lat: pos.y, lng: pos.x };
  }
  return pos;
}

const posKey = (lat: number, lng: number) =>
  `${lat.toFixed(5)},${lng.toFixed(5)}`;

/** 컨텍스트 메뉴 판정을 위한 메타 포함 타입 */
export type MergedMarker = {
  id: string | number;
  lat: number;
  lng: number;
  name?: string;
  title?: string;
  /** 출처 (실매물 or 임시핀) */
  source: "point" | "draft";
  /** 임시핀일 때 상태 */
  draftState?: "BEFORE" | "SCHEDULED";
  /** 🔹 신축/구옥 정보 (실매물에만 사용) */
  ageType?: "NEW" | "OLD" | null;
};

export function useMergedMarkers(params: {
  localMarkers: MapMarker[];
  serverPoints?: Array<{
    id: string | number;
    name?: string | null; // 🔹 매물명
    title?: string | null; // 🔹 있으면 부제/지역 정도로 사용
    lat: number;
    lng: number;
    badge?: string | null;
    /** 서버에서 직접 내려줄 수도 있는 pinKind (있으면 최우선) */
    pinKind?: PinKind | null;
    /** 🔹 서버에서 내려주는 신축/구옥 정보 */
    ageType?: "NEW" | "OLD" | null;
    address?: string | null; // 🔹 추가: 주소
    isCompleted?: boolean;
  }>;
  serverDrafts?: Array<{
    id: string | number;
    name?: string | null;
    title?: string | null;
    lat: number;
    lng: number;
    draftState?: "BEFORE" | "SCHEDULED";
    badge?: string | null;
    address?: string | null; // 🔹 추가: 주소
    isCompleted?: boolean;
  }>;
  menuOpen: boolean;
  menuAnchor?: { lat: number; lng: number } | null;
  /** 🔹 MapMenu 필터 키 (예: "all" | "new" | "old" | "plannedOnly" | "planned") */
  filterKey?: string;
  /** 🔹 이번 메뉴가 어떤 마커 기준으로 열렸는지 (실제 핀 id / "__draft__" / "__search__") */
  menuTargetId?: string | number | null;
}) {
  const {
    localMarkers,
    serverPoints,
    serverDrafts,
    menuOpen,
    menuAnchor,
    filterKey,
    menuTargetId,
  } = params;

  const isBeforeMode = filterKey === "plannedOnly";
  const isPlannedMode = filterKey === "planned";

  /** 🔸 신축/구옥 필터일 때는 draft(답사예정핀) 자체를 숨김 */
  const hideDraftsForAgeFilter = filterKey === "new" || filterKey === "old";

  // 1) 판정용 메타 배열 (id/좌표/출처/상태/ageType)
  const mergedMeta: MergedMarker[] = useMemo(() => {
    const effectivePoints =
      isBeforeMode || isPlannedMode ? [] : serverPoints ?? [];

    const effectiveDrafts =
      hideDraftsForAgeFilter || !serverDrafts
        ? []
        : (serverDrafts ?? []).filter((d) => {
            const state = d.draftState as "BEFORE" | "SCHEDULED" | undefined;
            if (isBeforeMode) return state === "BEFORE";
            if (isPlannedMode) return state === "SCHEDULED";
            return true;
          });

    const normals: MergedMarker[] = effectivePoints.map((p) => {
      const name = (p.name ?? "").trim(); // 🔹 매물명
      const title = (p.title ?? "").trim(); // 🔹 주소/부제

      return {
        id: p.id,
        name: name || title, // 이름 없으면 title로 보충
        title, // 주소는 title에만
        lat: p.lat,
        lng: p.lng,
        source: "point",
        ageType: p.ageType ?? null,
      };
    });

    const drafts: MergedMarker[] = effectiveDrafts.map((d) => {
      const name = (d.name ?? "").trim();
      const title = (d.title ?? "").trim();
      const displayName = name || title || "답사예정";
      return {
        id: d.id,
        name: displayName,
        title: title || displayName,
        lat: d.lat,
        lng: d.lng,
        source: "draft",
        draftState: d.draftState,
      };
    });

    return [...normals, ...drafts];
  }, [
    serverPoints,
    serverDrafts,
    isBeforeMode,
    isPlannedMode,
    hideDraftsForAgeFilter,
  ]);

  // 2) 실제 지도에 뿌릴 마커 배열 (아이콘/타입 포함)
  const serverViewMarkers: MapMarker[] = useMemo(() => {
    const effectivePoints =
      isBeforeMode || isPlannedMode ? [] : serverPoints ?? [];

    const effectiveDrafts =
      hideDraftsForAgeFilter || !serverDrafts
        ? []
        : (serverDrafts ?? []).filter((d) => {
            const state = d.draftState as "BEFORE" | "SCHEDULED" | undefined;
            if (isBeforeMode) return state === "BEFORE";
            if (isPlannedMode) return state === "SCHEDULED";
            return true;
          });

    const normals: MapMarker[] = effectivePoints.map((p) => {
      // 🔥 여기서 **항상 서버 응답 기준**으로 kind 결정
      const baseFromServer =
        (p.pinKind as PinKind | null | undefined) ??
        (mapBadgeToPinKind(p.badge, p.isCompleted) as PinKind | null | undefined);

      const baseKind: PinKind = (baseFromServer ?? "1room") as PinKind;
      const displayKind = getDisplayPinKind(baseKind, p.ageType ?? null);
      const kind: PinKind = (displayKind ?? baseKind) as PinKind;

      const name = (p.name ?? "").trim();
      const title = (p.title ?? "").trim();

      return {
        id: String(p.id),
        name: name || title, // ✅ 라벨에 들어갈 텍스트
        title, // ✅ 주소/부제는 title 에만
        position: { lat: p.lat, lng: p.lng },
        kind, // ✅ 최신 badge/ageType 반영된 pinKind
        address: (p as any).addressLine ?? p.address ?? undefined, // 🔹 지역 클러스터링을 위해 주소 추가
        badge: p.badge,
        isCompleted: p.isCompleted,
      };
    });

    const drafts: MapMarker[] = effectiveDrafts.map((d) => {
      const kindFromBadge = mapBadgeToPinKind(d.badge);
      const fallback: PinKind = "question";
      const kind: PinKind = (kindFromBadge ?? fallback) as PinKind;

      const name = (d.name ?? "").trim();
      const title = (d.title ?? "").trim();
      const label = name || title || "답사예정";

      return {
        id: `__visit__${String(d.id)}`,
        name: label,
        title: title || label,
        position: { lat: d.lat, lng: d.lng },
        kind,
        address: (d as any).addressLine ?? d.address ?? undefined, // 🔹 지역 클러스터링을 위해 주소 추가
        badge: d.badge,
        isCompleted: d.isCompleted,
      };
    });

    return [...normals, ...drafts];
  }, [
    serverPoints,
    serverDrafts,
    isBeforeMode,
    isPlannedMode,
    hideDraftsForAgeFilter,
  ]);

  // 3) 로컬 마커와 서버 마커 병합 (⚠️ 서버 우선)
  const mergedMarkers: MapMarker[] = useMemo(() => {
    const byId = new Map<string, MapMarker>();

    // ⭐ 1) 서버 마커를 먼저 넣고 → 이 값이 “진실”이 되게 만든다.
    serverViewMarkers.forEach((m) => {
      const id = String(m.id);
      byId.set(id, {
        ...m,
        position: toNumericPos((m as any).position),
      });
    });

    // ⭐ 2) 로컬 마커는 서버에 **없는 id**에 대해서만 추가
    localMarkers.forEach((m) => {
      const id = String(m.id);
      if (byId.has(id)) return; // 동일 id 는 서버 값 유지
      byId.set(id, {
        ...m,
        position: toNumericPos((m as any).position),
      });
    });

    return Array.from(byId.values());
  }, [localMarkers, serverViewMarkers]);

  // 4) 컨텍스트 메뉴 열릴 때 임시 선택 위치를 question 아이콘으로 추가
  const mergedWithTempDraft: MapMarker[] = useMemo(() => {
    if (!(menuOpen && menuAnchor)) return mergedMarkers;

    const targetIdStr = menuTargetId != null ? String(menuTargetId) : undefined;

    // 🔹 이번 메뉴가 "실제 매물 핀" 기준으로 열린 거면
    //    임시 question 핀은 아예 만들지 않는다.
    if (
      targetIdStr &&
      targetIdStr !== "__draft__" &&
      targetIdStr !== "__search__"
    ) {
      return mergedMarkers;
    }

    // 🔹 검색(__search__)으로 연 메뉴는 핀 없음. 저장 시에만 핀 생성.
    if (targetIdStr === "__search__") {
      return mergedMarkers;
    }

    // 🔹 1) 앵커 근처에 "실제 매물 핀" 이 하나라도 있으면 임시핀 만들지 않기
    //    → 여유 있게 150m 이내면 같은 위치로 간주
    const NEAR_THRESHOLD_M = 150;

    const hasRealMarkerNearAnchor = mergedMarkers.some((m) => {
      const id = String(m.id ?? "");

      // 내부용 임시 id 들은 “실제 핀”에서 제외
      if (
        id === "__draft__" ||
        id === "__search__" ||
        id.startsWith("__visit__")
      )
        return false;

      const p: any = (m as any).position ?? m;
      const lat =
        typeof p.getLat === "function"
          ? p.getLat()
          : (p.lat as number | undefined);
      const lng =
        typeof p.getLng === "function"
          ? p.getLng()
          : (p.lng as number | undefined);
      if (typeof lat !== "number" || typeof lng !== "number") return false;

      return (
        distM(menuAnchor.lat, menuAnchor.lng, lat, lng) <= NEAR_THRESHOLD_M
      );
    });

    if (hasRealMarkerNearAnchor) {
      return mergedMarkers;
    }

    // 🔹 2) 완전히 같은 좌표에 이미 마커가 있으면 임시핀 추가 안 함
    const targetKey = posKey(menuAnchor.lat, menuAnchor.lng);

    const hasSamePosKey = mergedMarkers.some((m) => {
      const p: any = (m as any).position ?? m;
      const lat = typeof p.getLat === "function" ? p.getLat() : p.lat;
      const lng = typeof p.getLng === "function" ? p.getLng() : p.lng;
      return posKey(lat, lng) === targetKey;
    });

    if (hasSamePosKey) return mergedMarkers;

    // 🔹 3) 근처에 이미 question/visit 임시핀 있으면 또 만들지 않기
    const EPS = 1e-5;
    const overlapWithDraft = mergedMarkers.some((m) => {
      const id = String(m.id ?? "");
      const kind = (m as any).kind;
      const p: any = (m as any).position ?? m;
      const lat = typeof p.getLat === "function" ? p.getLat() : p.lat;
      const lng = typeof p.getLng === "function" ? p.getLng() : p.lng;
      const near =
        Math.abs(lat - menuAnchor.lat) < EPS &&
        Math.abs(lng - menuAnchor.lng) < EPS;
      return near && (kind === "question" || id.startsWith("__visit__"));
    });

    if (overlapWithDraft) return mergedMarkers;

    // 🔹 4) 진짜 맵 빈 곳을 클릭해서 메뉴를 연 경우에만 임시 question 핀 추가
    return [
      ...mergedMarkers,
      {
        id: "__draft__",
        title: "선택 위치",
        position: { lat: menuAnchor.lat, lng: menuAnchor.lng },
        kind: "question" as PinKind,
        address: undefined, // 임시핀은 주소 없음
      },
    ];
  }, [mergedMarkers, menuOpen, menuAnchor, menuTargetId]);

  return { mergedMarkers, mergedWithTempDraft, mergedMeta };
}
