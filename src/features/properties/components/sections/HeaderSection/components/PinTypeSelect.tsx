"use client";

import Image from "next/image";
import SafeSelect from "@/shared/components/safe/SafeSelect";

import type { PinKind } from "@/features/pins/types";
import type { BuildingGrade } from "@/features/properties/types/building-grade";
import { getDisplayPinKind } from "@/features/pins/lib/getDisplayPinKind";
import { getPinUrl } from "@/features/pins/lib/assets";

/**
 * 🔸 PinKind 타입과 1:1로 맞춘 기본 옵션
 */
const PIN_OPTION_BASE = [
  { value: "1room", label: "1룸~1.5룸" },
  { value: "1room-terrace", label: "1룸~1.5룸 (테라스)" },
  { value: "2room", label: "2룸~2.5룸" },
  { value: "2room-terrace", label: "2룸~2.5룸 (테라스)" },
  { value: "3room", label: "3룸" },
  { value: "3room-terrace", label: "3룸 (테라스)" },
  { value: "4room", label: "4룸" },
  { value: "4room-terrace", label: "4룸 (테라스)" },
  { value: "duplex", label: "복층" },
  { value: "duplex-terrace", label: "복층 (테라스)" },
  { value: "townhouse", label: "타운하우스" },
  { value: "question", label: "답사예정" },
  { value: "completed", label: "입주완료" },
] as const;

/** 옵션 기반 타입 가드: unknown -> PinKind */
function isPinKind(v: unknown): v is PinKind {
  return (PIN_OPTION_BASE as readonly { value: string }[]).some(
    (o) => o.value === v
  );
}

function PinOptionView({ iconUrl, label }: { iconUrl: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Image src={iconUrl} alt="" width={18} height={18} unoptimized />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function PinTypeSelect({
  value,
  onChange,
  className,
  placeholder = "핀 종류 선택",
  /** 신축/구옥에 따라 아이콘만 변경 */
  buildingGrade = null,
}: {
  value: PinKind | null;
  onChange: (v: PinKind) => void;
  className?: string;
  placeholder?: string;
  buildingGrade?: BuildingGrade | null;
}) {
  const items = PIN_OPTION_BASE.map((o) => {
    // 🔧 신축/구옥에 따라 아이콘 결정
    const ageType = buildingGrade === "old" ? "OLD" : "NEW";
    const displayKind = getDisplayPinKind(o.value as PinKind, ageType);
    const iconUrl = getPinUrl(displayKind as PinKind);

    return {
      value: o.value,
      label: <PinOptionView iconUrl={iconUrl} label={o.label} />,
    };
  });

  return (
    <SafeSelect
      value={value ?? undefined} // null이면 placeholder 보임
      onChange={(v) => {
        if (v == null) return;
        if (isPinKind(v)) onChange(v);
      }}
      items={items}
      placeholder={placeholder}
      className={className ?? "w-[220px] h-9"}
      contentClassName="z-[1100] max-h-[320px]"
    />
  );
}
