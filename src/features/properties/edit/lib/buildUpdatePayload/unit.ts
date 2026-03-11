"use client";

import type { UnitLine } from "@/features/properties/types/property-domain";

/* ───────── unitLines 정규화/비교 ───────── */
export type UnitLike = Partial<UnitLine> & {
  rooms?: number | null;
  baths?: number | null;
  hasLoft?: boolean;
  loft?: boolean;
  hasTerrace?: boolean;
  terrace?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  note?: string | null;
};

const pickBool = (u: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = u?.[k];
    if (typeof v === "boolean") return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
  }
  return false;
};

const pick = <T>(u: any, ...keys: string[]) => {
  for (const k of keys) {
    if (u?.[k] !== undefined) return u[k] as T;
  }
  return undefined as unknown as T;
};

export const normalizeUnit = (u?: UnitLike) => {
  const uu: any = u ?? {};
  let minPrice = pick<number | null>(uu, "minPrice") ?? null;
  let maxPrice = pick<number | null>(uu, "maxPrice") ?? null;

  if (minPrice !== null && maxPrice === null) maxPrice = minPrice;
  if (maxPrice !== null && minPrice === null) minPrice = maxPrice;

  return {
    rooms: pick<number | null>(uu, "rooms") ?? null,
    baths: pick<number | null>(uu, "baths") ?? null,
    hasLoft: pickBool(uu, "hasLoft", "loft"),
    hasTerrace: pickBool(uu, "hasTerrace", "terrace"),
    minPrice,
    maxPrice,
    note: pick<string | null>(uu, "note") ?? null,
  };
};

const sameUnit = (a?: UnitLike, b?: UnitLike) => {
  const A = normalizeUnit(a);
  const B = normalizeUnit(b);
  return (
    A.rooms === B.rooms &&
    A.baths === B.baths &&
    A.hasLoft === B.hasLoft &&
    A.hasTerrace === B.hasTerrace &&
    A.minPrice === B.minPrice &&
    A.maxPrice === B.maxPrice &&
    A.note === B.note
  );
};

export const unitLinesChanged = (prev?: UnitLine[], curr?: UnitLine[]) => {
  const P = Array.isArray(prev) ? prev : undefined;
  const C = Array.isArray(curr) ? curr : undefined;
  if (!P && !C) return false;
  if (!P || !C) return true;
  if (P.length !== C.length) return true;
  for (let i = 0; i < P.length; i++) if (!sameUnit(P[i], C[i])) return true;
  return false;
};
