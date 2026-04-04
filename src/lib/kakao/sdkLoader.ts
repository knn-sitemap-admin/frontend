/**
 * Kakao JavaScript SDK Loader (for Navi, Share, etc.)
 */

export function loadKakaoSDK(appKey: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("SSR");

  const w = window as any;
  if (w.Kakao && w.Kakao.isInitialized()) {
    return Promise.resolve(w.Kakao);
  }

  return new Promise((resolve, reject) => {
    const id = "kakao-js-sdk";
    if (document.getElementById(id)) {
      const check = setInterval(() => {
        if (w.Kakao && w.Kakao.isInitialized()) {
          clearInterval(check);
          resolve(w.Kakao);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        if (w.Kakao && w.Kakao.isInitialized()) resolve(w.Kakao);
        else reject(new Error("Kakao SDK load timeout"));
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js";
    script.integrity = "sha384-lXdnvWvEn9WSwzK9WdReUGVCG6InOLtgTMIDJHzNieOyoJ7SdrOsqP8WWM07uYy7";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (!w.Kakao.isInitialized()) {
        w.Kakao.init(appKey);
      }
      resolve(w.Kakao);
    };
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });
}
