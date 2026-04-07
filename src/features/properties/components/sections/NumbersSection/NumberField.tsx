"use client";

import { Input } from "@/components/atoms/Input/Input";
import { ChevronUp, ChevronDown } from "lucide-react";
import Field from "@/components/atoms/Field/Field";
import {
  KeyboardEventHandler,
  useCallback,
  useRef,
  WheelEventHandler,
} from "react";

interface NumberFieldProps {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;

  step?: number;
  min?: number;
  max?: number;

  align?: "start" | "center" | "end";
  labelWidth?: number | string;
  rowMinHeight?: number | string;
  dense?: boolean;
  className?: string;
}

export default function NumberField({
  label,
  value,
  setValue,
  placeholder,
  step = 1,
  min = 0,
  max,
  align = "center",
  labelWidth = 56,
  rowMinHeight = 36,
  dense = false,
  className,
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toNum = useCallback((s: string) => {
    if (s.trim() === "") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, []);

  const clamp = useCallback(
    (n: number) => {
      if (typeof max === "number") n = Math.min(n, max);
      if (typeof min === "number") n = Math.max(n, min);
      return n;
    },
    [min, max]
  );

  const inc = useCallback(() => {
    const curr = toNum(value);
    const next = Number.isNaN(curr) ? clamp(step) : clamp(curr + step);
    setValue(String(next));
  }, [value, step, clamp, setValue, toNum]);

  const dec = useCallback(() => {
    const curr = toNum(value);
    const next = Number.isNaN(curr) ? clamp(min ?? 0) : clamp(curr - step);
    setValue(String(next));
  }, [value, step, clamp, setValue, toNum, min]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      inc();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      dec();
    }
  };

  const onWheel: WheelEventHandler<HTMLInputElement> = (e) => {
    if (document.activeElement !== inputRef.current) return;
    e.preventDefault();
    if (e.deltaY < 0) inc();
    else dec();
  };

  return (
    <Field
      label={label}
      dense={dense}
      align={align}
      labelWidth={labelWidth}
      rowMinHeight={rowMinHeight}
      className={className}
    >
      {/* 인풋 + 커스텀 스피너를 한 컨테이너 안에 넣기 */}
      <div className="relative inline-flex w-full max-w-[96px] items-center">
        <Input
          ref={inputRef}
          // 브라우저 기본 스피너는 안 쓰고, 숫자 키패드만 띄우기
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onWheel={onWheel}
          placeholder={placeholder}
          className="
            h-9 w-full pr-7 text-right
            [appearance:textfield]
            [&::-webkit-inner-spin-button]:appearance-none
            [&::-webkit-outer-spin-button]:appearance-none
          "
        />

        {/* 오른쪽 커스텀 ↑ / ↓ 버튼 스택 */}
        <div className="pointer-events-none absolute inset-y-[2px] right-[2px] flex w-5 flex-col">
          <button
            type="button"
            onClick={inc}
            className="
              pointer-events-auto flex-1 flex items-center justify-center
              text-xs text-gray-400 hover:text-gray-700
            "
            aria-label="증가"
            tabIndex={-1}
          >
            <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={dec}
            className="
              pointer-events-auto flex-1 flex items-center justify-center
              text-xs text-gray-400 hover:text-gray-700
            "
            aria-label="감소"
            tabIndex={-1}
          >
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Field>
  );
}
