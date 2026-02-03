"use client";

import Field from "@/components/atoms/Field/Field";
import { Input } from "@/components/atoms/Input/Input";
import PillCheckboxGroup from "@/components/atoms/PillCheckboxGroup";
import { useCallback, useEffect, useState } from "react";
import { ParkingSectionProps } from "./types";
import { PRESETS } from "./constants";

const PARKING_TYPE_MAX_LEN = 50;

type Preset = (typeof PRESETS)[number];
const isPreset = (x: string): x is Preset =>
  (PRESETS as readonly string[]).includes(x);

const toArr = (v: string[] | string | null | undefined): string[] =>
  Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];

type Props = Omit<ParkingSectionProps, "parkingCount" | "setParkingCount"> & {
  totalParkingSlots?: number | null;
  setTotalParkingSlots?: (v: number | null) => void;
  parkingTypes?: string[];
  setParkingTypes?: (v: string[]) => void;
};

export default function ParkingSection({
  parkingType,
  setParkingType,
  parkingTypes,
  setParkingTypes,
  totalParkingSlots,
  setTotalParkingSlots,
}: Props) {
  const arr = parkingTypes ?? toArr(parkingType);
  const presetSelected = arr.filter(isPreset) as Preset[];
  const customValues = arr.filter((x) => x && !isPreset(x));

  const [custom, setCustom] = useState<string>(customValues[0] ?? "");
  const [showCustomInput, setShowCustomInput] = useState(
    customValues.length > 0
  );

  useEffect(() => {
    if (customValues.length > 0) {
      setCustom(customValues[0]);
      setShowCustomInput(true);
    }
  }, [customValues.join(",")]);

  const updateArr = useCallback(
    (next: string[]) => {
      if (setParkingTypes) setParkingTypes(next);
      else setParkingType?.(next[0] ?? null);
    },
    [setParkingTypes, setParkingType]
  );

  const onChangePresets = useCallback(
    (nextPresets: Preset[]) => {
      updateArr([...nextPresets, ...customValues]);
    },
    [customValues, updateArr]
  );

  const toggleCustomInput = useCallback(() => {
    if (showCustomInput) {
      setShowCustomInput(false);
      setCustom("");
      updateArr(presetSelected);
    } else {
      setShowCustomInput(true);
    }
  }, [showCustomInput, presetSelected, updateArr]);

  const onChangeCustomInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustom(e.target.value.slice(0, PARKING_TYPE_MAX_LEN));
    },
    []
  );

  const onBlurCustom = useCallback(() => {
    const trimmed = custom.trim();
    if (trimmed) {
      updateArr([...presetSelected, trimmed]);
    }
  }, [custom, presetSelected, updateArr]);

  const displayCountStr =
    typeof totalParkingSlots === "number" && Number.isFinite(totalParkingSlots)
      ? String(totalParkingSlots)
      : "";

  const onChangeCount = useCallback(
    (raw: string) => {
      const onlyDigits = raw.replace(/\D+/g, "");
      const next = onlyDigits === "" ? null : Number(onlyDigits.slice(0, 6));
      setTotalParkingSlots?.(next);
    },
    [setTotalParkingSlots]
  );

  return (
    <div className="flex flex-col gap-4">
      <Field label="주차 유형" align="center">
        <div className="flex flex-wrap items-center gap-2">
          <PillCheckboxGroup
            name="parkingTypes"
            options={PRESETS}
            value={presetSelected}
            onChange={onChangePresets}
          />
          <label
            className={[
              "inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-1 md:px-3 text-sm whitespace-nowrap",
              "border transition-colors select-none cursor-pointer",
              showCustomInput
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
            onClick={toggleCustomInput}
          >
            직접입력
          </label>
          {showCustomInput && (
            <Input
              value={custom}
              onChange={onChangeCustomInput}
              onBlur={onBlurCustom}
              onKeyDown={(e) => e.key === "Enter" && onBlurCustom()}
              placeholder="예: 지상 병렬 10대"
              className="h-8 min-w-[140px] md:min-w-[180px]"
              maxLength={PARKING_TYPE_MAX_LEN}
              autoFocus
            />
          )}
        </div>
      </Field>

      <Field label="총 주차대수">
        <div className="flex items-center gap-3">
          <Input
            value={displayCountStr}
            onChange={(e) => onChangeCount(e.target.value)}
            className="w-16 h-9"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
          />
          <span className="text-gray-500">대</span>
        </div>
      </Field>
    </div>
  );
}
