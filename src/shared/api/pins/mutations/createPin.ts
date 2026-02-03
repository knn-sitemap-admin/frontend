import { api } from "../../api";
import type { PinKind } from "@/features/pins/types";
import { mapPinKindToBadge } from "@/features/properties/lib/badge";
import {
  DEV,
  round6,
  normalizeParkingGradeStr,
  toServerBuildingType,
  sanitizeOptions,
  sanitizeDirections,
  sanitizeAreaGroups,
  sanitizeUnits,
  coercePinDraftId,
} from "../utils";
import type { CreatePinDto } from "../types";

/* createPin 응답 타입 */
type CreatePinResponse = {
  success: boolean;
  path: string;
  message?: string;
  data: {
    id: string | number;
    matchedDraftId: number | null;
    lat?: number;
    lng?: number;
  } | null;
  statusCode?: number;
  messages?: string[];
};

/* ───────────── 전역(singleton) 단일비행 가드 ───────────── */
const G = (typeof window !== "undefined" ? window : globalThis) as any;
const KEY_PROMISE = "__PIN_CREATE_INFLIGHT_PROMISE__";
const KEY_HASH = "__PIN_CREATE_LAST_HASH__";

const hashPayload = (p: unknown) => {
  try {
    return JSON.stringify(p);
  } catch {
    return String(p);
  }
};

