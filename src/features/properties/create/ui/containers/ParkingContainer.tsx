"use client";

import ParkingSection from "@/features/properties/components/sections/ParkingSection/ParkingSection";

/** Body에서 내려오는 슬라이스(문자열 기반) */
type ParkingFormSliceFromBody = {
  parkingType?: string | null;
  setParkingType?: (v: string | null) => void;
  /** 주차 유형 다중 선택 — parkingTypes: ["직렬", "기계식"] */
  parkingTypes?: string[];
  setParkingTypes?: (v: string[]) => void;

  /** 총 주차대수 — Body에서는 문자열로 관리 */
  totalParkingSlots: string | null;
  setTotalParkingSlots: (v: string | null) => void;
};

type Props = {
  form: ParkingFormSliceFromBody;
};

export default function ParkingContainer({ form }: Props) {
  const {
    parkingType,
    setParkingType,
    parkingTypes,
    setParkingTypes,
    totalParkingSlots,
    setTotalParkingSlots,
  } = form;

  // Body(문자열) ↔ Section(숫자) 변환 어댑터
  const toNum = (s: string | null): number | null => {
    if (!s) return null;
    const n = Number(String(s).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const toStr = (n: number | null): string | null =>
    n == null ? null : String(n);

  return (
    <ParkingSection
      parkingType={parkingType ?? null}
      setParkingType={setParkingType ?? (() => {})}
      parkingTypes={parkingTypes}
      setParkingTypes={setParkingTypes}
      totalParkingSlots={toNum(totalParkingSlots)}
      setTotalParkingSlots={(v) => setTotalParkingSlots(toStr(v))}
    />
  );
}
