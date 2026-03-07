import { PropertyItem } from "../properties/types/propertyItem";

export type PinKind =
  | "1room"
  | "1room-terrace"
  | "2room"
  | "2room-terrace"
  | "3room"
  | "3room-terrace"
  | "4room"
  | "4room-terrace"
  | "duplex"
  | "duplex-terrace"
  | "townhouse"
  | "question"
  | "completed";

export type PinState = "draft" | "saved" | "reserved";

export type PinItem = PropertyItem & {
  kind: PinKind;
  state?: "draft" | "saved"; // 임시/저장됨
  isFav?: boolean;
  isCompleted?: boolean;
};
