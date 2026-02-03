"use client";

import Field from "@/components/atoms/Field/Field";

interface ParkingViewProps {
  /** 주차 유형 라벨 (없으면 "-") */
  parkingType?: string | null;
  /** 주차 유형 다중 (배열이면 우선 표시) */
  parkingTypes?: string[];
  /** ✅ 총 주차대수: 0도 유효값 */
  totalParkingSlots?: string | number | null;
}

export default function ParkingView({
  parkingType,
  parkingTypes,
  totalParkingSlots,
}: ParkingViewProps) {
  const countText =
    totalParkingSlots === 0 || totalParkingSlots === "0"
      ? "0 대"
      : totalParkingSlots != null && String(totalParkingSlots).trim() !== ""
      ? `${totalParkingSlots} 대`
      : "-";

  const typeText =
    Array.isArray(parkingTypes) && parkingTypes.length > 0
      ? parkingTypes.filter(Boolean).join(", ")
      : parkingType?.trim() || "-";

  return (
    <div className="grid grid-cols-2 items-center">
      <Field label="주차 유형">
        <div className="h-9 flex items-center text-sm">{typeText}</div>
      </Field>
      <Field label="총 주차대수">
        <div className="h-9 flex items-center text-sm">{countText}</div>
      </Field>
    </div>
  );
}
