"use client";

import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Checkbox } from "@/components/atoms/Checkbox/Checkbox";
import { Trash2, Plus } from "lucide-react";
import type { UnitLine } from "@/features/properties/types/property-domain";

type StructureLinesProps = {
  lines: UnitLine[];
  onAddPreset: (preset: string) => void;
  onAddEmpty: () => void;
  onUpdate: (idx: number, patch: Partial<UnitLine>) => void;
  onRemove: (idx: number) => void;
  presets: readonly string[];
  title?: string;
};

export default function StructureLinesSection({
  lines,
  onAddPreset,
  onAddEmpty,
  onUpdate,
  onRemove,
  presets,
  title = "구조별 입력",
}: StructureLinesProps) {
  return (
    <div className="space-y-2">
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-sm font-medium shrink-0">
          <span>{title}</span>
        </div>

        <div className="flex flex-wrap gap-1 sm:justify-end">
          {presets.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              type="button"
              onClick={() => onAddPreset(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            type="button"
            onClick={onAddEmpty}
          >
            <Plus className="h-3 w-3 mr-1" />
            직접추가
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {lines.length === 0 && (
          <div className="text-xs text-muted-foreground">
            프리셋을 누르거나 ‘직접추가’를 눌러 행을 추가하세요.
          </div>
        )}

        {lines.map((line, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0 md:grid md:grid-cols-[68px_max-content_max-content_1fr_40px] md:items-center md:gap-x-4 md:pb-3"
          >
            {/* 모바일 상단 / 데스크탑 그리드 구성 요소 */}
            <div className="flex items-center gap-2 md:contents">
              {/* 구조 */}
              <Input
                value={`${line.rooms || ""}/${line.baths || ""}`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\s/g, "");
                  const [r, b] = v.split("/");
                  onUpdate(idx, {
                    rooms: parseInt(r || "0", 10) || 0,
                    baths: parseInt(b || "0", 10) || 0,
                  });
                }}
                placeholder="2/1"
                className="h-8 md:h-9 w-[44px] md:w-[68px] text-center"
                inputMode="numeric"
                pattern="[0-9/]*"
              />

              {/* 옵션들 (복층, 테라스) */}
              <label className="inline-flex items-center gap-1.5 text-xs md:text-sm md:pl-2">
                <Checkbox
                  checked={line.duplex}
                  onCheckedChange={(c) => onUpdate(idx, { duplex: !!c })}
                />
                <span>복층</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs md:text-sm md:pr-4">
                <Checkbox
                  checked={line.terrace}
                  onCheckedChange={(c) => onUpdate(idx, { terrace: !!c })}
                />
                <span>테라스</span>
              </label>

              {/* 가격 범위 (모바일에서는 아래 행, 데스크탑에선 4번째 그리드 칸) */}
              <div className="w-full md:col-start-4 md:row-start-1">
                <div className="flex flex-row items-center gap-2 w-full md:grid md:grid-cols-[1fr_auto_1fr] md:gap-2">
                  <div className="flex-1 flex items-center gap-1.5">
                    <Input
                      value={line.primary}
                      onChange={(e) => onUpdate(idx, { primary: e.target.value })}
                      placeholder="최소"
                      className="h-8 md:h-9 flex-1 min-w-0"
                      inputMode="numeric"
                      inputClassName="placeholder:text-[11px] md:placeholder:text-xs"
                      required
                    />
                    <span className="text-[11px] md:text-xs text-gray-400 shrink-0">만</span>
                  </div>
                  <span className="text-gray-300 text-xs text-center">~</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <Input
                      value={line.secondary}
                      onChange={(e) => onUpdate(idx, { secondary: e.target.value })}
                      placeholder="최대"
                      className="h-8 md:h-9 flex-1 min-w-0"
                      inputMode="numeric"
                      inputClassName="placeholder:text-[11px] md:placeholder:text-xs"
                      required
                    />
                    <span className="text-[11px] md:text-xs text-gray-400 shrink-0">만</span>
                  </div>
                </div>
              </div>

              {/* 삭제 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => onRemove(idx)}
                className="ml-auto shrink-0 md:col-start-5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* 구조 메모 */}
            <div className="md:col-span-full">
              <Input
                value={line.note || ""}
                onChange={(e) => onUpdate(idx, { note: e.target.value })}
                placeholder="구조적 특이성 메모 (예: 확장, 근생, 대물 등)"
                className="h-8 md:h-9 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
