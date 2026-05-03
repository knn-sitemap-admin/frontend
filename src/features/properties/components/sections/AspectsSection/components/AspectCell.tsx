"use client";

import { Button } from "@/components/atoms/Button/Button";
import { Trash2 } from "lucide-react";
import SafeSelect from "@/shared/components/safe/SafeSelect";
import type {
  AspectRowLite,
  OrientationValue,
} from "@/features/properties/types/property-domain";

type Props = {
  row: AspectRowLite;
  orientations: readonly OrientationValue[];
  setAspectDir: (no: number, dir: OrientationValue | "") => void;
  removeAspect: (no: number) => void;
  canRemove: boolean;
};

export default function AspectCell({
  row,
  orientations,
  setAspectDir,
  removeAspect,
  canRemove,
}: Props) {
  // SafeSelect는 빈 값을 null로 다루도록
  const value: string | null = row.dir && row.dir.length > 0 ? row.dir : null;

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right">{row.no}호</span>

      <SafeSelect
        value={value}
        onChange={(v) => {
          // null → "" 로 변환하여 상위 상태에 반영
          setAspectDir(row.no, (v ?? "") as OrientationValue | "");
        }}
        items={orientations.map((o) => ({ value: o, label: o }))}
        placeholder="방향"
        className="w-[110px] h-9"
      />

      {canRemove && (
        <Button
          size="icon"
          variant="ghost"
          type="button"
          onClick={() => removeAspect(row.no)}
          title="삭제"
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
