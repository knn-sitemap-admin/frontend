"use client";

import { useEffect, useRef } from "react";
import type { PinKind } from "@/features/pins/types";
import type { AreaSet as StrictAreaSet } from "@/features/properties/components/sections/AreaSetsSection/types";

const VISIT_PLAN_PIN_KIND: PinKind = "question";

const isVisitPlanPinKind = (pinKind: any): boolean =>
  String(pinKind) === VISIT_PLAN_PIN_KIND;

type Args = {
  form: any; // useCreateForm 반환 타입
  pinDraftId?: string | number | null;
  initialPinKind?: PinKind | null;
};

export function useVisitPlanMode({ form, pinDraftId, initialPinKind }: Args) {
  const anyForm = form as any;

  // 🔹 현재 폼에 설정된 핀 종류 (유저가 클릭으로 바꾼 값)
  const currentKind = anyForm.pinKind as PinKind | null | undefined;

  // 🔹 현재값이 있으면 그걸 우선, 없으면 initialPinKind 사용
  const effectiveKind: PinKind | null =
    (currentKind as PinKind | null | undefined) ??
    (initialPinKind as PinKind | null | undefined) ??
    null;

  /** 🔍 이 모달이 '답사예정 전용 모드'인지 여부
   *  - draft 가 없고
   *  - 현재(또는 초기) pinKind 가 "question" 인 경우만 visit-plan 모드
   */
  const isVisitPlanPin = !pinDraftId && isVisitPlanPinKind(effectiveKind);

  // 최초 마운트 시 pinKind 초기값 설정
  const didInitPinKindRef = useRef(false);
  useEffect(() => {
    if (didInitPinKindRef.current) return;

    const setPinKind = (form as any).setPinKind as
      | ((kind: PinKind) => void)
      | undefined;
    if (typeof setPinKind !== "function") return;

    const anyForm = form as any;
    const currentKind = anyForm.pinKind as PinKind | null | undefined;

    const targetKind: PinKind =
      (initialPinKind as PinKind | null | undefined) ?? currentKind ?? "1room";

    setPinKind(targetKind);
    didInitPinKindRef.current = true;
  }, [form, initialPinKind]);

  /** ✅ 일반핀 → 답사예정핀으로 전환될 때, 비활성화되는 필드 값 초기화 */
  const prevIsVisitPlanRef = useRef(isVisitPlanPin);
  useEffect(() => {
    const prev = prevIsVisitPlanRef.current;

    if (isVisitPlanPin && prev === false) {
      const anyForm = form as any;

      anyForm.setBuildingGrade?.(null);
      anyForm.setParkingGrade?.("");
      anyForm.setSlopeGrade?.("");
      anyForm.setStructureGrade?.("");

      anyForm.setBuildingType?.(null);
      anyForm.buildingType = null;
      anyForm.setBuildingTypes?.([]);
      anyForm.buildingTypes = [];

      anyForm.setCompletionDate?.("");
      anyForm.completionDate = "";

      if (typeof anyForm.setSalePrice === "function") {
        anyForm.setSalePrice(null);
      } else {
        anyForm.salePrice = null;
      }

      anyForm.setTotalBuildings?.("");
      anyForm.setTotalFloors?.("");
      anyForm.setTotalHouseholds?.("");
      anyForm.setRemainingHouseholds?.("");

      anyForm.setTotalParkingSlots?.(null);
      anyForm.setParkingType?.("");
      anyForm.setParkingTypes?.([]);
      anyForm.parkingTypes = [];

      anyForm.setElevator?.(null);

      const emptyArea: StrictAreaSet = {
        title: "",
        exMinM2: "",
        exMaxM2: "",
        exMinPy: "",
        exMaxPy: "",
        realMinM2: "",
        realMaxM2: "",
        realMinPy: "",
        realMaxPy: "",
      };
      anyForm.setBaseAreaSet?.(emptyArea);
      anyForm.setExtraAreaSets?.([]);

      if (typeof anyForm.setUnitLines === "function") {
        anyForm.setUnitLines([]);
      } else {
        anyForm.unitLines = [];
      }

      anyForm.setAspects?.([]);

      anyForm.setOptions?.([]);
      anyForm.setEtcChecked?.(false);
      anyForm.setPublicMemo?.("");
      anyForm.setSecretMemo?.("");
    }

    prevIsVisitPlanRef.current = isVisitPlanPin;
  }, [isVisitPlanPin, form]);

  return { isVisitPlanPin };
}
