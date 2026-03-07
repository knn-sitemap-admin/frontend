"use client";

import { useCallback, useMemo, useState } from "react";
import type { UnitLine } from "@/features/properties/types/property-domain";
import { parsePreset } from "@/features/properties/lib/structure";

export function useUnitLines() {
  const [unitLines, setUnitLines] = useState<UnitLine[]>([]);

  const onAddPreset = useCallback((preset: string) => {
    const { rooms, baths } = parsePreset(preset);
    setUnitLines((prev) => [
      ...prev,
      {
        rooms,
        baths,
        duplex: false,
        terrace: false,
        primary: "",
        secondary: "",
        note: "",
      },
    ]);
  }, []);

  const onAddEmpty = useCallback(() => {
    setUnitLines((prev) => [
      ...prev,
      {
        rooms: 0,
        baths: 0,
        duplex: false,
        terrace: false,
        primary: "",
        secondary: "",
        note: "",
      },
    ]);
  }, []);

  const onUpdate = useCallback((idx: number, patch: Partial<UnitLine>) => {
    setUnitLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  }, []);

  const onRemove = useCallback((idx: number) => {
    setUnitLines((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const state = useMemo(
    () => ({ unitLines, unitLinesLen: unitLines.length }),
    [unitLines]
  );
  const actions = useMemo(
    () => ({ onAddPreset, onAddEmpty, onUpdate, onRemove }),
    [onAddPreset, onAddEmpty, onUpdate, onRemove]
  );

  return useMemo(() => ({ state, actions }), [state, actions]);
}
