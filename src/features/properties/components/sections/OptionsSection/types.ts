import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "@/features/properties/types/property-dto";

export interface OptionsSectionProps {
  PRESET_OPTIONS: readonly string[];

  /** 체크박스로 선택된 옵션들 */
  options?: string[];
  setOptions?: (next: string[]) => void;

  /** "직접입력" 체크박스 상태 */
  etcChecked: boolean;
  setEtcChecked?: (v: boolean) => void;

  /** ✅ 기타 옵션(자유 텍스트) 문자열 */
  optionEtc?: string;
  setOptionEtc?: (v: string) => void;

  // Nullable Enum 필드
  kitchenLayout?: KitchenLayout | null;
  setKitchenLayout?: (v: KitchenLayout | null) => void;
  fridgeSlot?: FridgeSlot | null;
  setFridgeSlot?: (v: FridgeSlot | null) => void;
  sofaSize?: SofaSize | null;
  setSofaSize?: (v: SofaSize | null) => void;
  livingRoomView?: LivingRoomView | null;
  setLivingRoomView?: (v: LivingRoomView | null) => void;
}
