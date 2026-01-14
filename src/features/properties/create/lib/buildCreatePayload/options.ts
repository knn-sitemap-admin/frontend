// import { s } from "./numeric"; // ✅ 더 이상 사용하지 않으니 제거해도 됨

export type OptionsForServer = {
  hasAircon?: boolean;
  hasFridge?: boolean;
  hasWasher?: boolean;
  hasDryer?: boolean;
  hasBidet?: boolean;
  hasAirPurifier?: boolean;
  hasIslandTable?: boolean;
  hasKitchenWindow?: boolean;
  hasCityGas?: boolean;
  hasInduction?: boolean;
  extraOptionsText?: string | null;
};

/** 소문자 + 트림 정규화 */
const norm = (s: string) => s.trim().toLowerCase();

/** UI 의 options 배열 → 서버용 options 객체로 변환 */
export function buildOptionsForServer(selected: string[]): OptionsForServer {
  const labels = Array.isArray(selected) ? selected : [];

  const normalized = labels.map((v) => v.trim()).filter(Boolean);

  const set = new Set(normalized.map(norm));

  const hasAny = (candidates: string[]) =>
    candidates.some((c) => set.has(norm(c)));

  const hasAircon = hasAny(["에어컨", "에어컨 있음", "aircon"]);
  const hasFridge = hasAny(["냉장고", "냉장고 있음", "fridge"]);
  const hasWasher = hasAny([
    "세탁기",
    "세탁기 있음",
    "washer",
    "washing machine",
  ]);
  const hasDryer = hasAny(["건조기", "드럼건조기", "dryer"]);
  const hasBidet = hasAny(["비데", "비데 있음", "bidet"]);
  const hasAirPurifier = hasAny(["공기순환기", "공기청정기", "air purifier"]);
  const hasIslandTable = hasAny(["아일랜드 식탁", "아일랜드식탁"]);
  const hasKitchenWindow = hasAny(["주방창"]);
  const hasCityGas = hasAny(["도시가스"]);
  const hasInduction = hasAny(["인덕션"]);

  // 🔹 프리셋으로 이미 의미가 있는 옵션들은 extraOptionsText에서 제외
  const presetNorms = new Set(
    [
      "에어컨",
      "에어컨 있음",
      "aircon",
      "냉장고",
      "냉장고 있음",
      "fridge",
      "세탁기",
      "세탁기 있음",
      "washer",
      "washing machine",
      "건조기",
      "드럼건조기",
      "dryer",
      "비데",
      "비데 있음",
      "bidet",
      "공기순환기",
      "공기청정기",
      "air purifier",
      "아일랜드 식탁",
      "아일랜드식탁",
      "주방창",
      "도시가스",
      "인덕션",
    ].map(norm)
  );

  const extraList = normalized.filter((label) => !presetNorms.has(norm(label)));

  // 🔹 기타 옵션 문자열 (없으면 "" 또는 null 둘 중 하나 선택 가능)
  const extraOptionsText = extraList.length > 0 ? extraList.join(", ") : "";

  return {
    hasAircon: hasAircon || undefined,
    hasFridge: hasFridge || undefined,
    hasWasher: hasWasher || undefined,
    hasDryer: hasDryer || undefined,
    hasBidet: hasBidet || undefined,
    hasAirPurifier: hasAirPurifier || undefined,
    hasIslandTable: hasIslandTable || undefined,
    hasKitchenWindow: hasKitchenWindow || undefined,
    hasCityGas: hasCityGas || undefined,
    hasInduction: hasInduction || undefined,
    extraOptionsText,
  };
}
