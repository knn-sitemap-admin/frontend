"use client";

import StructureLinesList from "../../sections/StructureLinesList";

type UnitView = {
  rooms: number;
  baths: number;
  hasLoft: boolean;
  hasTerrace: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  note?: string | null;
};

const toNum = (v: any): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const toBool = (v: any) =>
  v === true || v === "true" || v === 1 || v === "1" || v === "Y" || v === "y";

/** 구버전 lines → 신버전 units 변환 */
function convertLinesToUnits(lines?: any[] | null): UnitView[] {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => ({
    rooms: toNum(l?.rooms) ?? 0,
    baths: toNum(l?.baths) ?? 0,
    hasLoft: toBool(l?.duplex),
    hasTerrace: toBool(l?.terrace),
    // 가격값이 없으면 primary/secondary를 숫자로 파싱해서 사용
    minPrice: toNum(l?.minPrice) ?? toNum(l?.primary),
    maxPrice: toNum(l?.maxPrice) ?? toNum(l?.secondary),
    note: l?.note ?? null,
  }));
}

export default function StructureLinesListContainer({
  lines = [],
  units = [],
}: {
  lines?: any[];
  units?: UnitView[];
}) {
  // units 우선, 없으면 lines를 변환해서라도 4열로 표시
  const effUnits: UnitView[] =
    Array.isArray(units) && units.length > 0
      ? units
      : convertLinesToUnits(lines);

  // 둘 다 없으면 옛 리스트(하이픈 표시) 구조 재사용
  if (effUnits.length === 0) {
    return (
      <section className="rounded-xl border p-4">
        <StructureLinesList lines={[]} showTitle />
      </section>
    );
  }

  // UnitView → StructureLinesList가 이해하는 모양으로 변환
  const effLines = effUnits.map((u, idx) => ({
    id: idx,
    rooms: u.rooms,
    baths: u.baths,
    duplex: u.hasLoft,
    terrace: u.hasTerrace,
    minPrice: u.minPrice,
    maxPrice: u.maxPrice,
    note: u.note,
  }));

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-medium">구조별 입력</h3>
      {/* 안쪽 리스트는 타이틀 없이 재사용 */}
      <StructureLinesList lines={effLines as any[]} showTitle={false} />
    </section>
  );
}
