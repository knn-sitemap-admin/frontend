"use client";

import ParkingView from "../../sections/ParkingView";

export default function ParkingViewContainer({
  parkingType,
  parkingTypes,
  totalParkingSlots = undefined,
}: {
  parkingType?: string | null;
  parkingTypes?: string[];
  totalParkingSlots?: string | number | null;
}) {
  return (
    <ParkingView
      parkingType={parkingType}
      parkingTypes={parkingTypes}
      totalParkingSlots={totalParkingSlots ?? undefined}
    />
  );
}
