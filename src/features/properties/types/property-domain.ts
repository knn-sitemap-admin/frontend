/* ───────── Registry(등기) ─────────
 * 등기 상태는 건물유형과 무관합니다.
 * 프로젝트 정책에 맞춰 라벨은 자유롭게 바꿔도 되지만,
 * 여기서는 최소 3상태로 분리합니다.
 */
export const REGISTRY_LIST = ["확인필요", "완료", "미완료"] as const;
export type Registry = (typeof REGISTRY_LIST)[number];

/* ───────── Grade ───────── */
export type Grade = string;

/* ───────── Building Type (백엔드 스펙) ─────────
 * 서버와 1:1 대응하는 enum 값만 포함합니다.
 * ※ 이 값만 서버로 전송하세요.
 */
export const BUILDING_TYPES = ["주택", "APT", "OP", "도생", "근생"] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

/* ───────── (옵션) UI 라벨 호환 ─────────
 * 과거/현재 UI에서 쓰는 라벨을 모두 지원하기 위한 목록입니다.
 * 컴포넌트가 이 라벨 배열을 옵션으로 사용한다면,
 * 저장/전송 시 normalizeBuildingTypeLabelToEnum 으로 백엔드 enum으로 변환하세요.
 */
export const BUILDING_TYPE_LABELS = [
  "주택",
  "APT",
  "OP",
  "도/생",
  "도생",
  "도시형생활주택",
  "근/생",
  "근생", // 과거 표기 호환
  "아파트",
  "오피스텔",
] as const;
export type BuildingTypeLabel = (typeof BUILDING_TYPE_LABELS)[number];

/** 라벨 → 백엔드 enum 매핑 (필요 시 정책에 맞게 확장/수정) */
export function normalizeBuildingTypeLabelToEnum(
  v: BuildingTypeLabel | string | null | undefined
): BuildingType | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const upper = s.toUpperCase();

  // 이미 백엔드 enum이면 그대로
  if ((BUILDING_TYPES as readonly string[]).includes(s)) {
    return s as BuildingType;
  }

  // ✅ 아파트 계열 → "APT"
  if (s === "아파트" || upper === "APARTMENT") {
    return "APT";
  }

  // ✅ 오피스텔 계열 → "OP"
  if (s === "오피스텔" || upper === "OFFICETEL") {
    return "OP";
  }

  // ✅ 도/생 관련 라벨 → "도생"
  if (s === "도/생" || s === "도생" || s === "도시형생활주택") {
    return "도생";
  }

  // ✅ 근/생 관련 라벨 → "근생"
  if (s === "근/생" || s === "근생") {
    return "근생";
  }

  return null;
}

/** (선택) 백엔드 enum → UI 라벨 매핑이 필요하면 사용하세요. */
export function buildingTypeEnumToLabel(bt: BuildingType): BuildingTypeLabel {
  // UI 정책에 맞게 enum 값을 라벨로 변환
  switch (bt) {
    case "도생":
      return "도/생";
    case "근생":
      return "근/생"; // 또는 "근생"으로 바꾸고 싶으면 여기만 수정
    case "주택":
    case "APT":
    case "OP":
    default:
      return bt as BuildingTypeLabel;
  }
}

/* ───────── Orientation ───────── */
export type OrientationValue =
  | "동"
  | "서"
  | "남"
  | "북"
  | "남동"
  | "남서"
  | "북동"
  | "북서"
  | "동서"
  | "남북";

export type OrientationRow = {
  ho: number; // 호수 (1, 2, 3 …)
  value: OrientationValue | "";
};

export type AspectRowLite = { no: number; dir: OrientationValue | "" };

/* ───────── 공통 엔티티 ───────── */
export type UnitLine = {
  rooms: number;
  baths: number;
  duplex: boolean;
  terrace: boolean;
  primary: string;
  secondary: string;
  note: string;
};
