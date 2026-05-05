"use client";

import { useMeRole } from "@/features/auth/hooks/useMeRole";
import { cn } from "@/lib/cn";
import { ImgHTMLAttributes } from "react";

interface ProtectedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string;
  /** 
   * 이미지 자체에 대한 포인터 이벤트를 차단할지 여부. 
   * 기본값은 true (권한 없을 시). 
   * 클릭 이벤트가 부모 요소에서 처리되어야 하는 경우 유용합니다.
   */
  disablePointerEvents?: boolean;
}

/**
 * 권한(admin, manager)이 없는 사용자의 이미지 무단 저장 및 다운로드를 방지하는 보호용 이미지 컴포넌트입니다.
 */
export function ProtectedImage({ 
  src, 
  alt = "", 
  className, 
  disablePointerEvents = true,
  ...props 
}: ProtectedImageProps) {
  const { isPrivileged } = useMeRole();

  // 관리자나 매니저는 제한 없이 이용 가능
  if (isPrivileged) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        {...props} 
      />
    );
  }

  // 일반 사용자는 저장 및 다운로드 기능 차단
  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, "select-none")}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        WebkitTouchCallout: "none",
        pointerEvents: disablePointerEvents ? "none" : "auto",
        ...props.style,
      }}
      {...props}
    />
  );
}
