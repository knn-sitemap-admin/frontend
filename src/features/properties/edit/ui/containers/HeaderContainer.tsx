"use client";

import { BuildingGrade } from "@/features/properties/types/building-grade";
import HeaderSection from "@/features/properties/components/sections/HeaderSection/HeaderSection";
import { PinKind } from "@/features/pins/types";
import { useMeRole } from "@/features/auth/hooks/useMeRole";

/** 최신 버전 폼 타입 */
export type HeaderForm = {
  title: string;
  setTitle: (v: string) => void;

  parkingGrade: "" | "1" | "2" | "3" | "4" | "5";
  setParkingGrade: (v: "" | "1" | "2" | "3" | "4" | "5") => void;

  elevator: "O" | "X" | null;
  setElevator: (v: "O" | "X" | null) => void;

  /** 핀선택: placeholder를 쓰기 위해 null 허용 */
  pinKind: PinKind | null;
  setPinKind: (v: PinKind | null) => void;

  /** 신축/구옥 */
  buildingGrade: BuildingGrade | null;
  setBuildingGrade: (v: BuildingGrade | null) => void;

  /** 🔥 헤더 R 인풋 원본 값 (useEditForm.rebateRaw 와 매칭) */
  rebateRaw: string;
  setRebateRaw: (v: string) => void;
};

export default function HeaderContainer({
  form,
  onClose,
  isVisitPlanPin,
  showValidationErrors,
}: {
  form: HeaderForm;
  onClose: () => void;
  isVisitPlanPin?: boolean;
  showValidationErrors?: boolean;
}) {
  const { isPrivileged } = useMeRole();

  // ✅ HeaderSection이 기대하는 시그니처로 맞춰주는 어댑터
  const handleSetRebate = (v: string | number | null) => {
    if (v == null) form.setRebateRaw("");
    else form.setRebateRaw(String(v));
  };

  return (
    <HeaderSection
      title={form.title}
      setTitle={form.setTitle}
      parkingGrade={form.parkingGrade}
      setParkingGrade={form.setParkingGrade}
      elevator={form.elevator}
      setElevator={form.setElevator}
      onClose={onClose}
      pinKind={form.pinKind}
      setPinKind={form.setPinKind}
      buildingGrade={form.buildingGrade}
      setBuildingGrade={form.setBuildingGrade}
      // 🔥 useEditForm.rebateRaw 을 그대로 사용
      rebate={form.rebateRaw}
      setRebate={handleSetRebate}
      isVisitPlanPin={isVisitPlanPin}
      showValidationErrors={showValidationErrors}
      showCompletedOption={isPrivileged}
    />
  );
}
