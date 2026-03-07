import type { FilterState } from "../types/filterSearch.types";
import type { PinSearchParams } from "@/features/pins/types/pin-search";
import { BuildingType } from "@/features/properties/types/property-domain";
import { PYEONG_TO_M2 } from "@/features/properties/lib/area";

const toInt = (s: string) => {
  const n = Number((s ?? "").replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : NaN;
};

export function buildPinSearchParams(ui: FilterState): PinSearchParams {
  const params: PinSearchParams = {};

  // 1) 방 개수
  const rooms: number[] = (ui.rooms ?? [])
    .map((label) => {
      const m = label.match(/\d+/);
      return m ? Number(m[0]) : NaN;
    })
    .filter((n, idx, arr) => !Number.isNaN(n) && arr.indexOf(n) === idx);

  if (rooms.length) {
    params.rooms = rooms;
  }

  // 2) 복층 / 테라스 / 타운하우스
  if (ui.rooms?.includes("복층")) {
    params.hasLoft = true;
  }
  if (ui.rooms?.includes("테라스")) {
    params.hasTerrace = true;
  }
  if (ui.rooms?.includes("타운하우스")) {
    params.hasTownhouse = true;
  }

  // 3) 실입주금 (사용자 입력값을 단위 변환 없이 그대로 전달 — DB와 동일 단위)
  const depositAmount = toInt(ui.deposit);
  if (Number.isFinite(depositAmount) && depositAmount > 0) {
    params.minRealMoveInCostMax = depositAmount;
  }

  // 4) 매매가 (사용자 입력: 백만원 단위 → DB도 백만원 단위이므로 그대로 전달)
  const priceMin = toInt(ui.priceMin);
  const priceMax = toInt(ui.priceMax);
  if (!Number.isNaN(priceMin) && priceMin > 0) {
    params.salePriceMin = priceMin;
  }
  if (!Number.isNaN(priceMax) && priceMax > 0) {
    params.salePriceMax = priceMax;
  }

  // 5) 면적 (평 → ㎡)
  const areaMin = toInt(ui.areaMin);
  const areaMax = toInt(ui.areaMax);
  if (!Number.isNaN(areaMin) && areaMin > 0) {
    params.areaMinM2 = Math.round(areaMin * PYEONG_TO_M2);
  }
  if (!Number.isNaN(areaMax) && areaMax > 0) {
    params.areaMaxM2 = Math.round(areaMax * PYEONG_TO_M2);
  }

  // 6) 엘리베이터
  const elev =
    ui.elevator === "있음" ? true : ui.elevator === "없음" ? false : undefined;
  if (elev !== undefined) {
    params.hasElevator = elev;
  }

  // 7) 건물유형
  if (ui.buildingTypes && ui.buildingTypes.length > 0) {
    const map: Record<string, BuildingType> = {
      주택: "주택",
      APT: "APT",
      OP: "OP",
      "도/생": "도생",
      "근/생": "근생",
    };

    const mapped = ui.buildingTypes
      .map((label) => map[label])
      .filter((v): v is BuildingType => !!v);

    if (mapped.length) {
      params.buildingTypes = Array.from(new Set(mapped));
    }
  }

  return params;
}
