import { HITBOX, LABEL } from "@/features/map/shared/constants/markerUi";

// 공통 색/상수
const ACCENT = "#3B82F6";
export const DRAFT_ID = "__draft__";
export const SELECTED_Z = 2000;

/** 말풍선 라벨 스타일 적용 */
export const applyLabelStyles = (
  el: HTMLDivElement,
  gapPx: number = LABEL.GAP_PX,
  bgColor?: string
) => {
  Object.assign(el.style, {
    position: "relative",
    // ✅ yAnchor: 1 에서 기준점은 라벨의 "아래"라서
    //    top을 음수로 줘서 핀 기준 위로 gapPx + 35px 만큼 올려줌
    top: `${-(gapPx + 35)}px`,
    left: "0",
    transform: "none",

    padding: "6px 10px",
    borderRadius: "8px",
    background: bgColor ?? ACCENT,
    color: "#ffffff",
    fontWeight: "700",
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 4px 12px rgba(59,130,246,0.25)",
    fontSize: "12px",
    lineHeight: "1",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    display: "inline-flex",
    alignItems: "center",
    contain: "layout paint style", // ✅ [최적화] 브라우저 강제 레이아웃 계산 방지
  } as CSSStyleDeclaration);
};

/** 히트박스 스타일 적용 */
export const applyHitboxStyles = (
  el: HTMLDivElement,
  sizePx: number = HITBOX.DIAMETER_PX
) => {
  const size = `${sizePx}px`;
  Object.assign(el.style, {
    width: size,
    height: size,
    borderRadius: "9999px",
    background: "rgba(0,0,0,0)",
    pointerEvents: "auto",
    cursor: "pointer",
    touchAction: "manipulation",
    contain: "strict", // ✅ [최적화] 크기가 고정되어 있으므로 완벽 격리 (Reflow 차단)
  } as CSSStyleDeclaration);
};

/**
 * 순번 배지 + 텍스트 라벨 구성 (초기 1회 전체 구조 생성)
 * - 배지 엘리먼트: [data-role="order-badge"]
 * - 타이틀 엘리먼트: [data-role="label-title"]
 * - order는 0도 유효(0-based → 1-based로 표기)
 */
export const applyOrderBadgeToLabel = (
  el: HTMLDivElement,
  text: string,
  order?: number | null
) => {
  // ✅ 기존 래퍼가 있는지 확인하여 재활용 (DOM 폭파 방지 -> 깜빡임 제거)
  let wrapper = el.querySelector(".nm-label") as HTMLDivElement | null;
  const hasOrder = typeof order === "number" && Number.isFinite(order);
  const desiredBadgeText = hasOrder ? String(order + 1) : "";

  if (!wrapper) {
    el.innerHTML = ""; // 기존 단순 텍스트가 있었다면 비우기
    wrapper = document.createElement("div");
    wrapper.className = "nm-label";
    Object.assign(wrapper.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    } as CSSStyleDeclaration);
    el.appendChild(wrapper);
  }

  // 배지 찾기
  let badge = wrapper.querySelector('[data-role="order-badge"]') as HTMLSpanElement | null;
  
  if (hasOrder) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nm-badge";
      badge.setAttribute("data-role", "order-badge");
      Object.assign(badge.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        minWidth: "18px",
        borderRadius: "9999px",
        fontSize: "10px",
        fontWeight: "800",
        background: "#ffffff",
        color: "#000000",
        marginRight: "0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        lineHeight: "18px",
        textAlign: "center",
      } as CSSStyleDeclaration);
      // 배지를 항상 맨 앞에 삽입
      wrapper.insertBefore(badge, wrapper.firstChild);
    }
    if (badge.textContent !== desiredBadgeText) {
      badge.textContent = desiredBadgeText;
      badge.setAttribute("aria-label", `예약 순서 ${desiredBadgeText}`);
    }
  } else {
    // 순번이 없어야 하는데 배지가 있다면 제거
    if (badge) {
      badge.remove();
    }
  }

  // 타이틀 찾기
  let titleSpan = wrapper.querySelector('[data-role="label-title"]') as HTMLSpanElement | null;
  if (!titleSpan) {
    titleSpan = document.createElement("span");
    titleSpan.className = "nm-title";
    titleSpan.setAttribute("data-role", "label-title");
    wrapper.appendChild(titleSpan);
  }
  
  if (titleSpan.textContent !== text) {
    titleSpan.textContent = text ?? "";
  }
};
