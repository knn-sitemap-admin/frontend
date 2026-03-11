"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripNoopNulls = void 0;
exports.deepPrune = deepPrune;
exports.hasMeaningfulPatch = hasMeaningfulPatch;
exports.toPinPatch = toPinPatch;
exports.deriveInitialBuildingGradeFrom = deriveInitialBuildingGradeFrom;
const badge_1 = require("@/features/properties/lib/badge");
const area_1 = require("@/features/properties/lib/area");
const buildingType_1 = require("./buildingType");
/* ───────── 기본 유틸 ───────── */
const N = (v) => {
    if (v === "" || v === null || v === undefined)
        return undefined;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
};
const S = (v) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t ? t : undefined;
};
const toBool = (v) => {
    if (v === undefined || v === null || v === "")
        return undefined;
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return v === 1 ? true : v === 0 ? false : undefined;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "y", "yes", "o"].includes(s))
        return true;
    if (["0", "false", "n", "no", "x"].includes(s))
        return false;
    return undefined;
};
/* AreaSet 정규화 */
const toStrictAreaSet = (s) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return ({
        title: String((_a = s === null || s === void 0 ? void 0 : s.title) !== null && _a !== void 0 ? _a : ""),
        exMinM2: String((_b = s === null || s === void 0 ? void 0 : s.exMinM2) !== null && _b !== void 0 ? _b : ""),
        exMaxM2: String((_c = s === null || s === void 0 ? void 0 : s.exMaxM2) !== null && _c !== void 0 ? _c : ""),
        exMinPy: String((_d = s === null || s === void 0 ? void 0 : s.exMinPy) !== null && _d !== void 0 ? _d : ""),
        exMaxPy: String((_e = s === null || s === void 0 ? void 0 : s.exMaxPy) !== null && _e !== void 0 ? _e : ""),
        realMinM2: String((_f = s === null || s === void 0 ? void 0 : s.realMinM2) !== null && _f !== void 0 ? _f : ""),
        realMaxM2: String((_g = s === null || s === void 0 ? void 0 : s.realMaxM2) !== null && _g !== void 0 ? _g : ""),
        realMinPy: String((_h = s === null || s === void 0 ? void 0 : s.realMinPy) !== null && _h !== void 0 ? _h : ""),
        realMaxPy: String((_j = s === null || s === void 0 ? void 0 : s.realMaxPy) !== null && _j !== void 0 ? _j : ""),
        units: Array.isArray(s === null || s === void 0 ? void 0 : s.units) ? s.units : undefined,
    });
};
/* ✅ 옵션 빌드/정규화 (핀 PATCH용) */
const buildOptionsFromForm = (f) => {
    var _a, _b, _c, _d, _e;
    const selected = Array.isArray(f.options) ? f.options : [];
    const has = (label) => selected.includes(label);
    const extraRaw = String((_a = f.optionEtc) !== null && _a !== void 0 ? _a : "").trim();
    const hasExplicitEtcFlag = typeof f.etcChecked === "boolean";
    let extraOptionsText;
    if (hasExplicitEtcFlag) {
        // ✳️ 실제 폼에서 사용하는 케이스 (OptionsSection 의 etcChecked 사용)
        if (f.etcChecked) {
            // 직접입력 ON → 글자가 있으면 그 값, 없으면 null 로 보내서 기존값 삭제
            extraOptionsText = extraRaw ? extraRaw.slice(0, 255) : null;
        }
        else {
            // 직접입력 OFF → 항상 null 보내서 DB 값 지우기
            extraOptionsText = null;
        }
    }
    else {
        // ✳️ 옛날/호환용: etcChecked 없는 폼
        // 글자가 있으면 그 값, 없으면 null
        extraOptionsText = extraRaw ? extraRaw.slice(0, 255) : null;
    }
    const out = {
        hasAircon: has("에어컨"),
        hasFridge: has("냉장고"),
        hasWasher: has("세탁기"),
        hasDryer: has("건조기"),
        hasBidet: has("비데"),
        hasAirPurifier: has("공기순환기"),
        hasIslandTable: has("아일랜드 식탁"),
        hasKitchenWindow: has("주방창"),
        hasCityGas: has("도시가스"),
        hasInduction: has("인덕션"),
        // ✅ 항상 키 생성 (문자열이든 null 이든)
        extraOptionsText: extraOptionsText !== null && extraOptionsText !== void 0 ? extraOptionsText : null,
        // ✅ Nullable Enum 4개 (null 허용)
        kitchenLayout: (_b = f.kitchenLayout) !== null && _b !== void 0 ? _b : null,
        fridgeSlot: (_c = f.fridgeSlot) !== null && _c !== void 0 ? _c : null,
        sofaSize: (_d = f.sofaSize) !== null && _d !== void 0 ? _d : null,
        livingRoomView: (_e = f.livingRoomView) !== null && _e !== void 0 ? _e : null,
    };
    // 🔥 항상 객체를 리턴해서 options 패치가 가능하게
    return out;
};
/* ⚠️ 비교용 옵션 정규화(빈 값 제거) */
const normalizeOptionsForCompare = (o) => {
    var _a, _b, _c, _d;
    if (!o)
        return null;
    const t = (s) => {
        const v = String(s !== null && s !== void 0 ? s : "").trim();
        return v ? v.slice(0, 255) : undefined;
    };
    const x = {
        hasAircon: !!o.hasAircon || undefined,
        hasFridge: !!o.hasFridge || undefined,
        hasWasher: !!o.hasWasher || undefined,
        hasDryer: !!o.hasDryer || undefined,
        hasBidet: !!o.hasBidet || undefined,
        hasAirPurifier: !!o.hasAirPurifier || undefined,
        hasIslandTable: !!o.hasIslandTable || undefined,
        hasKitchenWindow: !!o.hasKitchenWindow || undefined,
        hasCityGas: !!o.hasCityGas || undefined,
        hasInduction: !!o.hasInduction || undefined,
        extraOptionsText: t(o.extraOptionsText),
        // ✅ Nullable Enum 4개
        kitchenLayout: (_a = o.kitchenLayout) !== null && _a !== void 0 ? _a : undefined,
        fridgeSlot: (_b = o.fridgeSlot) !== null && _b !== void 0 ? _b : undefined,
        sofaSize: (_c = o.sofaSize) !== null && _c !== void 0 ? _c : undefined,
        livingRoomView: (_d = o.livingRoomView) !== null && _d !== void 0 ? _d : undefined,
    };
    const y = {};
    for (const [k, v] of Object.entries(x))
        if (v !== undefined)
            y[k] = v;
    return Object.keys(y).length ? y : null;
};
function deepPrune(obj) {
    const prune = (v) => {
        if (v === undefined)
            return undefined;
        if (Array.isArray(v)) {
            const arr = v.map(prune).filter((x) => x !== undefined);
            return arr.length ? arr : undefined;
        }
        if (v && typeof v === "object") {
            const out = {};
            for (const [k, vv] of Object.entries(v)) {
                const pv = prune(vv);
                if (pv !== undefined)
                    out[k] = pv;
            }
            return Object.keys(out).length ? out : undefined;
        }
        return v;
    };
    const pruned = prune(obj);
    return (pruned !== null && pruned !== void 0 ? pruned : {});
}
function hasMeaningfulPatch(obj) {
    if (!obj)
        return false;
    const keys = Object.keys(obj);
    if (keys.length === 0)
        return false;
    for (const k of keys) {
        const v = obj[k];
        if (v !== undefined)
            return true;
    }
    return false;
}
/* ───────── 향/방향 & 유닛 비교 유틸 ───────── */
const normStrU = (v) => {
    if (v == null)
        return undefined;
    const s = String(v).trim();
    return s === "" || s === "-" || s === "—" ? undefined : s;
};
const bPick = (u, ...keys) => {
    for (const k of keys) {
        const v = u === null || u === void 0 ? void 0 : u[k];
        if (typeof v === "boolean")
            return v;
        if (v === 1 || v === "1")
            return true;
        if (v === 0 || v === "0")
            return false;
    }
    return false;
};
const nPick = (u, ...keys) => {
    for (const k of keys)
        if ((u === null || u === void 0 ? void 0 : u[k]) !== undefined)
            return u[k];
    return undefined;
};
const toNumOrNull = (v) => {
    const n = N(v);
    return n === undefined ? null : n;
};
const normUnit = (u) => {
    var _a;
    const x = u !== null && u !== void 0 ? u : {};
    let minPrice = toNumOrNull(nPick(x, "minPrice", "primary"));
    let maxPrice = toNumOrNull(nPick(x, "maxPrice", "secondary"));
    if (minPrice !== null && maxPrice === null)
        maxPrice = minPrice;
    if (maxPrice !== null && minPrice === null)
        minPrice = maxPrice;
    return {
        rooms: toNumOrNull(nPick(x, "rooms")),
        baths: toNumOrNull(nPick(x, "baths")),
        hasLoft: bPick(x, "hasLoft", "duplex"),
        hasTerrace: bPick(x, "hasTerrace", "terrace"),
        minPrice,
        maxPrice,
        note: (_a = nPick(x, "note")) !== null && _a !== void 0 ? _a : null,
    };
};
const sameUnit2 = (a, b) => {
    const A = normUnit(a);
    const B = normUnit(b);
    return (A.rooms === B.rooms &&
        A.baths === B.baths &&
        A.hasLoft === B.hasLoft &&
        A.hasTerrace === B.hasTerrace &&
        A.minPrice === B.minPrice &&
        A.maxPrice === B.maxPrice &&
        A.note === B.note);
};
const unitsChanged = (prev, curr) => {
    const P = Array.isArray(prev) ? prev : undefined;
    const C = Array.isArray(curr) ? curr : undefined;
    if (!P && !C)
        return false;
    if (!P || !C)
        return true;
    if (P.length !== C.length)
        return true;
    for (let i = 0; i < P.length; i++)
        if (!sameUnit2(P[i], C[i]))
            return true;
    return false;
};
/* ───────── 폼 → 서버 최소 PATCH ───────── */
function toPinPatch(f, initial) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47;
    const patch = {};
    const S2 = (v) => {
        const t = typeof v === "string" ? v.trim() : "";
        return t ? t : undefined;
    };
    const N2 = (v) => {
        if (v === "" || v === null || v === undefined)
            return undefined;
        const n = Number(String(v).replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : undefined;
    };
    const jsonEq2Local = (a, b) => {
        const norm = (x) => x === "" || x === null || x === undefined ? undefined : x;
        try {
            return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
        }
        catch (_a) {
            return false;
        }
    };
    // name
    const initName = (_b = (_a = initial === null || initial === void 0 ? void 0 : initial.name) !== null && _a !== void 0 ? _a : initial === null || initial === void 0 ? void 0 : initial.title) !== null && _b !== void 0 ? _b : "";
    const nowName = S2(f.title);
    if (nowName !== undefined && !jsonEq2Local(initName, nowName))
        patch.name = nowName;
    // 연락처
    const initMainLabel = (_d = (_c = initial === null || initial === void 0 ? void 0 : initial.contactMainLabel) !== null && _c !== void 0 ? _c : initial === null || initial === void 0 ? void 0 : initial.officeName) !== null && _d !== void 0 ? _d : "";
    const initMainPhone = (_f = (_e = initial === null || initial === void 0 ? void 0 : initial.contactMainPhone) !== null && _e !== void 0 ? _e : initial === null || initial === void 0 ? void 0 : initial.officePhone) !== null && _f !== void 0 ? _f : "";
    const initSubPhone = (_h = (_g = initial === null || initial === void 0 ? void 0 : initial.contactSubPhone) !== null && _g !== void 0 ? _g : initial === null || initial === void 0 ? void 0 : initial.officePhone2) !== null && _h !== void 0 ? _h : "";
    const nowMainLabel = S2(f.officeName);
    const nowMainPhone = S2(f.officePhone);
    const nowSubPhone = S2(f.officePhone2);
    if (nowMainLabel !== undefined && !jsonEq2Local(initMainLabel, nowMainLabel))
        patch.contactMainLabel = nowMainLabel;
    if (nowMainPhone !== undefined && !jsonEq2Local(initMainPhone, nowMainPhone))
        patch.contactMainPhone = nowMainPhone;
    if (nowSubPhone !== undefined && !jsonEq2Local(initSubPhone, nowSubPhone))
        patch.contactSubPhone = nowSubPhone;
    // 완공일
    if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.completionDate, f.completionDate)) {
        patch.completionDate = (_j = S2(f.completionDate)) !== null && _j !== void 0 ? _j : null;
    }
    // 엘리베이터 (초기 스냅샷 + 서버값 모두 고려)
    const initElev = toBool((_l = (_k = initial === null || initial === void 0 ? void 0 : initial.initialHasElevator) !== null && _k !== void 0 ? _k : initial === null || initial === void 0 ? void 0 : initial.hasElevator) !== null && _l !== void 0 ? _l : initial === null || initial === void 0 ? void 0 : initial.elevator);
    const nowElev = toBool(f === null || f === void 0 ? void 0 : f.elevator);
    if (nowElev !== undefined && nowElev !== initElev)
        patch.hasElevator = nowElev;
    // 메모
    if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.publicMemo, f.publicMemo))
        patch.publicMemo = (_m = f.publicMemo) !== null && _m !== void 0 ? _m : null;
    const initPrivate = (_o = initial === null || initial === void 0 ? void 0 : initial.privateMemo) !== null && _o !== void 0 ? _o : initial === null || initial === void 0 ? void 0 : initial.secretMemo;
    if (!jsonEq2Local(initPrivate, f.secretMemo))
        patch.privateMemo = (_p = f.secretMemo) !== null && _p !== void 0 ? _p : null;
    /* ✅ 옵션 diff */
    {
        const nowOpts = buildOptionsFromForm(f);
        // 초기 상태를 "슬라이스 + 옵션텍스트" 기준으로 재구성
        const initFromSlices = buildOptionsFromForm({
            options: (_u = (_t = (_s = (_q = initial === null || initial === void 0 ? void 0 : initial.options) !== null && _q !== void 0 ? _q : (_r = initial === null || initial === void 0 ? void 0 : initial.options) === null || _r === void 0 ? void 0 : _r.options) !== null && _s !== void 0 ? _s : initial === null || initial === void 0 ? void 0 : initial.optionsLabels) !== null && _t !== void 0 ? _t : initial === null || initial === void 0 ? void 0 : initial.optionList) !== null && _u !== void 0 ? _u : [],
            optionEtc: (_w = (_v = initial === null || initial === void 0 ? void 0 : initial.optionEtc) !== null && _v !== void 0 ? _v : initial === null || initial === void 0 ? void 0 : initial.extraOptionsText) !== null && _w !== void 0 ? _w : "",
            etcChecked: true,
        });
        const sameBySlices = JSON.stringify(normalizeOptionsForCompare(initFromSlices)) ===
            JSON.stringify(normalizeOptionsForCompare(nowOpts));
        // 🔥 슬라이스 기준으로라도 달라졌으면 무조건 options 패치
        if (!sameBySlices) {
            patch.options = nowOpts; // 객체(upsert) – extraOptionsText 포함
        }
    }
    // 최저 실입
    const initMinCost = (_x = initial === null || initial === void 0 ? void 0 : initial.minRealMoveInCost) !== null && _x !== void 0 ? _x : (Number.isFinite(Number(initial === null || initial === void 0 ? void 0 : initial.salePrice))
        ? Number(initial === null || initial === void 0 ? void 0 : initial.salePrice)
        : undefined);
    const nowMinCostNum = N2(f.salePrice);
    if (!jsonEq2Local(initMinCost, nowMinCostNum))
        patch.minRealMoveInCost = nowMinCostNum !== null && nowMinCostNum !== void 0 ? nowMinCostNum : null;
    // ⭐ 리베이트 텍스트 diff
    {
        const initRebateRaw = (_0 = (_z = (_y = initial === null || initial === void 0 ? void 0 : initial.rebateText) !== null && _y !== void 0 ? _y : initial === null || initial === void 0 ? void 0 : initial.rebate) !== null && _z !== void 0 ? _z : initial === null || initial === void 0 ? void 0 : initial.rebateMemo) !== null && _0 !== void 0 ? _0 : "";
        const nowRebateRaw = (_2 = (_1 = f === null || f === void 0 ? void 0 : f.rebateText) !== null && _1 !== void 0 ? _1 : f === null || f === void 0 ? void 0 : f.rebateRaw) !== null && _2 !== void 0 ? _2 : "";
        const prev = initRebateRaw == null ? "" : String(initRebateRaw).trim();
        const next = nowRebateRaw == null ? "" : String(nowRebateRaw).trim();
        if (prev !== next) {
            patch.rebateText = next;
        }
    }
    // --- 건물유형: buildingTypes 배열 우선, buildingType 단일 폴백 ---
    {
        const btArrNow = f === null || f === void 0 ? void 0 : f.buildingTypes;
        const btArrInit = (_3 = initial === null || initial === void 0 ? void 0 : initial.buildingTypes) !== null && _3 !== void 0 ? _3 : [];
        if (Array.isArray(btArrNow)) {
            const arrNorm = btArrNow
                .map((x) => String(x !== null && x !== void 0 ? x : "").trim())
                .filter(Boolean);
            const initNorm = (Array.isArray(btArrInit) ? btArrInit : [])
                .map((x) => String(x !== null && x !== void 0 ? x : "").trim())
                .filter(Boolean);
            if (!jsonEq2Local(arrNorm, initNorm)) {
                patch.buildingTypes = arrNorm;
            }
        }
        else {
            const btNowUI = (_4 = f === null || f === void 0 ? void 0 : f.buildingType) !== null && _4 !== void 0 ? _4 : null;
            const btNow = (0, buildingType_1.normalizeBuildingType)(btNowUI);
            const btInit = (0, buildingType_1.normalizeBuildingType)((_5 = initial === null || initial === void 0 ? void 0 : initial.buildingType) !== null && _5 !== void 0 ? _5 : initial === null || initial === void 0 ? void 0 : initial.initialBuildingType);
            if (btNow !== undefined && !jsonEq2Local(btInit, btNow)) {
                patch.buildingTypes = btNow ? [btNow] : [];
            }
        }
    }
    // ── 핀종류(pinKind) 변경 감지 ──
    {
        const initPinKind = (_6 = initial === null || initial === void 0 ? void 0 : initial.pinKind) !== null && _6 !== void 0 ? _6 : ((initial === null || initial === void 0 ? void 0 : initial.badge)
            ? (0, badge_1.mapBadgeToPinKind)(initial.badge, initial.isCompleted)
            : undefined);
        const nowPinKind = f === null || f === void 0 ? void 0 : f.pinKind;
        if (nowPinKind !== undefined && nowPinKind !== initPinKind) {
            patch.pinKind = nowPinKind;
            if (nowPinKind === "completed") {
                patch.isCompleted = true;
            }
            else {
                patch.isCompleted = false;
                try {
                    const badge = badge_1.mapPinKindToBadge === null || badge_1.mapPinKindToBadge === void 0 ? void 0 : (0, badge_1.mapPinKindToBadge)(nowPinKind);
                    if (badge)
                        patch.badge = badge;
                }
                catch (_48) { }
            }
        }
    }
    // 경사/구조 grade
    if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.slopeGrade, f.slopeGrade))
        patch.slopeGrade = (_7 = f.slopeGrade) !== null && _7 !== void 0 ? _7 : null;
    if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.structureGrade, f.structureGrade))
        patch.structureGrade = (_8 = f.structureGrade) !== null && _8 !== void 0 ? _8 : null;
    /* ── 주차 관련 필드 ── */
    // 1) 주차 별점
    const pgInitRaw = initial === null || initial === void 0 ? void 0 : initial.parkingGrade;
    const pgInitNorm = pgInitRaw == null || String(pgInitRaw).trim() === ""
        ? null
        : String(pgInitRaw).trim();
    const pgNowRaw = f.parkingGrade;
    const pgNowNorm = pgNowRaw == null || String(pgNowRaw).trim() === ""
        ? null
        : String(pgNowRaw).trim();
    if (!jsonEq2Local(pgInitNorm, pgNowNorm)) {
        patch.parkingGrade = pgNowNorm;
    }
    // 2) parkingTypes 배열 우선, parkingType 단일 폴백
    {
        const ptArrNow = f === null || f === void 0 ? void 0 : f.parkingTypes;
        const ptArrInit = (_9 = initial === null || initial === void 0 ? void 0 : initial.parkingTypes) !== null && _9 !== void 0 ? _9 : [];
        if (Array.isArray(ptArrNow)) {
            const arrNorm = ptArrNow
                .map((x) => String(x !== null && x !== void 0 ? x : "").trim())
                .filter(Boolean)
                .map((s) => s.slice(0, 50));
            const initNorm = (Array.isArray(ptArrInit) ? ptArrInit : [])
                .map((x) => String(x !== null && x !== void 0 ? x : "").trim())
                .filter(Boolean);
            if (!jsonEq2Local(arrNorm, initNorm)) {
                patch.parkingTypes = arrNorm;
            }
        }
        else {
            const raw = f.parkingType;
            const trimmed = raw == null ? "" : String(raw).trim();
            const value = trimmed === "" || trimmed === "custom" ? null : trimmed.slice(0, 50);
            const initParkingType = (_10 = initial === null || initial === void 0 ? void 0 : initial.parkingType) !== null && _10 !== void 0 ? _10 : null;
            if (value !== initParkingType) {
                patch.parkingTypes = value ? [value] : [];
            }
        }
    }
    // 3) totalParkingSlots
    const slotsInitRaw = initial === null || initial === void 0 ? void 0 : initial.totalParkingSlots;
    const slotsInit = slotsInitRaw == null || String(slotsInitRaw).trim() === ""
        ? null
        : Number(String(slotsInitRaw).replace(/[^\d]/g, ""));
    const slotsNowRaw = f.totalParkingSlots;
    const slotsNow = slotsNowRaw == null || String(slotsNowRaw).trim() === ""
        ? null
        : Number(String(slotsNowRaw).replace(/[^\d]/g, ""));
    if (!jsonEq2Local(slotsInit, slotsNow)) {
        patch.totalParkingSlots = slotsNow;
    }
    // 숫자들
    const initTotalBuildings = N2(initial === null || initial === void 0 ? void 0 : initial.totalBuildings);
    const initTotalFloors = N2(initial === null || initial === void 0 ? void 0 : initial.totalFloors);
    const initTotalHouseholds = N2(initial === null || initial === void 0 ? void 0 : initial.totalHouseholds);
    const initRemainingHouseholds = N2(initial === null || initial === void 0 ? void 0 : initial.remainingHouseholds);
    const nowTotalBuildings = N2(f.totalBuildings);
    const nowTotalFloors = N2(f.totalFloors);
    const nowTotalHouseholds = N2(f.totalHouseholds);
    const nowRemainingHouseholds = N2(f.remainingHouseholds);
    if (!jsonEq2Local(initTotalBuildings, nowTotalBuildings))
        patch.totalBuildings = nowTotalBuildings !== null && nowTotalBuildings !== void 0 ? nowTotalBuildings : null;
    if (!jsonEq2Local(initTotalFloors, nowTotalFloors))
        patch.totalFloors = nowTotalFloors !== null && nowTotalFloors !== void 0 ? nowTotalFloors : null;
    if (!jsonEq2Local(initTotalHouseholds, nowTotalHouseholds))
        patch.totalHouseholds = nowTotalHouseholds !== null && nowTotalHouseholds !== void 0 ? nowTotalHouseholds : null;
    if (!jsonEq2Local(initRemainingHouseholds, nowRemainingHouseholds))
        patch.remainingHouseholds = nowRemainingHouseholds !== null && nowRemainingHouseholds !== void 0 ? nowRemainingHouseholds : null;
    // === 면적: 단일값 + 범위 ===
    {
        const { exclusiveArea, realArea, extraExclusiveAreas, extraRealAreas, baseAreaTitleOut, extraAreaTitlesOut, } = (_13 = (_12 = (_11 = f).packAreas) === null || _12 === void 0 ? void 0 : _12.call(_11)) !== null && _13 !== void 0 ? _13 : {};
        const Snum = (v) => v === null || v === undefined || v === "" ? undefined : String(v).trim();
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.exclusiveArea, exclusiveArea))
            patch.exclusiveArea = (_14 = Snum(exclusiveArea)) !== null && _14 !== void 0 ? _14 : null;
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.realArea, realArea))
            patch.realArea = (_15 = Snum(realArea)) !== null && _15 !== void 0 ? _15 : null;
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.extraExclusiveAreas, extraExclusiveAreas))
            patch.extraExclusiveAreas = Array.isArray(extraExclusiveAreas)
                ? extraExclusiveAreas
                : [];
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.extraRealAreas, extraRealAreas))
            patch.extraRealAreas = Array.isArray(extraRealAreas)
                ? extraRealAreas
                : [];
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.baseAreaTitleOut, baseAreaTitleOut))
            patch.baseAreaTitleOut = (_16 = Snum(baseAreaTitleOut)) !== null && _16 !== void 0 ? _16 : null;
        if (!jsonEq2Local(initial === null || initial === void 0 ? void 0 : initial.extraAreaTitlesOut, extraAreaTitlesOut))
            patch.extraAreaTitlesOut = Array.isArray(extraAreaTitlesOut)
                ? extraAreaTitlesOut
                : [];
    }
    // 2) 범위(m²/평)
    {
        const normNum = (v) => {
            if (v === "" || v == null)
                return undefined;
            const n = Number(String(v).replace(/[^\d.-]/g, ""));
            return Number.isFinite(n) ? String(n) : undefined;
        };
        const initSnap = {
            exMin: normNum(initial === null || initial === void 0 ? void 0 : initial.exclusiveAreaMin),
            exMax: normNum(initial === null || initial === void 0 ? void 0 : initial.exclusiveAreaMax),
            exMinPy: normNum(initial === null || initial === void 0 ? void 0 : initial.exclusiveAreaMinPy),
            exMaxPy: normNum(initial === null || initial === void 0 ? void 0 : initial.exclusiveAreaMaxPy),
            realMin: normNum(initial === null || initial === void 0 ? void 0 : initial.realAreaMin),
            realMax: normNum(initial === null || initial === void 0 ? void 0 : initial.realAreaMax),
            realMinPy: normNum(initial === null || initial === void 0 ? void 0 : initial.realAreaMinPy),
            realMaxPy: normNum(initial === null || initial === void 0 ? void 0 : initial.realAreaMaxPy),
        };
        const s = (_17 = f.baseAreaSet) !== null && _17 !== void 0 ? _17 : {};
        const nowSnap = {
            exMin: normNum((_21 = (_19 = (_18 = s === null || s === void 0 ? void 0 : s.exclusiveMin) !== null && _18 !== void 0 ? _18 : s === null || s === void 0 ? void 0 : s.exMinM2) !== null && _19 !== void 0 ? _19 : (_20 = s === null || s === void 0 ? void 0 : s.exclusive) === null || _20 === void 0 ? void 0 : _20.minM2) !== null && _21 !== void 0 ? _21 : s === null || s === void 0 ? void 0 : s.m2Min),
            exMax: normNum((_25 = (_23 = (_22 = s === null || s === void 0 ? void 0 : s.exclusiveMax) !== null && _22 !== void 0 ? _22 : s === null || s === void 0 ? void 0 : s.exMaxM2) !== null && _23 !== void 0 ? _23 : (_24 = s === null || s === void 0 ? void 0 : s.exclusive) === null || _24 === void 0 ? void 0 : _24.maxM2) !== null && _25 !== void 0 ? _25 : s === null || s === void 0 ? void 0 : s.m2Max),
            exMinPy: normNum((_29 = (_27 = (_26 = s === null || s === void 0 ? void 0 : s.exclusiveMinPy) !== null && _26 !== void 0 ? _26 : s === null || s === void 0 ? void 0 : s.exMinPy) !== null && _27 !== void 0 ? _27 : (_28 = s === null || s === void 0 ? void 0 : s.exclusive) === null || _28 === void 0 ? void 0 : _28.minPy) !== null && _29 !== void 0 ? _29 : s === null || s === void 0 ? void 0 : s.pyMin),
            exMaxPy: normNum((_33 = (_31 = (_30 = s === null || s === void 0 ? void 0 : s.exclusiveMaxPy) !== null && _30 !== void 0 ? _30 : s === null || s === void 0 ? void 0 : s.exMaxPy) !== null && _31 !== void 0 ? _31 : (_32 = s === null || s === void 0 ? void 0 : s.exclusive) === null || _32 === void 0 ? void 0 : _32.maxPy) !== null && _33 !== void 0 ? _33 : s === null || s === void 0 ? void 0 : s.pyMax),
            realMin: normNum((_35 = (_34 = s === null || s === void 0 ? void 0 : s.realMin) !== null && _34 !== void 0 ? _34 : s === null || s === void 0 ? void 0 : s.realMinM2) !== null && _35 !== void 0 ? _35 : (_36 = s === null || s === void 0 ? void 0 : s.real) === null || _36 === void 0 ? void 0 : _36.minM2),
            realMax: normNum((_38 = (_37 = s === null || s === void 0 ? void 0 : s.realMax) !== null && _37 !== void 0 ? _37 : s === null || s === void 0 ? void 0 : s.realMaxM2) !== null && _38 !== void 0 ? _38 : (_39 = s === null || s === void 0 ? void 0 : s.real) === null || _39 === void 0 ? void 0 : _39.maxM2),
            realMinPy: normNum((_40 = s === null || s === void 0 ? void 0 : s.realMinPy) !== null && _40 !== void 0 ? _40 : (_41 = s === null || s === void 0 ? void 0 : s.real) === null || _41 === void 0 ? void 0 : _41.minPy),
            realMaxPy: normNum((_42 = s === null || s === void 0 ? void 0 : s.realMaxPy) !== null && _42 !== void 0 ? _42 : (_43 = s === null || s === void 0 ? void 0 : s.real) === null || _43 === void 0 ? void 0 : _43.maxPy),
        };
        // 자동 채우기
        if (nowSnap.exMin !== undefined && nowSnap.exMax === undefined)
            nowSnap.exMax = nowSnap.exMin;
        if (nowSnap.exMax !== undefined && nowSnap.exMin === undefined)
            nowSnap.exMin = nowSnap.exMax;
        if (nowSnap.exMinPy !== undefined && nowSnap.exMaxPy === undefined)
            nowSnap.exMaxPy = nowSnap.exMinPy;
        if (nowSnap.exMaxPy !== undefined && nowSnap.exMinPy === undefined)
            nowSnap.exMinPy = nowSnap.exMaxPy;
        if (nowSnap.realMin !== undefined && nowSnap.realMax === undefined)
            nowSnap.realMax = nowSnap.realMin;
        if (nowSnap.realMax !== undefined && nowSnap.realMin === undefined)
            nowSnap.realMin = nowSnap.realMax;
        if (nowSnap.realMinPy !== undefined && nowSnap.realMaxPy === undefined)
            nowSnap.realMaxPy = nowSnap.realMinPy;
        if (nowSnap.realMaxPy !== undefined && nowSnap.realMinPy === undefined)
            nowSnap.realMinPy = nowSnap.realMaxPy;
        const putIfChanged = (key, patchKey) => {
            const prev = initSnap[key];
            const curr = nowSnap[key];
            if (curr !== undefined && curr !== prev)
                patch[patchKey] = curr;
        };
        putIfChanged("exMin", "exclusiveAreaMin");
        putIfChanged("exMax", "exclusiveAreaMax");
        putIfChanged("exMinPy", "exclusiveAreaMinPy");
        putIfChanged("exMaxPy", "exclusiveAreaMaxPy");
        putIfChanged("realMin", "realAreaMin");
        putIfChanged("realMax", "realAreaMax");
        putIfChanged("realMinPy", "realAreaMinPy");
        putIfChanged("realMaxPy", "realAreaMaxPy");
    }
    /* 3) 면적 그룹 — 초기 vs 현재 그룹 ‘정규화’ 비교 */
    {
        const canonNumStr = (v) => {
            if (v === "" || v == null)
                return undefined;
            const n = Number(String(v).replace(/[^\d.-]/g, ""));
            if (!Number.isFinite(n))
                return undefined;
            const r = Math.round(n * 1000) / 1000;
            return String(+r.toFixed(3));
        };
        const normGroup = (g) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return ({
                title: String((_a = g === null || g === void 0 ? void 0 : g.title) !== null && _a !== void 0 ? _a : "").trim(),
                exclusiveMinM2: canonNumStr((_c = (_b = g === null || g === void 0 ? void 0 : g.exclusiveMinM2) !== null && _b !== void 0 ? _b : g === null || g === void 0 ? void 0 : g.exMinM2) !== null && _c !== void 0 ? _c : g === null || g === void 0 ? void 0 : g.exclusiveMin),
                exclusiveMaxM2: canonNumStr((_e = (_d = g === null || g === void 0 ? void 0 : g.exclusiveMaxM2) !== null && _d !== void 0 ? _d : g === null || g === void 0 ? void 0 : g.exMaxM2) !== null && _e !== void 0 ? _e : g === null || g === void 0 ? void 0 : g.exclusiveMax),
                realMinM2: canonNumStr((_g = (_f = g === null || g === void 0 ? void 0 : g.realMinM2) !== null && _f !== void 0 ? _f : g === null || g === void 0 ? void 0 : g.actualMinM2) !== null && _g !== void 0 ? _g : g === null || g === void 0 ? void 0 : g.realMin),
                realMaxM2: canonNumStr((_j = (_h = g === null || g === void 0 ? void 0 : g.realMaxM2) !== null && _h !== void 0 ? _h : g === null || g === void 0 ? void 0 : g.actualMaxM2) !== null && _j !== void 0 ? _j : g === null || g === void 0 ? void 0 : g.realMax),
                units: Array.isArray(g === null || g === void 0 ? void 0 : g.units) ? g.units : undefined,
            });
        };
        const pickMeaningful = (arr) => Array.isArray(arr)
            ? arr
                .map((g) => normGroup(g))
                .filter((x) => x.title ||
                x.exclusiveMinM2 ||
                x.exclusiveMaxM2 ||
                x.realMinM2 ||
                x.realMaxM2 ||
                (x.units && x.units.length > 0))
            : [];
        const keyOf = (g) => {
            var _a, _b, _c, _d;
            const unitsStr = g.units ? JSON.stringify(g.units) : "";
            return `${g.title}|${(_a = g.exclusiveMinM2) !== null && _a !== void 0 ? _a : ""}|${(_b = g.exclusiveMaxM2) !== null && _b !== void 0 ? _b : ""}|${(_c = g.realMinM2) !== null && _c !== void 0 ? _c : ""}|${(_d = g.realMaxM2) !== null && _d !== void 0 ? _d : ""}|${unitsStr}`;
        };
        const sortForCmp = (arr) => [...arr].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
        const initGroupsRaw = Array.isArray(initial === null || initial === void 0 ? void 0 : initial.areaGroups)
            ? initial.areaGroups
            : [];
        const strictBase = toStrictAreaSet((_44 = f.baseAreaSet) !== null && _44 !== void 0 ? _44 : {});
        const strictExtras = (Array.isArray(f.extraAreaSets) ? f.extraAreaSets : []).map(toStrictAreaSet);
        let nowGroupsRaw = [];
        try {
            nowGroupsRaw = (_45 = (0, area_1.buildAreaGroups)(strictBase, strictExtras)) !== null && _45 !== void 0 ? _45 : [];
        }
        catch (_49) {
            nowGroupsRaw = [];
        }
        const initNorm = sortForCmp(pickMeaningful(initGroupsRaw));
        const nowNorm = sortForCmp(pickMeaningful(nowGroupsRaw));
        const hasAreaGroupsDelta = JSON.stringify(initNorm) !== JSON.stringify(nowNorm);
        if (hasAreaGroupsDelta || f.areaSetsTouched) {
            patch.areaGroups = nowGroupsRaw.length ? nowGroupsRaw : [];
        }
    }
    // ── 향/방향: 변경시에만 directions 전송 ─────────────────────
    {
        const initialHasAnyAspect = !!normStrU(initial === null || initial === void 0 ? void 0 : initial.aspect) ||
            !!normStrU(initial === null || initial === void 0 ? void 0 : initial.aspectNo) ||
            !!normStrU(initial === null || initial === void 0 ? void 0 : initial.aspect1) ||
            !!normStrU(initial === null || initial === void 0 ? void 0 : initial.aspect2) ||
            !!normStrU(initial === null || initial === void 0 ? void 0 : initial.aspect3) ||
            (Array.isArray(initial === null || initial === void 0 ? void 0 : initial.orientations) &&
                initial.orientations.length > 0) ||
            (Array.isArray(initial === null || initial === void 0 ? void 0 : initial.directions) &&
                initial.directions.length > 0);
        const pickDirStringsFromInitial = (init) => {
            const fromArr = (Array.isArray(init === null || init === void 0 ? void 0 : init.directions) ? init.directions : [])
                .map((d) => [d === null || d === void 0 ? void 0 : d.direction, d === null || d === void 0 ? void 0 : d.dir, d === null || d === void 0 ? void 0 : d.value, d === null || d === void 0 ? void 0 : d.name, d === null || d === void 0 ? void 0 : d.code]
                .map((x) => (typeof x === "string" ? x.trim() : ""))
                .find((x) => !!x) || "")
                .filter(Boolean);
            if (fromArr.length)
                return fromArr;
            return [init === null || init === void 0 ? void 0 : init.aspect1, init === null || init === void 0 ? void 0 : init.aspect2, init === null || init === void 0 ? void 0 : init.aspect3]
                .map((v) => (typeof v === "string" ? v.trim() : ""))
                .filter(Boolean);
        };
        const hoNum = (v) => {
            const s = String(v !== null && v !== void 0 ? v : "").replace(/[^\d]/g, "");
            const n = Number(s);
            return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
        };
        const pickHoDirPairsFromForm = () => {
            var _a, _b, _c;
            const bo = (_c = (_b = (_a = f).buildOrientation) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : {};
            const oNow = Array.isArray(bo.orientations) ? bo.orientations : [];
            let pairs = oNow
                .map((o) => {
                const dir = [o === null || o === void 0 ? void 0 : o.dir, o === null || o === void 0 ? void 0 : o.value, o === null || o === void 0 ? void 0 : o.direction, o === null || o === void 0 ? void 0 : o.name, o === null || o === void 0 ? void 0 : o.code]
                    .map((x) => (typeof x === "string" ? x.trim() : ""))
                    .find((x) => !!x) || "";
                const ho = hoNum(o === null || o === void 0 ? void 0 : o.ho);
                return dir ? { ho, dir } : null;
            })
                .filter(Boolean);
            if (!pairs.length) {
                const arr = [bo.aspect1, bo.aspect2, bo.aspect3]
                    .map((v) => (typeof v === "string" ? v.trim() : ""))
                    .filter(Boolean);
                pairs = arr.map((dir, idx) => ({ ho: idx + 1, dir }));
            }
            pairs.sort((a, b) => a.ho - b.ho);
            return pairs;
        };
        const normSet = (arr) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const initDirs = normSet(pickDirStringsFromInitial(initial));
        const nowPairs = pickHoDirPairsFromForm();
        const nowDirsSet = normSet(nowPairs.map((p) => p.dir));
        if (f.aspectsTouched) {
            if (initialHasAnyAspect) {
                if (JSON.stringify(initDirs) !== JSON.stringify(nowDirsSet)) {
                    patch.directions = nowPairs.map((p) => ({
                        direction: p.dir,
                    }));
                }
            }
            else {
                patch.directions = nowPairs.map((p) => ({
                    direction: p.dir,
                }));
            }
        }
    }
    // 구조(units)
    const initialUnits = ((_46 = initial === null || initial === void 0 ? void 0 : initial.unitLines) !== null && _46 !== void 0 ? _46 : initial === null || initial === void 0 ? void 0 : initial.units);
    const currentUnits = ((_47 = f.unitLines) !== null && _47 !== void 0 ? _47 : []);
    if (unitsChanged(initialUnits, currentUnits)) {
        const units = (currentUnits !== null && currentUnits !== void 0 ? currentUnits : [])
            .map((u) => {
            var _a, _b, _c, _d, _e, _f;
            let minPrice = toNumOrNull((_a = u === null || u === void 0 ? void 0 : u.minPrice) !== null && _a !== void 0 ? _a : u === null || u === void 0 ? void 0 : u.primary);
            let maxPrice = toNumOrNull((_b = u === null || u === void 0 ? void 0 : u.maxPrice) !== null && _b !== void 0 ? _b : u === null || u === void 0 ? void 0 : u.secondary);
            if (minPrice !== null && maxPrice === null)
                maxPrice = minPrice;
            if (maxPrice !== null && minPrice === null)
                minPrice = maxPrice;
            const n = {
                rooms: toNumOrNull(u === null || u === void 0 ? void 0 : u.rooms),
                baths: toNumOrNull(u === null || u === void 0 ? void 0 : u.baths),
                hasLoft: !!((_c = u === null || u === void 0 ? void 0 : u.hasLoft) !== null && _c !== void 0 ? _c : u === null || u === void 0 ? void 0 : u.duplex),
                hasTerrace: !!((_d = u === null || u === void 0 ? void 0 : u.hasTerrace) !== null && _d !== void 0 ? _d : u === null || u === void 0 ? void 0 : u.terrace),
                minPrice,
                maxPrice,
                note: typeof (u === null || u === void 0 ? void 0 : u.note) === "string" && u.note.trim() !== ""
                    ? u.note.trim()
                    : null,
            };
            let hasAny = n.rooms != null ||
                n.baths != null ||
                n.hasLoft ||
                n.hasTerrace ||
                n.minPrice != null ||
                n.maxPrice != null;
            hasAny = hasAny || ((_e = n.note) !== null && _e !== void 0 ? _e : "") !== "";
            return hasAny
                ? {
                    rooms: n.rooms,
                    baths: n.baths,
                    hasLoft: n.hasLoft,
                    hasTerrace: n.hasTerrace,
                    minPrice: n.minPrice,
                    maxPrice: n.maxPrice,
                    note: (_f = n.note) !== null && _f !== void 0 ? _f : null,
                }
                : null;
        })
            .filter(Boolean);
        patch.units = units;
    }
    console.log("[toPinPatch] 반환 patch buildingTypes/parkingTypes:", {
        buildingTypes: patch.buildingTypes,
        parkingTypes: patch.parkingTypes,
        patchKeys: Object.keys(patch),
    });
    return patch;
}
/* 무의미한 null/빈값 제거: 초기 스냅샷 기준으로 noop이면 dto에서 삭제 */
const stripNoopNulls = (dto, initial) => {
    const norm = (x) => x === "" || x === null || x === undefined ? undefined : x;
    for (const k of Object.keys(dto)) {
        const v = dto[k];
        if (v === undefined) {
            delete dto[k];
            continue;
        }
        if (v === null && norm(initial === null || initial === void 0 ? void 0 : initial[k]) === undefined) {
            // parkingTypeId는 더 이상 사용 안 함
            delete dto[k];
            continue;
        }
        // directions / units / buildingTypes / parkingTypes / areaGroups 는 빈 배열이라도 보존 (등록과 동일)
        if (Array.isArray(v) && v.length === 0) {
            if (k === "directions" ||
                k === "units" ||
                k === "buildingTypes" ||
                k === "parkingTypes" ||
                k === "areaGroups")
                continue;
            delete dto[k];
            continue;
        }
        if (typeof v === "object" && v && Object.keys(v).length === 0) {
            delete dto[k];
            continue;
        }
    }
    return dto;
};
exports.stripNoopNulls = stripNoopNulls;
/* 🔎 신축/구옥 초기값 유도: ageType / buildingAgeType / isNew/isOld / buildingGrade 모두 고려 */
function deriveInitialBuildingGradeFrom(src) {
    var _a, _b, _c;
    if (!src)
        return "new";
    const t = ((_b = (_a = src === null || src === void 0 ? void 0 : src.ageType) !== null && _a !== void 0 ? _a : src === null || src === void 0 ? void 0 : src.buildingAgeType) !== null && _b !== void 0 ? _b : "")
        .toString()
        .toUpperCase();
    if (t === "NEW")
        return "new";
    if (t === "OLD")
        return "old";
    if ((src === null || src === void 0 ? void 0 : src.isNew) === true && (src === null || src === void 0 ? void 0 : src.isOld) !== true)
        return "new";
    if ((src === null || src === void 0 ? void 0 : src.isOld) === true && (src === null || src === void 0 ? void 0 : src.isNew) !== true)
        return "old";
    const g = ((_c = src === null || src === void 0 ? void 0 : src.buildingGrade) !== null && _c !== void 0 ? _c : "").toString().toLowerCase();
    if (g === "new")
        return "new";
    if (g === "old")
        return "old";
    return "new";
}
