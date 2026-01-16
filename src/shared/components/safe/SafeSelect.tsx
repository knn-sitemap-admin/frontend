"use client";

import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/Select/Select";
import {
  useStableRefCallback,
  useGuardedSetter,
} from "@/shared/react/safeRefs";

type Item = { value: string; label: React.ReactNode };

type Props = {
  value?: string | null;
  onChange: (v: string | null) => void;
  items: Item[];
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;

  contentClassName?: string;
  position?: "item-aligned" | "popper";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** 선택 해제를 허용할지 여부 (선택 해제 시 null 값 전달) */
  allowUnset?: boolean;
};

// "선택 해제"를 나타내는 특별한 값 (Select 컴포넌트에서 빈 문자열은 placeholder 표시용으로 사용되므로 다른 값 사용)
const UNSET_VALUE = "__UNSET__";

export default function SafeSelect({
  value,
  onChange,
  items,
  placeholder = "선택",
  open,
  onOpenChange,
  className,
  contentClassName,
  position = "popper",
  side,
  align,
  sideOffset,
  allowUnset = false,
}: Props) {
  const controlledOpen = typeof open === "boolean" ? open : undefined;
  const setOpenGuarded = useGuardedSetter<boolean>(onOpenChange ?? (() => {}));
  const setTrigRef = useStableRefCallback<HTMLButtonElement>();

  // value가 null이면 UNSET_VALUE 또는 빈 문자열로 변환 (allowUnset에 따라)
  const selectValue = value == null ? (allowUnset ? UNSET_VALUE : "") : value;

  // items에서 빈 문자열 제거하고 UNSET_VALUE로 변환 (allowUnset인 경우)
  const processedItems = allowUnset
    ? [{ value: UNSET_VALUE, label: placeholder }, ...items] // "선택" 항목 추가
    : items.filter((it) => it.value !== ""); // 빈 문자열 항목 제거

  const valueInItems = processedItems.some(item => item.value === selectValue);

  return (
    <Select
      value={valueInItems ? selectValue : (allowUnset ? UNSET_VALUE : "")} // 값이 items에 없으면 UNSET_VALUE로 설정하여 placeholder 표시
      onValueChange={(v) => {
        // UNSET_VALUE나 빈 문자열이면 null로 변환, 아니면 그대로 전달
        onChange(v === UNSET_VALUE || v === "" ? null : v);
      }}
      open={controlledOpen}
      onOpenChange={(v) => setOpenGuarded(Boolean(v))}
    >
      <SelectTrigger ref={setTrigRef} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent
        position={position}
        className={contentClassName}
        {...(side ? { side } : {})}
        {...(align ? { align } : {})}
        {...(typeof sideOffset === "number" ? { sideOffset } : {})}
      >
        {processedItems.map((it) => (
          <SelectItem key={String(it.value)} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
