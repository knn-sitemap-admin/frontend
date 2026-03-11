"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePreset = exports.parsePackedRangeToM2 = exports.packRange = exports.toM2 = exports.toPy = exports.PYEONG_TO_M2 = void 0;
exports.buildAreaGroups = buildAreaGroups;
/** 1평 = 3.305785㎡ */
exports.PYEONG_TO_M2 = 3.305785;
/** 내부 유틸: 숫자/문자 입력을 안전하게 숫자로 정규화 */
function sanitizeNum(input) {
    if (typeof input === "number") {
        return Number.isFinite(input) ? input : null;
    }
    if (typeof input === "string") {
        // 공백/콤마 제거 → 끝의 단위 토큰 제거(대소문자 무시)
        const cleaned = input
            .trim()
            .replace(/[, ]+/g, "") // "1,234.5 m²" -> "1234.5m²"
            .replace(/(?:㎡|m2|m²|평|py)+$/i, ""); // "1234.5m²" -> "1234.5"
        const n = parseFloat(cleaned.replace(/^\+/, "")); // +부호 허용
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/** 소수 자릿수 정규화 (기본 2, 음수/NaN 방지) */
function normDecimals(d) {
    const n = Number.isFinite(d) ? Math.floor(d) : 2;
    return n >= 0 ? n : 2;
}
/** ㎡ → 평 (소수 n자리, 기본 2자리) */
const toPy = (m2, decimals = 2) => {
    const n = sanitizeNum(m2);
    if (n == null)
        return "";
    return (n / exports.PYEONG_TO_M2).toFixed(normDecimals(decimals));
};
exports.toPy = toPy;
/** 평 → ㎡ (소수 n자리, 기본 2자리) */
const toM2 = (py, decimals = 2) => {
    const n = sanitizeNum(py);
    if (n == null)
        return "";
    return (n * exports.PYEONG_TO_M2).toFixed(normDecimals(decimals));
};
exports.toM2 = toM2;
/** "a~b" 포맷으로 합치기 (a/b 빈칸 허용) */
const packRange = (a, b) => {
    const A = (a !== null && a !== void 0 ? a : "").trim();
    const B = (b !== null && b !== void 0 ? b : "").trim();
    if (A && B)
        return `${A}~${B}`;
    if (A)
        return `${A}~${A}`;
    if (B)
        return `${B}~${B}`;
    return "";
};
exports.packRange = packRange;
/** "a~b" → { min, max } 로 풀기 (없으면 빈문자열) */
const unpackRange = (range) => {
    var _a, _b;
    const raw = String(range !== null && range !== void 0 ? range : "").trim();
    if (!raw)
        return { min: "", max: "" };
    const parts = raw.split("~", 2);
    let min = ((_a = parts[0]) !== null && _a !== void 0 ? _a : "").trim();
    let max = ((_b = parts[1]) !== null && _b !== void 0 ? _b : "").trim();
    if (min && !max)
        max = min;
    if (max && !min)
        min = max;
    return { min, max };
};
/** "m2Min~m2Max|pyMin~pyMax" 또는 "m2Min~m2Max" 또는 "pyMin~pyMax" 지원
 *  - m² 파트가 있으면 그대로 사용
 *  - 평 파트만 있으면 평→m² 변환해서 반환
 */
const parsePackedRangeToM2 = (packed) => {
    const s = String(packed !== null && packed !== void 0 ? packed : "").trim();
    if (!s)
        return { minM2: "", maxM2: "" };
    const [m2Part = "", pyPart = ""] = s
        .split("|", 2)
        .map((x) => (x !== null && x !== void 0 ? x : "").trim());
    if (m2Part) {
        const { min, max } = unpackRange(m2Part);
        return { minM2: min, maxM2: max };
    }
    if (pyPart) {
        const { min, max } = unpackRange(pyPart);
        return {
            minM2: min ? (0, exports.toM2)(min) : "",
            maxM2: max ? (0, exports.toM2)(max) : "",
        };
    }
    return { minM2: "", maxM2: "" };
};
exports.parsePackedRangeToM2 = parsePackedRangeToM2;
/** "R/B" 문자열을 { rooms, baths } 로 파싱 (여백/이상치 허용) */
const parsePreset = (s) => {
    const [r, b] = String(s)
        .replace(/\s/g, "")
        .split("/", 2)
        .map((n) => parseInt(n, 10));
    return {
        rooms: Number.isFinite(r) ? r : 0,
        baths: Number.isFinite(b) ? b : 0,
    };
};
exports.parsePreset = parsePreset;
/** "", null, undefined → undefined / 숫자 문자열 → number */
const toNum = (v) => {
    const n = sanitizeNum(v);
    return n == null ? undefined : n;
};
/** m² 우선, 없으면 평→m² 변환 */
const chooseM2 = (m2, py) => {
    const m = toNum(m2);
    if (m !== undefined)
        return m;
    const p = toNum(py);
    return p !== undefined ? p * exports.PYEONG_TO_M2 : undefined;
};
/** 단일 AreaSet → CreatePinAreaGroupDto (빈행/필수값 검증 포함) */
function normalizeAreaGroup(s) {
    var _a;
    if (!s)
        return null;
    const title = String((_a = s.title) !== null && _a !== void 0 ? _a : "").trim();
    const exMin = chooseM2(s.exMinM2, s.exMinPy);
    const exMax = chooseM2(s.exMaxM2, s.exMaxPy);
    const realMin = chooseM2(s.realMinM2, s.realMinPy);
    const realMax = chooseM2(s.realMaxM2, s.realMaxPy);
    // 완전 빈 행(제목/숫자 모두 없음) 제거
    const hasAny = !!title ||
        exMin !== undefined ||
        exMax !== undefined ||
        realMin !== undefined ||
        realMax !== undefined;
    if (!hasAny)
        return null;
    // 전용(㎡) 최소·최대 채워주기
    let finalExMin = exMin;
    let finalExMax = exMax;
    if (finalExMin === undefined && finalExMax !== undefined)
        finalExMin = finalExMax;
    if (finalExMax === undefined && finalExMin !== undefined)
        finalExMax = finalExMin;
    // 실평(㎡) 채워주기
    let finalAcMin = realMin !== null && realMin !== void 0 ? realMin : null;
    let finalAcMax = realMax !== null && realMax !== void 0 ? realMax : null;
    if (finalAcMin === null && finalAcMax !== null)
        finalAcMin = finalAcMax;
    if (finalAcMax === null && finalAcMin !== null)
        finalAcMax = finalAcMin;
    // 전용 또는 실평 중 하나라도 있어야 유효함 (기존에는 전용 필수였음)
    if (finalExMin === undefined && finalExMax === undefined && finalAcMin === null && finalAcMax === null)
        return null;
    const exLo = finalExMin !== undefined && finalExMax !== undefined
        ? Math.min(finalExMin, finalExMax)
        : null;
    const exHi = finalExMin !== undefined && finalExMax !== undefined
        ? Math.max(finalExMin, finalExMax)
        : null;
    const acLo = finalAcMin !== null && finalAcMax !== null
        ? Math.min(finalAcMin, finalAcMax)
        : null;
    const acHi = finalAcMin !== null && finalAcMax !== null
        ? Math.max(finalAcMin, finalAcMax)
        : null;
    // 개별 평수 정규화 (units 필드가 있는 경우)
    const units = Array.isArray(s.units) && s.units.length > 0
        ? s.units
            .map((u) => {
            const exM2 = toNum(u === null || u === void 0 ? void 0 : u.exclusiveM2);
            const reM2 = toNum(u === null || u === void 0 ? void 0 : u.realM2);
            // 둘 다 없으면 제외
            if (exM2 === undefined && reM2 === undefined)
                return null;
            return {
                exclusiveM2: exM2 !== null && exM2 !== void 0 ? exM2 : null,
                realM2: reM2 !== null && reM2 !== void 0 ? reM2 : null,
            };
        })
            .filter((u) => u !== null)
        : null;
    return Object.assign({ title, exclusiveMinM2: exLo != null ? Math.max(0, exLo) : null, exclusiveMaxM2: exHi != null ? Math.max(0, exHi) : null, actualMinM2: acLo != null ? Math.max(0, acLo) : null, actualMaxM2: acHi != null ? Math.max(0, acHi) : null }, (units && units.length > 0 ? { units } : {}));
}
/** base + extras → API용 areaGroups (sortOrder 1부터 연속) */
function buildAreaGroups(base, extras) {
    const out = [];
    const first = normalizeAreaGroup(base);
    if (first)
        out.push(first);
    for (const s of extras !== null && extras !== void 0 ? extras : []) {
        const n = normalizeAreaGroup(s);
        if (n)
            out.push(n);
    }
    return out.map((g, i) => (Object.assign(Object.assign({}, g), { sortOrder: i + 1 })));
}
