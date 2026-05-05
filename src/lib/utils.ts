import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// className을 깔끔하게 합치고, 중복되거나 충돌하는 Tailwind 클래스 자동 정리
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMobile() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}
