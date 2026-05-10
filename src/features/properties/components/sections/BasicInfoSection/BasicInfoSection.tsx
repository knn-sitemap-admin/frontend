"use client";

import { Phone } from "lucide-react";
import Field from "@/components/atoms/Field/Field";
import { Input } from "@/components/atoms/Input/Input";
import { formatPhone } from "@/lib/formatPhone";
import type { BasicInfoSectionProps } from "./types";

/**
 * 기본정보 섹션
 * - 주소 (읽기 전용)
 * - 분양사무실 대표/추가 연락처
 */
export default function BasicInfoSection({
  address,
  setAddress,
  officePhone,
  setOfficePhone,
  officePhone2,
  setOfficePhone2,
  showValidationErrors,
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* 주소 */}
      <Field label={<>주소 <span className="text-red-500 ml-0.5">*</span></>}>
        <div className="flex flex-col flex-1">
          <Input
            value={address ?? ""}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 서울 성동구 성수동1가 ..."
            className="h-9"
            readOnly
            aria-readonly="true"
          />
          {showValidationErrors && !address?.trim() && (
            <p className="text-red-500 text-[11px] mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
              주소를 입력해 주세요.
            </p>
          )}
        </div>
      </Field>

      {/* 분양사무실 연락처 */}
      <Field label={<>분양사무실 <span className="text-red-500 ml-0.5">*</span></>}>
        <div className="flex flex-col flex-1">
          <div className="w-full grid grid-cols-2 gap-5 md:gap-0">
            <Input
              value={officePhone ?? ""}
              onChange={(e) => setOfficePhone(formatPhone(e.target.value))}
              placeholder="대표번호"
              className="md:w-2/3 h-9"
              inputMode="tel"
              leftIcon={<Phone className="w-4 h-4" />}
            />
            <Input
              value={officePhone2 ?? ""}
              onChange={(e) => setOfficePhone2(formatPhone(e.target.value))}
              placeholder="추가번호 (선택)"
              className="md:w-2/3 h-9"
              inputMode="tel"
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>
          {showValidationErrors && !officePhone?.trim() && (
            <p className="text-red-500 text-[11px] mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
              분양사무실 연락처를 입력해 주세요.
            </p>
          )}
        </div>
      </Field>
    </div>
  );
}
