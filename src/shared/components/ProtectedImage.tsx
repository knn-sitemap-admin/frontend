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

  // 공통 보호 스타일
  const protectionStyle: React.CSSProperties = {
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    KhtmlUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
    userSelect: "none",
    WebkitUserDrag: "none",
    touchAction: "manipulation", // 핀치 줌 등은 허용하되 롱프레스 메뉴 방해 최소화
  };

  const commonProps = {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    draggable: false,
  };

  // 관리자나 매니저는 제한 없이 이용 가능 (단, 브라우저 기본 메뉴는 UX를 위해 차단)
  if (isPrivileged) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        {...commonProps}
        style={{
          ...protectionStyle,
          ...props.style,
        }}
        {...props} 
      />
    );
  }

  // 일반 사용자는 추가로 포인터 이벤트 제어 가능
  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, "select-none")}
      {...commonProps}
      style={{
        ...protectionStyle,
        pointerEvents: disablePointerEvents ? "none" : "auto",
        ...props.style,
      }}
      {...props}
    />
  );
}
