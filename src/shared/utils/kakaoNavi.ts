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

  // 2. 모바일 환경 처리: 카카오 공식 SDK 방식을 최우선 사용합니다.
  // 공식 SDK는 브라운저별 호환성(인앱 브라우저 등)을 카카오 측에서 직접 핸들링하므로 가장 안전합니다.
  if (isMobile) {
    if (kakao && kakao.isInitialized() && kakao.Navi) {
      try {
        console.log("[KakaoNavi] SDK 실행 (모바일)");
        kakao.Navi.start({
          name,
          x: lng,
          y: lat,
          coordType: 'wgs84',
        });
        return;
      } catch (err) {
        console.warn("[KakaoNavi] SDK 호출 실패, 폴백 실행", err);
      }
    }

    // SDK 미로드 혹은 호출 실패 시 예비용 딥링크
    window.location.href = `kakaonavi://navigate?name=${encodeURIComponent(
      name
    )}&x=${lng}&y=${lat}&coord_type=wgs84`;
    return;
  }

  // 3. PC 환경 처리: GPS 정보를 포함한 웹 페이지 전환
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
