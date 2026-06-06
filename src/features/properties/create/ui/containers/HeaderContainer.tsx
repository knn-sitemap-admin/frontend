"use client";

import { PinKind } from "@/features/pins/types";
import HeaderSection from "@/features/properties/components/sections/HeaderSection/HeaderSection";
import { BuildingGrade } from "@/features/properties/types/building-grade";
import { useMeRole } from "@/features/auth/hooks/useMeRole";

type HeaderForm = {
  title: string;
  setTitle: (v: string) => void;

  /** 매물평점: '1' ~ '5' 또는 '' */
  parkingGrade: "" | "1" | "2" | "3" | "4" | "5";
  setParkingGrade: (v: "" | "1" | "2" | "3" | "4" | "5") => void;

  /** 엘리베이터 - 내부 상태는 null 허용 */
  elevator: "O" | "X" | null;
  setElevator: (v: "O" | "X" | null) => void;

  /** 🔹 핀 종류 - null 허용 (핀 미선택 상태) */
  pinKind: PinKind | null;
  setPinKind: (v: PinKind | null) => void;

  /** 신축/구옥 — "new" | "old" | null(미선택) */
  buildingGrade: BuildingGrade | null;
  setBuildingGrade: (v: BuildingGrade | null) => void;

  /** 🔴 헤더 R 인풋의 원본 숫자 문자열 */
  rebateRaw: string;
  setRebateRaw: (v: string) => void;
};

type HeaderContainerProps = {
  form: HeaderForm;
  onClose: () => void;
  /** 답사예정핀(question) 여부 */
  isVisitPlanPin?: boolean;
  showValidationErrors?: boolean;
};

export default function HeaderContainer({
  form,
  onClose,
  isVisitPlanPin,
  showValidationErrors,
}: HeaderContainerProps) {
  const { isPrivileged } = useMeRole();
  // ⭐ 답사예정일 때: 별점/엘리베이터/신축·구옥만 막고,
  //    핀 종류(pinKind)는 항상 변경 가능해야 한다.
  const disabled = !!isVisitPlanPin;

  return (
    <div className="sticky top-0 z-[1002] bg-white">
      <HeaderSection
        /** 매물명은 항상 입력 가능 */
        title={form.title}
        setTitle={form.setTitle}
        parkingGrade={form.parkingGrade}
        /** 답사예정핀일 때 매물평점 변경 막기 */
        setParkingGrade={(v) => {
          if (disabled) return;
          form.setParkingGrade(v);
        }}
        // HeaderSection은 "O" | "X"만 받으므로 null이면 기본값 "X"로 보냄
        elevator={form.elevator ?? "X"}
        // 답사예정핀일 때 엘리베이터 토글 막기
        setElevator={(v) => {
          if (disabled) return;
          form.setElevator(v);
        }}
        pinKind={form.pinKind}
        // ✅ 핀 종류는 항상 변경 가능 (답사예정 → 다른 핀, 다른 핀 → 답사예정)
        setPinKind={(v) => {
          form.setPinKind(v);
        }}
        // 신축/구옥도 답사예정이면 변경 막기
        buildingGrade={form.buildingGrade}
        setBuildingGrade={(next) => {
          if (disabled) return;
          form.setBuildingGrade(next);
        }}
        /** 🔴 헤더 R 인풋 ↔ form.rebateRaw 연결 */
        rebate={form.rebateRaw}
        setRebate={(next) => {
          if (disabled) return;
          // null 이나 빈 값 들어오면 빈 문자열로
          const s = next == null ? "" : String(next);
          form.setRebateRaw(s.replace(/[^\d]/g, "")); // 숫자만
        }}
        onClose={onClose}
        /** 별/리베이트/신축·구옥 비활성화용 플래그 */
        isVisitPlanPin={isVisitPlanPin}
        showValidationErrors={showValidationErrors}
        /** ✅ manager/admin 전용: 입주완료 옵션 노출 */
        showCompletedOption={isPrivileged}
      />
    </div>
  );
}