/* ───────────── 핀 생성 (/pins) ───────────── */
export async function createPin(
  dto: CreatePinDto,
  signal?: AbortSignal
): Promise<{ id: string; matchedDraftId: number | null }> {
  // 항상 출력 (저장 시 parkingTypes/buildingTypes 확인용)
  console.log("[createPin] parkingTypes:", (dto as any).parkingTypes, "buildingTypes:", (dto as any).buildingTypes);
  if (DEV) {
    console.groupCollapsed("[createPin] start dto");
    console.log(dto);
    console.log("→ isNew/isOld:", dto.isNew, dto.isOld);
    console.groupEnd();
  }

  // directions sanitize
  const dirs = sanitizeDirections(dto.directions);
  if (DEV) {
    console.groupCollapsed("[createPin] directions sanitize");
    console.log("raw =", dto.directions);
    console.log("sanitized =", dirs);
    console.groupEnd();
  }

  // areaGroups sanitize
  const groups = sanitizeAreaGroups(dto.areaGroups);
  if (DEV) {
    console.groupCollapsed("[createPin] areaGroups sanitize");
    console.log("raw =", dto.areaGroups);
    console.log("sanitized =", groups);
    console.groupEnd();
  }

  // units sanitize
  const units = sanitizeUnits(dto.units);
  if (DEV) {
    console.groupCollapsed("[createPin] units sanitize");
    console.log("raw =", dto.units);
    console.log("sanitized =", units);
    console.groupEnd();
  }

  // parkingGrade 정규화
  const pg = normalizeParkingGradeStr(
    (dto as any)?.parkingGrade,
    (dto as any)?.propertyGrade
  );
  if (DEV) {
    console.log("[createPin] parkingGrade normalized:", pg);
  }

  // badge 해석
  const pinKind: PinKind | undefined =
    (dto as any)?.pinKind != null
      ? ((dto as any).pinKind as PinKind)
      : undefined;
  const resolvedBadge =
    (dto.badge ?? null) ||
    (pinKind ? mapPinKindToBadge(pinKind) ?? null : null);

  // 동일 입력 단일비행 해시 (parkingTypes, buildingTypes 포함해야 캐시로 다른 선택이 덮어쓰이지 않음)
  const preview = {
    lat: round6(dto.lat),
    lng: round6(dto.lng),
    addressLine: String(dto.addressLine ?? ""),
    name: (dto.name ?? "").trim() || "임시 매물",
    pinDraftId: coercePinDraftId(dto.pinDraftId),
    totalParkingSlots:
      dto.totalParkingSlots === 0 || dto.totalParkingSlots
        ? Number(dto.totalParkingSlots)
        : undefined,
    registrationTypeId:
      dto.registrationTypeId == null
        ? undefined
        : Number(dto.registrationTypeId),
    buildingType: dto.buildingType ?? undefined,
    buildingTypes: JSON.stringify((dto as any).buildingTypes ?? []),
    parkingTypes: JSON.stringify((dto as any).parkingTypes ?? []),
    options: dto.options
      ? {
          a: !!dto.options.hasAircon,
          f: !!dto.options.hasFridge,
          w: !!dto.options.hasWasher,
          d: !!dto.options.hasDryer,
          b: !!dto.options.hasBidet,
          p: !!dto.options.hasAirPurifier,
          x: (dto.options.extraOptionsText ?? "").trim().slice(0, 32),
        }
      : undefined,
    directionsLen: Array.isArray(dirs) ? dirs.length : 0,
    areaGroupsLen: Array.isArray(groups) ? groups.length : 0,
    badge: resolvedBadge ?? undefined,
    unitsLen: Array.isArray(units) ? units.length : 0,
  };
  const h = hashPayload(preview);
  if (G[KEY_HASH] === h && G[KEY_PROMISE]) return G[KEY_PROMISE];

  // 좌표 유효성
  const latNum = Number(dto.lat);
  const lngNum = Number(dto.lng);
  if (!Number.isFinite(latNum))
    throw new Error("lat이 유효한 숫자가 아닙니다.");
  if (!Number.isFinite(lngNum))
    throw new Error("lng가 유효한 숫자가 아닙니다.");

  // buildingTypes 배열 우선, buildingType 단일 폴백
  let buildingTypesPayload: { buildingTypes?: string[] } = {};
  if (
    Array.isArray((dto as any).buildingTypes) &&
    (dto as any).buildingTypes.length > 0
  ) {
    buildingTypesPayload = {
      buildingTypes: (dto as any).buildingTypes
        .map((x: string) => String(x ?? "").trim())
        .filter(Boolean),
    };
  } else if (dto.buildingType !== undefined && dto.buildingType !== null) {
    const mapped = toServerBuildingType(dto.buildingType);
    if (mapped) buildingTypesPayload = { buildingTypes: [mapped] };
  }

  const payload = {
    lat: latNum,
    lng: lngNum,
    addressLine: String(dto.addressLine ?? ""),
    name: (dto.name ?? "").trim() || "임시 매물",

    contactMainLabel: (dto.contactMainLabel ?? "").toString().trim() || "대표",
    contactMainPhone:
      (dto.contactMainPhone ?? "").toString().trim() || "010-0000-0000",

    ...(dto.contactSubLabel != null && String(dto.contactSubLabel).trim() !== ""
      ? { contactSubLabel: String(dto.contactSubLabel).trim() }
      : {}),
    ...(dto.contactSubPhone != null && String(dto.contactSubPhone).trim() !== ""
      ? { contactSubPhone: String(dto.contactSubPhone).trim() }
      : {}),

    ...(coercePinDraftId(dto.pinDraftId) !== undefined
      ? { pinDraftId: coercePinDraftId(dto.pinDraftId)! }
      : {}),

    ...(typeof dto.completionDate === "string" &&
    dto.completionDate.trim() !== ""
      ? { completionDate: dto.completionDate }
      : {}),

    ...buildingTypesPayload,

    ...(dto.totalHouseholds != null
      ? { totalHouseholds: Number(dto.totalHouseholds) }
      : {}),

    ...(dto.totalBuildings != null
      ? { totalBuildings: Number(dto.totalBuildings) }
      : {}),
    ...(dto.totalFloors != null
      ? { totalFloors: Number(dto.totalFloors) }
      : {}),
    ...(dto.remainingHouseholds != null
      ? { remainingHouseholds: Number(dto.remainingHouseholds) }
      : {}),

    ...(dto.totalParkingSlots !== null && dto.totalParkingSlots !== undefined
      ? { totalParkingSlots: Number(dto.totalParkingSlots) }
      : {}),

    ...(dto.registrationTypeId != null
      ? { registrationTypeId: Number(dto.registrationTypeId) }
      : {}),

    ...(Array.isArray((dto as any).parkingTypes) &&
    (dto as any).parkingTypes.length > 0
      ? {
          parkingTypes: (dto as any).parkingTypes
            .map((x: string) => String(x ?? "").trim())
            .filter(Boolean),
        }
      : (dto as any).parkingType != null &&
        String((dto as any).parkingType).trim() !== ""
      ? { parkingTypes: [String((dto as any).parkingType).trim()] }
      : {}),

    ...(pg === null
      ? { parkingGrade: null }
      : pg !== undefined
      ? { parkingGrade: pg }
      : {}),

    ...(dto.slopeGrade ? { slopeGrade: dto.slopeGrade } : {}),
    ...(dto.structureGrade ? { structureGrade: dto.structureGrade } : {}),

    ...(resolvedBadge ? { badge: resolvedBadge } : {}),

    ...(dto.publicMemo ? { publicMemo: dto.publicMemo } : {}),
    ...(dto.privateMemo ? { privateMemo: dto.privateMemo } : {}),

    ...(typeof dto.isOld === "boolean" ? { isOld: dto.isOld } : {}),
    ...(typeof dto.isNew === "boolean" ? { isNew: dto.isNew } : {}),

    ...(typeof dto.hasElevator === "boolean"
      ? { hasElevator: dto.hasElevator }
      : {}),

    ...(dto.options ? { options: sanitizeOptions(dto.options) } : {}),

    ...(dirs ? { directions: dirs } : {}),
    ...(groups ? { areaGroups: groups } : {}),

    ...(Array.isArray(units) ? { units } : {}),

    ...(Object.prototype.hasOwnProperty.call(dto, "minRealMoveInCost")
      ? {
          minRealMoveInCost:
            dto.minRealMoveInCost === null
              ? null
              : Number(dto.minRealMoveInCost),
        }
      : {}),

    ...(Object.prototype.hasOwnProperty.call(dto, "rebateText")
      ? {
          rebateText:
            dto.rebateText == null
              ? null
              : String(dto.rebateText).trim().slice(0, 50),
        }
      : {}),
  } as const;

  if (DEV) {
    console.groupCollapsed("[createPin] final payload");
    console.log(payload);
    console.log(
      "→ payload.parkingTypes:",
      (payload as any).parkingTypes,
      "payload.buildingTypes:",
      (payload as any).buildingTypes
    );
    console.groupEnd();
  }

  const request = api.post<CreatePinResponse>("/pins", payload, {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      // "Idempotency-Key": makeIdempotencyKey(),
    },
    maxRedirects: 0,
    signal,
    validateStatus: () => true,
  });
  G[KEY_HASH] = h;
  G[KEY_PROMISE] = request;

  try {
    const { data, status } = await request;

    if (DEV) {
      console.groupCollapsed("[createPin] response");
      console.log("status:", status);
      console.log("data:", data);
      console.groupEnd();
    }

    if (status === 409) {
      throw new Error("중복 요청이 감지되었습니다. 잠시 후 다시 시도해주세요.");
    }

    if (!data?.success || !data?.data?.id) {
      const msg = data?.messages?.join("\n") || data?.message || "핀 생성 실패";
      const e = new Error(msg) as any;
      e.responseData = data;
      throw e;
    }

    const savedLat = (data as any)?.data?.lat;
    const savedLng = (data as any)?.data?.lng;
    if (
      typeof savedLat === "number" &&
      typeof savedLng === "number" &&
      (Math.abs(savedLat - payload.lat) > 1e-8 ||
        Math.abs(savedLng - payload.lng) > 1e-8)
    ) {
      console.warn("[coords-mismatch:createPin] server-truncated?", {
        sent: { lat: payload.lat, lng: payload.lng },
        saved: { lat: savedLat, lng: savedLng },
      });
    }

    return {
      id: String(data.data.id),
      matchedDraftId: data.data.matchedDraftId,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    const msg =
      resp?.messages?.join("\n") ||
      resp?.message ||
      err?.message ||
      "요청 실패";
    const e = new Error(msg) as any;
    e.responseData = resp ?? err?.response;
    throw e;
  } finally {
    G[KEY_PROMISE] = null;
  }
}
