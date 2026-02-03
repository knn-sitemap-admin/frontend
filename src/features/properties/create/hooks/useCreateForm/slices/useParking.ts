"use client";

import { useMemo, useState } from "react";

/**
 * 주차 관련 상태 훅
 * - parkingType: 표시용 문자열
 * - totalParkingSlots: 주차대수(숫자)
 * - registrationTypeId: 등록유형 ID
 *
 * ⚠️ parkingTypeId는 더 이상 사용하지 않음 (parkingType 문자열만 사용)
 */
export function useParking() {
  const [parkingType, setParkingType] = useState<string | null>(null);
  const [parkingTypes, setParkingTypes] = useState<string[]>([]);
  const [totalParkingSlots, setTotalParkingSlots] = useState<number | null>(
    null
  );
  const [registrationTypeId, setRegistrationTypeId] = useState<number | null>(
    null
  );

  const state = useMemo(
    () => ({
      parkingType,
      parkingTypes,
      totalParkingSlots,
      registrationTypeId,
    }),
    [parkingType, parkingTypes, totalParkingSlots, registrationTypeId]
  );

  const actions = useMemo(
    () => ({
      setParkingType,
      setParkingTypes,
      setTotalParkingSlots,
      setRegistrationTypeId,
    }),
    []
  );

  return useMemo(() => ({ state, actions }), [state, actions]);
}
