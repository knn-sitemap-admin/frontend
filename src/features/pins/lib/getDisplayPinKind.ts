import type { PinKind } from "@/features/pins/types";

/**
 * ageType에 따라 실제로 보여줄 핀 종류를 결정
 * - NEW: 기본핀 (old- prefix 있으면 제거)
 * - OLD: old- prefix 붙인 핀
 */
export function getDisplayPinKind(
  basePinKind: PinKind | undefined,
  ageType?: "NEW" | "OLD" | null
): PinKind | undefined {
  if (!basePinKind) return basePinKind;

  // 입주완료나 답사예정은 구옥 전용 아이콘이 없으므로 접두사 제외
  if (basePinKind === "completed" || basePinKind === "question") {
    return basePinKind;
  }

  // ageType이 OLD면 old- prefix 붙이기
  if (ageType === "OLD") {
    if (basePinKind.startsWith("old-")) return basePinKind;
    return `old-${basePinKind}` as PinKind;
  }

  // ageType이 NEW면 old- prefix 제거해서 신축핀으로
  if (ageType === "NEW") {
    if (basePinKind.startsWith("old-")) {
      return basePinKind.slice(4) as PinKind;
    }
  }

  // ageType 없으면 그대로
  return basePinKind;
}
