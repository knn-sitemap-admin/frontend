/**
 * regionUtils.ts
 *
 * 주어진 주소(addressLine)에서 최상위 행정구역(시/도)을 추출하고,
 * 각 지역의 중심점(센터) 좌표를 관리하는 유틸리티
 */

// 1) 주소에서 맨 앞 지역명 추출 후 2글자로 정규화
export function normalizeRegionName(addressLine?: string | null): string | null {
  if (!addressLine) return null;

  const parts = addressLine.trim().split(" ");
  const firstWord = parts[0] || "";
  const secondWord = parts[1] || "";

  // 경기도 남/북부 분리
  // 북부 시군: 고양, 파주, 의정부, 양주, 동두천, 포천, 연천, 구리, 남양주, 가평
  if (firstWord.startsWith("경기")) {
    const isNorth = /고양|파주|의정부|양주|동두천|포천|연천|구리|남양주|가평/.test(secondWord);
    return isNorth ? "경기북부" : "경기남부";
  }

  // 이미 2글자인 경우 (서울, 인천 등)
  if (firstWord.length === 2) return firstWord;

  // 광역시/도 정규화
  if (firstWord.startsWith("서울")) return "서울";
  if (firstWord.startsWith("인천")) return "인천";
  if (firstWord.startsWith("강원")) return "강원";
  if (firstWord.startsWith("제주")) return "제주";
  if (firstWord.startsWith("부산")) return "부산";
  if (firstWord.startsWith("대구")) return "대구";
  if (firstWord.startsWith("울산")) return "울산";
  if (firstWord.startsWith("광주")) return "광주";
  if (firstWord.startsWith("대전")) return "대전";
  if (firstWord.startsWith("세종")) return "세종";

  if (firstWord === "충청남도" || firstWord === "충남") return "충남";
  if (firstWord === "충청북도" || firstWord === "충북") return "충북";
  if (firstWord === "경상남도" || firstWord === "경남") return "경남";
  if (firstWord === "경상북도" || firstWord === "경북") return "경북";
  if (firstWord === "전라남도" || firstWord === "전남") return "전남";
  if (firstWord === "전라북도" || firstWord === "전북" || firstWord.startsWith("전북특별자치도")) return "전북";

  return firstWord; // 매칭 안 되면 원본 첫 단어 반환
}

// 2) 시/군/구 단위 정규화 (줌 9~10 레벨용) — 시/도 접두어 제외하고 시/군/구명만 반환
export function normalizeSigunguName(addressLine?: string | null): string | null {
  if (!addressLine) return null;

  const parts = addressLine.trim().split(" ");
  if (parts.length < 2) return normalizeRegionName(addressLine);

  const sido = normalizeRegionName(addressLine);

  // 세종특별자치시는 시군구가 없으므로 시도명 유지
  if (sido === "세종") return "세종";

  // 시/군/구명만 반환 (시/도 접두어 제거)
  return parts[1] ?? sido;
}

// 3) 각 지역별 중심점 (클러스터 마커 생성 시 기준이 됨)
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  서울: { lat: 37.5665, lng: 126.9780 },
  경기남부: { lat: 37.2636, lng: 127.0286 }, // 수원 기준
  경기북부: { lat: 37.7381, lng: 127.0337 }, // 의정부 기준
  인천: { lat: 37.4563, lng: 126.7052 },
  강원: { lat: 37.8228, lng: 128.1555 },
  충북: { lat: 36.6356, lng: 127.4913 },
  충남: { lat: 36.5184, lng: 126.8000 },
  대전: { lat: 36.3504, lng: 127.3845 },
  세종: { lat: 36.4800, lng: 127.2890 },
  경북: { lat: 36.5760, lng: 128.5056 },
  대구: { lat: 35.8714, lng: 128.6014 },
  경남: { lat: 35.2383, lng: 128.6925 },
  부산: { lat: 35.1796, lng: 129.0756 },
  울산: { lat: 35.5384, lng: 129.3114 },
  전북: { lat: 35.8203, lng: 127.1088 },
  전남: { lat: 34.8161, lng: 126.4630 },
  광주: { lat: 35.1595, lng: 126.8526 },
  제주: { lat: 33.4890, lng: 126.4983 },
};
