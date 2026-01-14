"use client";

import { useMemo, useState } from "react";
import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "@/features/properties/types/property-dto";

export function useOptionsMemos() {
  const [options, setOptions] = useState<string[]>([]);
  const [etcChecked, setEtcChecked] = useState(false);
  const [publicMemo, setPublicMemo] = useState("");
  const [secretMemo, setSecretMemo] = useState("");

  // 새로운 필드들
  const [kitchenLayout, setKitchenLayout] = useState<KitchenLayout | null>(
    null
  );
  const [fridgeSlot, setFridgeSlot] = useState<FridgeSlot | null>(null);
  const [sofaSize, setSofaSize] = useState<SofaSize | null>(null);
  const [livingRoomView, setLivingRoomView] = useState<LivingRoomView | null>(
    null
  );

  const state = useMemo(
    () => ({
      options,
      etcChecked,
      publicMemo,
      secretMemo,
      kitchenLayout,
      fridgeSlot,
      sofaSize,
      livingRoomView,
    }),
    [
      options,
      etcChecked,
      publicMemo,
      secretMemo,
      kitchenLayout,
      fridgeSlot,
      sofaSize,
      livingRoomView,
    ]
  );

  const actions = useMemo(
    () => ({
      setOptions,
      setEtcChecked,
      setPublicMemo,
      setSecretMemo,
      setKitchenLayout,
      setFridgeSlot,
      setSofaSize,
      setLivingRoomView,
    }),
    []
  );

  return useMemo(() => ({ state, actions }), [state, actions]);
}
