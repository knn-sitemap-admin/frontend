import { HITBOX, LABEL } from "@/features/map/shared/constants/markerUi";

// 공통 색/상수
const ACCENT = "#3B82F6";
export const DRAFT_ID = "__draft__";
export const SELECTED_Z = 2000;

/** 말풍선 라벨 스타일 적용 */
export const applyLabelStyles = (
  el: HTMLDivElement,
  gapPx: number = LABEL.GAP_PX
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
    background: ACCENT,
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
  // 초기 구성: 기존 내용을 싹 비우고 역할이 분리된 DOM을 만든다
  el.innerHTML = "";

  // 래퍼
  const wrapper = document.createElement("div");
  wrapper.className = "nm-label";
  Object.assign(wrapper.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  } as CSSStyleDeclaration);
  el.appendChild(wrapper);

  // ✅ order === 0도 표시되도록 엄격 체크
  const hasOrder = typeof order === "number" && Number.isFinite(order);

  if (hasOrder) {
    const badge = document.createElement("span");
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
      marginRight: "0", // gap으로 간격 관리
      boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
      lineHeight: "18px",
      textAlign: "center",
    } as CSSStyleDeclaration);

    // 0-based → 1-based로 표기
    badge.textContent = String(order + 1);
    badge.setAttribute("aria-label", `예약 순서 ${order + 1}`);
    wrapper.appendChild(badge);
  }

  // 타이틀(텍스트)
  const titleSpan = document.createElement("span");
  titleSpan.className = "nm-title";
  titleSpan.setAttribute("data-role", "label-title");
  titleSpan.textContent = text ?? "";
  wrapper.appendChild(titleSpan);
};
