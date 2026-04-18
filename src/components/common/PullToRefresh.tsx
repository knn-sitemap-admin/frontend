"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export default function PullToRefresh({
  children,
  onRefresh,
  className = "",
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // 당겨야 하는 최소 거리
  const maxPull = 120; // 최대 당겨지는 거리

  const handleTouchStart = (e: React.TouchEvent) => {
    // 가장 위에서 스크롤이 시작될 때만 작동
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.current;

    if (distance > 0) {
      // 텐션 물리 효과 (점점 당기기 힘들어짐)
      const pull = Math.min(maxPull, distance * 0.4);
      setPullDistance(pull);
      
      // 브라우저 기본 당겨서 새로고침 방지 (커스텀 사용을 위해)
      if (distance > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold); // 아이콘 위치 유지

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // 기본 동작: 전체 페이지 새로고침
          window.location.reload();
        }
      } catch (err) {
        console.error("Refresh failed", err);
      } finally {
        // 부드럽게 닫기
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  return (
    <div
      ref={scrollContainerRef}
      className={`relative h-full w-full overflow-y-auto ${className} scrollbar-hide`}
      style={{ overscrollBehaviorY: "contain" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 새로고침 인디케이터 */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[100] flex items-center justify-center transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 20 ? 1 : 0,
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100">
          <Loader2
            className={`h-6 w-6 text-blue-500 ${isRefreshing ? "animate-spin" : ""}`}
            style={{ 
              transform: !isRefreshing ? `rotate(${pullDistance * 2}deg)` : "none",
              transition: isRefreshing ? "none" : "transform 0.1s linear"
            }}
          />
        </div>
      </div>

      {/* 실제 콘텐츠 */}
      <div
        className="transition-transform duration-200 flex flex-col min-h-full"
        style={{ 
          transform: `translateY(${pullDistance * 0.5}px)`,
          // 안드로이드 탭 간섭 방지
          touchAction: "pan-y"
        }}
      >
        {children}
      </div>
    </div>
  );
}
