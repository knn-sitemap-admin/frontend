"use client";

import { PRESET_OPTIONS } from "@/features/properties/components/constants";
import OptionsSection from "@/features/properties/components/sections/OptionsSection/OptionsSection";
import { EditFormAPI } from "@/features/properties/edit/types/editForm.slices";

export default function OptionsContainer({ form }: { form: EditFormAPI }) {
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
