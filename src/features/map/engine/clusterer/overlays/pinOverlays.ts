import { getPinUrl } from "@/features/pins/lib/assets";
import type { PinKind } from "@/features/pins/types";

import { mapBadgeToPinKind } from "@/features/properties/lib/badge";
import {
  applyHitboxStyles,
  applyLabelStyles,
  applyOrderBadgeToLabel,
} from "./overlayStyles";
import {
  HITBOX,
  LABEL,
  PIN_MARKER,
  Z,
} from "@/features/map/shared/constants/markerUi";

/** 1x1 투명 PNG (data URI) — 아이콘이 없어도 동일 규격 MarkerImage를 강제하기 위한 폴백 */
const TRANSPARENT_DOT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WJb3m8AAAAASUVORK5CYII=";

type CreateMarkerOpts = {
  isDraft: boolean;
  key: string;
  kind: PinKind; // 기존 파라미터 유지
  title?: string | null;
  badge?: string | null; // ✅ 서버에서 온 배지(예: "R3", "R4_TERRACE")
  isCompleted?: boolean;
};

export function createMarker(kakao: any, pos: any, opts: CreateMarkerOpts) {
  const mkOptions: any = {
    position: pos,
    title: opts.title ?? opts.key,
    zIndex: opts.isDraft ? Z.DRAFT_PIN : 0,
  };

  // ✅ badge → PinKind 매핑(있으면 우선 사용)
  const mappedKind = mapBadgeToPinKind(opts.badge, opts.isCompleted);
  const effectiveKind: PinKind = (mappedKind ?? opts.kind) as PinKind;

  // ✅ 항상 동일 규격의 Size/Offset을 강제
  const markerSize = new kakao.maps.Size(PIN_MARKER.size.w, PIN_MARKER.size.h);
  const markerOffset = new kakao.maps.Point(
    PIN_MARKER.offset.x,
    PIN_MARKER.offset.y
  );

  // ✅ 아이콘이 없거나 잘못된 경우에도 투명 PNG로 폴백 (컨텍스트 메뉴 기준점 안정화)
  const iconUrl = getPinUrl(effectiveKind) || TRANSPARENT_DOT;

  mkOptions.image = new kakao.maps.MarkerImage(iconUrl, markerSize, {
    offset: markerOffset,
  });

  return new kakao.maps.Marker(mkOptions);
}

/** 마커 아이콘(이미지) 업데이트 유틸 */
export function updateMarkerIcon(kakao: any, mk: any, opts: CreateMarkerOpts) {
  const mappedKind = mapBadgeToPinKind(opts.badge, opts.isCompleted);
  const effectiveKind: PinKind = (mappedKind ?? opts.kind) as PinKind;

  const markerSize = new kakao.maps.Size(PIN_MARKER.size.w, PIN_MARKER.size.h);
  const markerOffset = new kakao.maps.Point(
    PIN_MARKER.offset.x,
    PIN_MARKER.offset.y
  );

  const iconUrl = getPinUrl(effectiveKind) || TRANSPARENT_DOT;
  mk.setImage(
    new kakao.maps.MarkerImage(iconUrl, markerSize, {
      offset: markerOffset,
    })
  );
}

/**
 * 라벨 오버레이 생성
 * @param labelGapPx 라벨-핀 간격(px)
 * @param order 0-based 예약 순번(라벨 배지로 1-based로 표기). number가 아닐 경우 배지 미표시
 */
export function createLabelOverlay(
  kakao: any,
  pos: any,
  text: string,
  labelGapPx: number,
  order?: number | null
) {
  const labelEl = document.createElement("div");
  labelEl.className = "kakao-label";
  (labelEl as any).dataset.rawTitle = String(text ?? "");

  // ✅ 라벨-핀 간격은 CSS로만 처리 (좌표는 항상 pos 그대로)
  applyLabelStyles(labelEl as HTMLDivElement, labelGapPx);

  const orderNum =
    typeof order === "number" && Number.isFinite(order) ? order : undefined;
  applyOrderBadgeToLabel(labelEl as HTMLDivElement, text, orderNum);

  // ✅ 제목 span만 복원 (외부 래퍼/배지는 건드리지 않음)
  try {
    const mo = new MutationObserver(() => {
      const want = (labelEl as any).dataset?.rawTitle ?? "";
      const titleEl = labelEl.querySelector(
        '[data-role="label-title"]'
      ) as HTMLSpanElement | null;
      if (!titleEl) return;
      const now = titleEl.textContent ?? "";
      if (now !== want) titleEl.textContent = want;
    });
    mo.observe(labelEl, { characterData: true, subtree: true });
  } catch {}

  return new kakao.maps.CustomOverlay({
    position: pos, // ✅ 핀과 같은 LatLng
    content: labelEl,
    xAnchor: 0.5, // 가운데 정렬
    yAnchor: 1, // 아래 기준 (핀 위쪽으로 뜸)
    zIndex: LABEL.Z_INDEX,
  });
}

export function createHitboxOverlay(
  kakao: any,
  pos: any,
  hitboxSizePx: number,
  onClick: () => void
) {
  const hitEl = document.createElement("div");
  hitEl.className = "kakao-hitbox";

  applyHitboxStyles(hitEl as HTMLDivElement, hitboxSizePx);

  // 클릭 받게
  hitEl.style.pointerEvents = "auto";

  // ❌ 삭제: hitEl.style.zIndex = "0";

  hitEl.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  });

  return new kakao.maps.CustomOverlay({
    position: pos,
    content: hitEl,
    xAnchor: 0.5,
    yAnchor: 1.0,
    zIndex: HITBOX.Z_INDEX, // ✅ 여기 추가 (이게 핵심)
    clickable: true,
  });
}
