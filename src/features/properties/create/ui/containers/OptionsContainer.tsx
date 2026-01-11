"use client";

import OptionsSection from "@/features/properties/components/sections/OptionsSection/OptionsSection";
import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "@/features/properties/types/property-dto";

export default function OptionsContainer({
  form,
  PRESET_OPTIONS,
}: {
  form: {
    options: string[];
    setOptions: (v: string[]) => void;
    etcChecked: boolean;
    setEtcChecked: (v: boolean) => void;
    optionEtc?: string;
    setOptionEtc?: (v: string) => void;
    kitchenLayout?: KitchenLayout | null;
    setKitchenLayout?: (v: KitchenLayout | null) => void;
    fridgeSlot?: FridgeSlot | null;
    setFridgeSlot?: (v: FridgeSlot | null) => void;
    sofaSize?: SofaSize | null;
    setSofaSize?: (v: SofaSize | null) => void;
    livingRoomView?: LivingRoomView | null;
    setLivingRoomView?: (v: LivingRoomView | null) => void;
    hasIslandTable?: boolean;
    setHasIslandTable?: (v: boolean) => void;
    hasKitchenWindow?: boolean;
    setHasKitchenWindow?: (v: boolean) => void;
    hasCityGas?: boolean;
    setHasCityGas?: (v: boolean) => void;
    hasInduction?: boolean;
    setHasInduction?: (v: boolean) => void;
  };
  PRESET_OPTIONS: readonly string[];
}) {
  return (
    <OptionsSection
      PRESET_OPTIONS={PRESET_OPTIONS}
      options={form.options}
      setOptions={form.setOptions}
      etcChecked={form.etcChecked}
      setEtcChecked={form.setEtcChecked}
      optionEtc={form.optionEtc}
      setOptionEtc={form.setOptionEtc}
      kitchenLayout={form.kitchenLayout}
      setKitchenLayout={form.setKitchenLayout}
      fridgeSlot={form.fridgeSlot}
      setFridgeSlot={form.setFridgeSlot}
      sofaSize={form.sofaSize}
      setSofaSize={form.setSofaSize}
      livingRoomView={form.livingRoomView}
      setLivingRoomView={form.setLivingRoomView}
      hasIslandTable={form.hasIslandTable}
      setHasIslandTable={form.setHasIslandTable}
      hasKitchenWindow={form.hasKitchenWindow}
      setHasKitchenWindow={form.setHasKitchenWindow}
      hasCityGas={form.hasCityGas}
      setHasCityGas={form.setHasCityGas}
      hasInduction={form.hasInduction}
      setHasInduction={form.setHasInduction}
    />
  );
}
