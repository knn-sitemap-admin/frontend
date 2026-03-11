"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBuildingType = normalizeBuildingType;
exports.isSameBuildingType = isSameBuildingType;
const property_domain_1 = require("@/features/properties/types/property-domain");
/**
 * UI 라벨 / 서버 enum / 아무 문자열이나 받아서
 * 서버 enum(BuildingType)으로만 정규화
 *
 * - "APT" 같이 이미 enum 값이어도 그대로 통과
 * - "아파트" / "오피스텔" / "근/생" / "도/생" 등 라벨도 지원
 * - 인식 못 하면 null
 */
function normalizeBuildingType(v) {
    const s = String(v !== null && v !== void 0 ? v : "").trim();
    if (!s)
        return null;
    // 이미 서버 enum이면 그대로
    if (property_domain_1.BUILDING_TYPES.includes(s)) {
        return s;
    }
    // 그 외에는 라벨 → enum 헬퍼에 위임
    return (0, property_domain_1.normalizeBuildingTypeLabelToEnum)(s);
}
/** (옵션) 두 값이 같은 건물유형인지 비교할 때 사용 */
function isSameBuildingType(a, b) {
    return normalizeBuildingType(a) === normalizeBuildingType(b);
}
