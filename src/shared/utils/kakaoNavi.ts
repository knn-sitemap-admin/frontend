/**
 * Kakao Navi Utility
 */

export const openKakaoNavi = async (params: {
  name: string;
  lat: number;
  lng: number;
}) => {
  const { name, lat, lng } = params;

  // 1. 모바일 여부 확인
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 2. 현재 위치 (출발지) 가져오기 시도 (GPS 이용 동의 필요)
  let startPos: { lat: number; lng: number } | null = null;
  try {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      // 위치 권한 요청 및 좌표 획득 (Promise로 래핑)
      startPos = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null), // 거부되거나 오류 시 null 반환 (내비 앱 자체 GPS 활용)
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    }
  } catch (e) {
    console.warn("[KakaoNavi] Geolocation failed:", e);
  }

  // 3. Kakao SDK 확인
  const kakao = (window as any).Kakao;
  
  if (kakao && kakao.isInitialized() && kakao.Navi) {
    // SDK 방식: 출발지(sX, sY)가 있으면 추가, 없으면 앱 내 현재위치 사용
    const naviOptions: any = {
      name,
      x: lng,
      y: lat,
      coordType: 'wgs84',
    };

    if (startPos) {
      naviOptions.sX = startPos.lng;
      naviOptions.sY = startPos.lat;
    }

    kakao.Navi.start(naviOptions);
  } else if (isMobile) {
    // 4. 모바일 딥링크 방식
    let url = `kakaonavi://navigate?name=${encodeURIComponent(name)}&x=${lng}&y=${lat}&coord_type=wgs84`;
    if (startPos) {
      // 딥링크에서 출발지는 spx, spy 파라미터를 사용할 수 있습니다.
      url += `&spx=${startPos.lng}&spy=${startPos.lat}`;
    }
    window.location.href = url;
  } else {
    // 5. PC 환경 -> 카카오맵 길찾기로 연결
    if (startPos) {
      // 출발지/목적지 모두 있는 경우 (Route 링크)
      // sname,slat,slng,ename,elat,elng
      const webRouteUrl = `https://map.kakao.com/link/from/현재위치,${startPos.lat},${startPos.lng}/to/${encodeURIComponent(name)},${lat},${lng}`;
      window.open(webRouteUrl, '_blank');
    } else {
      // 목적지 정보만 있는 경우 (To 링크)
      const webToUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
      window.open(webToUrl, '_blank');
    }
  }
};
