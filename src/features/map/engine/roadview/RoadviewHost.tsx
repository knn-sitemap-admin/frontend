"use client";

import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRoadviewMinimap } from "./useRoadviewMinimap";

type Props = {
  open: boolean;
  onClose: () => void;
  onResize?: () => void;
  /** Kakao Roadview가 렌더될 DOM 컨테이너 ref (useRoadview에서 전달) */
  containerRef: React.RefObject<HTMLDivElement>;
  /** 로드뷰 인스턴스 ref */
  roadviewRef: React.MutableRefObject<any>;
  /** Kakao SDK 인스턴스 (미니맵용) */
  kakaoSDK?: any;
  /** 메인 맵 인스턴스 (미니맵 초기 상태 복사용) */
  mapInstance?: any;
};

/**
 * 전체화면 로드뷰 오버레이
 * - body 포털
 * - 열릴 때/리사이즈 시 relayout() 트리거
 * - ESC/닫기/딤 클릭으로 닫힘
 */
export default function RoadviewHost({
  open,
  onClose,
  onResize,
  containerRef,
  roadviewRef,
  kakaoSDK,
  mapInstance,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElRef = useRef<Element | null>(null);

  // 모바일 여부 감지
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const minimapContainerRef = useRoadviewMinimap({
    open,
    kakaoSDK,
    mapInstance,
    roadviewRef,
  });

  // 딤 클릭 닫기
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // 포털 루트
  const portalRoot =
    (typeof window !== "undefined" &&
      (document.getElementById("portal-root") || document.body)) ||
    null;
  if (!portalRoot) return null;

  return createPortal(
    <div
      className={[
        "pointer-events-none fixed inset-0 z-[120000]",
        open ? "visible" : "invisible",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-black/60 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onBackdropClick}
        role="presentation"
      />

      {/* Panel: 전체화면 */}
      <div
        ref={panelRef}
        className={[
          "pointer-events-auto fixed inset-0 outline-none",
          "transition-opacity",
          open ? "opacity-100" : "opacity-0",
          "motion-reduce:transition-none",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="로드뷰"
        tabIndex={-1}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[120010] inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="닫기"
          title="닫기 (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Kakao Roadview 컨테이너: 화면 꽉 채움 */}
        <div ref={containerRef} className="h-screen w-screen bg-black" />

        {/* 미니맵: 좌측 하단 */}
        {open && (
          <div className="absolute left-0 bottom-0 z-[120010]">
            {/* 미니맵 컨테이너 */}
            <div
              ref={minimapContainerRef}
              className="relative overflow-hidden border-t-2 border-r-2 border-white shadow-lg bg-white"
              style={{
                width: isMobile ? "100vw" : "30vw",
                height: isMobile ? "30vh" : "300px",
              }}
            />
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
}
