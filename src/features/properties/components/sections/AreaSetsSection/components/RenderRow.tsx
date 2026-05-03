"use client";

import Field from "@/components/atoms/Field/Field";
import { Input } from "@/components/atoms/Input/Input";
import { ReactNode } from "react";

type RenderRowProps = {
  label: ReactNode;
  m2Min: string;
  onM2Min: (v: string) => void;
  m2Max: string;
  onM2Max: (v: string) => void;
  pyMin: string;
  onPyMin: (v: string) => void;
  pyMax: string;
  onPyMax: (v: string) => void;
};

export default function RenderRow({
  label,
  m2Min,
  onM2Min,
  m2Max,
  onM2Max,
  pyMin,
  onPyMin,
  pyMax,
  onPyMax,
}: RenderRowProps) {
  return (
    <div className="flex items-start gap-4">
      <Field label={label}>
        {/* ───────── PC(>= md): 한 줄 레이아웃 ───────── */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <Input
            className="h-9 w-24"
            value={m2Min}
            onChange={(e) => onM2Min(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="최소"
            inputMode="numeric"
          />
          <span className="text-muted-foreground">m² ~</span>
          <Input
            className="h-9 w-24"
            value={m2Max}
            onChange={(e) => onM2Max(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="최대"
            inputMode="numeric"
          />
          <span className="text-muted-foreground">m²</span>

          <div className="w-4" />

          <Input
            className="h-9 w-24"
            value={pyMin}
            onChange={(e) => onPyMin(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="최소"
            inputMode="numeric"
          />
          <span className="text-muted-foreground">평 ~</span>
          <Input
            className="h-9 w-24"
            value={pyMax}
            onChange={(e) => onPyMax(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="최대"
            inputMode="numeric"
          />
          <span className="text-muted-foreground">평</span>
        </div>

        {/* ───────── 모바일(< md): 두 줄 레이아웃 ───────── */}
        <div className="flex flex-col gap-1 md:hidden">
          {/* 1줄: m² */}
          <div className="flex items-center gap-1">
            <Input
              className="h-9 w-20"
              value={m2Min}
              onChange={(e) => onM2Min(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="최소"
              inputMode="numeric"
            />
            <span className="text-muted-foreground text-xs">m² ~</span>
            <Input
              className="h-9 w-20"
              value={m2Max}
              onChange={(e) => onM2Max(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="최대"
              inputMode="numeric"
            />
            <span className="text-muted-foreground text-xs">m²</span>
          </div>

          {/* 2줄: 평 */}
          <div className="flex items-center gap-1">
            <Input
              className="h-9 w-20"
              value={pyMin}
              onChange={(e) => onPyMin(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="최소"
              inputMode="numeric"
            />
            <span className="text-muted-foreground text-xs">평 ~</span>
            <Input
              className="h-9 w-20"
              value={pyMax}
              onChange={(e) => onPyMax(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="최대"
              inputMode="numeric"
            />
            <span className="text-muted-foreground text-xs">평</span>
          </div>
        </div>
      </Field>
    </div>
  );
}
