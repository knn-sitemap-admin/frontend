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
