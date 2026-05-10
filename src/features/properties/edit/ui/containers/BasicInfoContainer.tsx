"use client";
import BasicInfoSection from "@/features/properties/components/sections/BasicInfoSection/BasicInfoSection";
import { EditFormAPI } from "@/features/properties/edit/types/editForm.slices";

export default function BasicInfoContainer({
  form,
  showValidationErrors,
}: {
  form: EditFormAPI;
  showValidationErrors?: boolean;
}) {
  return (
    <BasicInfoSection
      address={form.address}
      setAddress={form.setAddress}
      officePhone={form.officePhone}
      setOfficePhone={form.setOfficePhone}
      officePhone2={form.officePhone2}
      setOfficePhone2={form.setOfficePhone2}
      showValidationErrors={showValidationErrors}
    />
  );
}
