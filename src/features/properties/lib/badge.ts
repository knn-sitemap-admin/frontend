import type { PinKind } from "@/features/pins/types";

/** PinKind -> 서버 badge */
export function mapPinKindToBadge(pinKind: PinKind): string | null {
  switch (pinKind) {
    case "1room":
      return "R1_TO_1_5";
    case "1room-terrace":
      return "R1_TO_1_5_TERRACE";

    case "2room":
      return "R2_TO_2_5";
    case "2room-terrace":
      return "R2_TO_2_5_TERRACE";

    case "3room":
      return "R3";
    case "3room-terrace":
      return "R3_TERRACE";

    case "4room":
      return "R4";
    case "4room-terrace":
      return "R4_TERRACE";

    case "duplex":
      return "LOFT";

    case "duplex-terrace":
      // 🔹 복층 테라스용 badge (백엔드에 맞춰서 사용)
      return "LOFT_TERRACE";

    case "townhouse":
      return "TOWNHOUSE";

    case "question":
      return "SURVEY_SCHEDULED";

    default:
      return null;
  }
}

/** 서버 badge + isCompleted -> PinKind */
export function mapBadgeToPinKind(
  badge?: string | null,
  isCompleted?: boolean
): PinKind | undefined {
  if (isCompleted) return "completed";
  const b = (badge ?? "").toUpperCase();
  if (!b) return undefined;

  switch (b) {
    case "R1_TO_1_5":
      return "1room";
    case "R1_TO_1_5_TERRACE":
      return "1room-terrace";

    case "R2_TO_2_5":
      return "2room";
    case "R2_TO_2_5_TERRACE":
      return "2room-terrace";

    case "R3":
      return "3room";
    case "R3_TERRACE":
      return "3room-terrace";

    case "R4":
      return "4room";
    case "R4_TERRACE":
      return "4room-terrace";

    case "LOFT":
      return "duplex";

    case "LOFT_TERRACE":
      return "duplex-terrace";

    case "TOWNHOUSE":
      return "townhouse";

    case "SURVEY_SCHEDULED":
      return "question";

    case "MOVE_IN_COMPLETE":
      return "completed";

    default:
      return undefined; // 매핑 없으면 undefined
  }
}
