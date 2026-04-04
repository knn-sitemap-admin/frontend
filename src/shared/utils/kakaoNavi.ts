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

  // 2. 모바일인 경우: SDK를 거치지 않고 '직접 딥링크' 호출 (브릿지 페이지 스킵)
  // SDK 방식(Kakao.Navi.start)은 가끔 브릿지 페이지를 띄워 경험이 끊기므로 딥링크를 우선합니다.
  if (isMobile) {
    const deepLinkUrl = `kakaonavi://navigate?name=${encodeURIComponent(
      name
    )}&x=${lng}&y=${lat}&coord_type=wgs84`;
    
    console.log("[KakaoNavi] 직접 딥링크 호출 (모바일)");
    window.location.href = deepLinkUrl;
    return;
  }

  // 3. PC 환경인 경우: 카카오 SDK 또는 웹 페이지 연결
  const openWebNavi = async () => {
    const kakao = (window as any).Kakao;

    // GPS 정보 시도
    let startPos: { lat: number; lng: number } | null = null;
    try {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        startPos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 1500 }
          );
        });
      }
    } catch (e) {
      console.warn("[KakaoNavi] Geolocation failed:", e);
    }

    // 출발지 정보가 있다면 경로안내(route) 페이지로, 없다면 목적지(to) 페이지로
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
