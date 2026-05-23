/**
 * URL이 이미지 파일인지 확인합니다.
 */
export const isImageUrl = (url?: string) =>
  !!url && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split("?")[0] || "");

/**
 * URL에서 파일 이름을 추출합니다.
 */
export function fileNameFromUrl(u?: string) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    return u.split("?")[0].split("#")[0].split("/").pop() || u;
  }
}

import { API_BASE } from "@/shared/api/api";

/**
 * 접근 가능한 URL인지 확인 (s3:// 형태는 브라우저에서 접근 불가)
 */
export const isAccessibleUrl = (url?: string) => {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

/**
 * URL을 접근 가능한 형태로 변환 (s3:// -> key만 반환 또는 에러)
 */
export const getAccessibleUrl = (url?: string) => {
  if (!url) return undefined;
  // s3:// 형태는 브라우저에서 접근 불가
  if (url.startsWith("s3://")) {
    console.warn(
      "⚠️ s3:// 형태의 URL은 브라우저에서 접근할 수 없습니다:",
      url
    );
    return undefined; // 프리사인 URL 생성 API 필요
  }
  return url;
};

/**
 * 이미지 URL을 프록시를 통해 내려받아 시계방향 90도 회전한 후 Blob 객체로 반환합니다.
 */
export async function rotateImage90(imageUrl: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("notemap_token") : null;
  const proxyUrl = `${API_BASE}/photo/upload/proxy?url=${encodeURIComponent(imageUrl)}`;
  
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(proxyUrl, { headers });
  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  
  const img = new Image();
  img.crossOrigin = "anonymous";
  
  const objectUrl = URL.createObjectURL(blob);
  img.src = objectUrl;
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("이미지 데이터 로드 실패"));
  });
  
  URL.revokeObjectURL(objectUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.height;
  canvas.height = img.width;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D Context 생성 실패");
  }
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  const rotatedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), blob.type || "image/jpeg", 0.9);
  });
  
  if (!rotatedBlob) {
    throw new Error("회전된 이미지 파일 생성 실패");
  }
  
  return rotatedBlob;
}
