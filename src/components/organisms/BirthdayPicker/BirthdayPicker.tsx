"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import SafePopover from "@/shared/components/safe/SafePopover"; // ✅ 가드된 Popover
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { toYMD, parseYMD, isValidYMD } from "@/lib/dateUtils"; // ✅ 공통 유틸 사용

/** 타이핑 중에 8자리까지 숫자를 받아 YYYY-MM-DD 형태로 만들어 줌 */
function buildYmdWhileTyping(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);

  let out = y;
  if (m.length > 0) out += "-" + m;
  if (d.length > 0) out += "-" + d;
  return out;
}

/** blur 시  YYYY, YYYY-M, YYYY-MM, YYYY-M-D, YYYY-MM-D -> 표준화(0패딩) */
function normalizeYmdOnBlur(s: string) {
  if (!s) return "";
  const m = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return s;

  const yy = m[1];
  const mm = m[2] ? m[2].padStart(2, "0") : "";
  const dd = m[3] ? m[3].padStart(2, "0") : "";

  const final = dd ? `${yy}-${mm}-${dd}` : mm ? `${yy}-${mm}` : yy;
  return final;
}

type Props = {
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
  className?: string;
};

export default function BirthdayPicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  fromYear = 1960,
  toYear = new Date().getFullYear(),
  disabled,
  className,
}: Props) {
  const [draft, setDraft] = React.useState(value ?? "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = buildYmdWhileTyping(e.target.value);
    setDraft(next);

    // 완성된 YYYY-MM-DD이며 달력 유효성까지 통과하면 반영
    if (isValidYMD(next)) onChange(next);
    if (next === "") onChange(""); // 비우기 허용
  };

  const handleBlur = () => {
    const normalized = normalizeYmdOnBlur(draft);
    setDraft(normalized);

    // blur 후 완성(Y-M-D) + 달력 유효성까지 확인되면 반영
    if (isValidYMD(normalized)) onChange(normalized);
    // 미완성(YYYY, YYYY-MM)은 그대로 유지(사용자 의도 보존)
  };

  // 캘린더 selected는 로컬 Date로 전달해야 off-by-one 방지됨
  const selectedDate = React.useMemo(() => {
    return isValidYMD(draft) ? parseYMD(draft)! : undefined;
  }, [draft]);

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* ✅ 가드된 Popover 사용 (refCb만 전달) */}
      <SafePopover
        open={open}
        onOpenChange={setOpen}
        align="end"
        className="p-0 w-auto"
        trigger={({ refCb }) => (
          <Button
            ref={refCb as any}
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={disabled}
            aria-label="달력 열기"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        )}
        content={
          <Calendar
            className="min-w-[320px]"
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(d) => {
              if (!d) return;
              const next = toYMD(d); // 로컬 기준 YYYY-MM-DD
              setDraft(next);
              onChange(next);
              setOpen(false);
            }}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
          />
        }
      />
    </div>
  );
}
