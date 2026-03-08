"use client";

import { useCallback, useState } from "react";
import { parsePreset } from "@/features/properties/lib/area";
import { UnitLine } from "../../types/editForm.types";

/** 유닛 라인(방/욕실/복층/테라스) 전담 훅 */
export function useUnitLines() {
  const [unitLines, setUnitLines] = useState<UnitLine[]>([]);

  const addLineFromPreset = useCallback((preset: string) => {
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

  const addEmptyLine = useCallback(() => {
    setUnitLines((prev) => [
      {
        rooms: 0,
        baths: 0,
        duplex: false,
        terrace: false,
        primary: "",
        secondary: "",
        note: "",
      },
      ...prev,
    ]);
  }, []);

  const updateLine = useCallback((idx: number, patch: Partial<UnitLine>) => {
    setUnitLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  }, []);

  const removeLine = useCallback((idx: number) => {
    setUnitLines((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return {
    unitLines,
    setUnitLines,
    addLineFromPreset,
    addEmptyLine,
    updateLine,
    removeLine,
  } as const;
}
