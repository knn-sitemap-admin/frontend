/**
 * Kakao Navi Utility
 */

export const openKakaoNavi = (params: {
  name: string;
  lat: number;
  lng: number;
}) => {
  const { name, lat, lng } = params;

  // 1. 모바일 여부 확인
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const kakao = (window as any).Kakao;

  // 2. 모바일인 경우 지연 없이 즉시 앱 호출 시도 (브라우저 차단 방지)
  if (isMobile) {
    if (kakao && kakao.isInitialized() && kakao.Navi) {
      try {
        console.log("[KakaoNavi] SDK 호출 (모바일)");
        kakao.Navi.start({
          name,
          x: lng,
          y: lat,
          coordType: "wgs84",
          // 출발지 정보는 앱 자체 GPS를 사용하는 것이 훨씬 빠르고 정확하여 생략합니다.
        });
        return;
      } catch (e) {
        console.warn("[KakaoNavi] SDK 실행 실패, 딥링크로 전환", e);
      }
    }

    // SDK가 없거나 실패한 경우 즉시 딥링크 호출 (브라우저 보안 정책 대응)
    console.log("[KakaoNavi] 딥링크 호출 (모바일)");
    window.location.href = `kakaonavi://navigate?name=${encodeURIComponent(
      name
    )}&x=${lng}&y=${lat}&coord_type=wgs84`;
    return;
  }

  // 3. PC 환경인 경우 (비동기 허용)
  const openWebNavi = async () => {
    let startPos: { lat: number; lng: number } | null = null;
    try {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        startPos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 2000 }
          );
        });
      }
    } catch (e) {
      console.warn("[KakaoNavi] Geolocation failed:", e);
    }

    if (startPos) {
      const webRouteUrl = `https://map.kakao.com/link/from/현재위치,${
        startPos.lat
      },${startPos.lng}/to/${encodeURIComponent(name)},${lat},${lng}`;
      window.open(webRouteUrl, "_blank");
    } else {
      const webToUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
        name
      )},${lat},${lng}`;
      window.open(webToUrl, "_blank");
    }
  };

  openWebNavi();
};
