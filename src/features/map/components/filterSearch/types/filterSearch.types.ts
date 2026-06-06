import type { ReactNode } from "react";
import type { PinSearchParams } from "@/features/pins/types/pin-search";

export interface FilterState {
  rooms: string[];
  deposit: string;
  areaMin: string;
  areaMax: string;
  /** ✅ 여러 등기 선택 */
  buildingTypes: string[];
  elevator: string;
  priceMin: string;
  priceMax: string;
}

export interface FilterSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (params: PinSearchParams, filters?: FilterState) => void;
  onClear?: () => void;
  initial?: Partial<FilterState>;
}

export interface FilterSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export interface SelectableButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}
