"use client";

import { useCallback, useMemo } from "react";

export type ParkingFormSlice = {
  parkingType: string | null;
  setParkingType: (v: string | null) => void;

  parkingTypes?: string[];
  setParkingTypes?: (v: string[]) => void;

  totalParkingSlots: string | null;
  setTotalParkingSlots: (v: string | null) => void;
};

type UseParkingFormArgs = {
  form: any; // useEditForm 리턴값
};

export function useParkingForm({ form }: UseParkingFormArgs): ParkingFormSlice {
  // Parking setters 프록시 + 로그
  const setParkingType = useCallback(
    (v: string | null) => {
      form?.setParkingType?.(v);
    },
    [form]
  );

  const setTotalParkingSlots = useCallback(
    (v: string | null) => {
      form?.setTotalParkingSlots?.(v ?? "");
    },
    [form]
  );

  const parkingForm = useMemo<ParkingFormSlice>(
    () => ({
      parkingType: form?.parkingType ?? null,
      setParkingType,

      parkingTypes: Array.isArray(form?.parkingTypes) ? form.parkingTypes : [],
      setParkingTypes: (v: string[]) => form?.setParkingTypes?.(v),

      totalParkingSlots: (() => {
        const raw = form?.totalParkingSlots;
        if (raw == null) return null;
        const s = String(raw).trim();
        return s === "" ? null : s;
      })(),
      setTotalParkingSlots,
    }),
    [form, setParkingType, setTotalParkingSlots]
  );

  return parkingForm;
}
