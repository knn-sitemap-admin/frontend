import type { UnitLine } from "@/features/properties/types/property-domain";
import { toInt, toNum, s } from "./numeric";

/** units 정규화: 서버가 원할 법한 프리미티브만 남기고 숫자/불리언 정리 */
export function normalizeUnits(lines: UnitLine[] | undefined | null) {
  if (!Array.isArray(lines)) return [];

  return lines.map((u: any) => {
    const out: Record<string, any> = {};

    if (u.rooms !== undefined) out.rooms = toInt(u.rooms) ?? null;
    if (u.baths !== undefined) out.baths = toInt(u.baths) ?? null;
    if (u.minPrice !== undefined) out.minPrice = toInt(u.minPrice) ?? null;
    if (u.maxPrice !== undefined) out.maxPrice = toInt(u.maxPrice) ?? null;
    if (u.deposit !== undefined) out.deposit = toInt(u.deposit) ?? null;
    if (u.rent !== undefined) out.rent = toInt(u.rent) ?? null;
    if (u.maintenanceFee !== undefined)
      out.maintenanceFee = toInt(u.maintenanceFee) ?? null;
    if (u.supplyM2 !== undefined) out.supplyM2 = toNum(u.supplyM2);
    if (u.exclusiveM2 !== undefined) out.exclusiveM2 = toNum(u.exclusiveM2);

    if (u.hasLoft !== undefined) out.hasLoft = !!u.hasLoft;
    if (u.hasTerrace !== undefined) out.hasTerrace = !!u.hasTerrace;

    if (u.type !== undefined) out.type = s(u.type);
    if (u.label !== undefined) out.label = s(u.label);
    if (u.note !== undefined) out.note = s(u.note);

    return out;
  });
}
