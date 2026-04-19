"use client";

import { useEffect, useState } from "react";

export function useIsMobile(maxWidth = 768) {
  const [isMobile, setIsMobile] = useState(false);
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. 화면 너비 기반 (기존 유지)
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const listener = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile("matches" in e ? e.matches : mq.matches);
    };

    // 2. 터치 지원 여부 체크 (태블릿 PC 대응 핵심)
    const checkTouch = () => {
      setHasTouch(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    };

    listener(mq);
    checkTouch();

    mq.addEventListener("change", listener as any);
    return () => mq.removeEventListener("change", listener as any);
  }, [maxWidth]);

  // 기존 코드 호환성을 위해 isMobile을 반환하되, 
  // 필요에 따라 { isMobile, hasTouch } 형태로 확장 가능합니다.
  // 여기서는 터치가 가능한 큰 기기도 '모바일 환경'의 범주에 넣어 클릭/터치를 허용하게 유도합니다.
  return isMobile || hasTouch;
}
