import { api } from "@/shared/api/api";
import type {
  PerformanceFilterQuery,
  PerformanceSummaryResponse,
  TeamEmployeesResponse,
} from "./types";

/**
 * 프론트엔드 필터 타입을 백엔드 필터 타입으로 변환
 */
export function convertFilterTypeToBackend(
  period: string
): "THIS_MONTH" | "MONTH" | "QUARTER" | "YEAR" {
  switch (period) {
    case "month":
      return "THIS_MONTH";
    case "monthly":
      return "MONTH";
    case "quarter":
      return "QUARTER";
    case "yearly":
      return "YEAR";
    default:
      return "THIS_MONTH";
  }
}

/**
 * 프론트엔드 필터를 백엔드 쿼리 파라미터로 변환
 */
export function buildPerformanceFilterQuery(
  period: string,
  year: string,
  quarter?: string,
  month?: string
): PerformanceFilterQuery {
  const filterType = convertFilterTypeToBackend(period);
  const query: PerformanceFilterQuery = { filterType };

  if (filterType === "MONTH" || filterType === "QUARTER" || filterType === "YEAR") {
    query.year = parseInt(year, 10);
  }

  if (filterType === "MONTH" && month) {
    query.month = parseInt(month, 10);
  }

  if (filterType === "QUARTER" && quarter) {
    query.quarter = parseInt(quarter, 10);
  }

  return query;
}

/**
 * 실적 요약 조회
 * GET /performance/summary
 */
export async function getPerformanceSummary(
  query: PerformanceFilterQuery
): Promise<PerformanceSummaryResponse> {
  try {
    const params = new URLSearchParams();
    
    if (query.filterType) {
      params.append("filterType", query.filterType);
    }
    if (query.year !== undefined) {
      params.append("year", query.year.toString());
    }
    if (query.month !== undefined) {
      params.append("month", query.month.toString());
    }
    if (query.quarter !== undefined) {
      params.append("quarter", query.quarter.toString());
    }

    const queryString = params.toString();
    const url = `/performance/summary${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<{
      success: boolean;
      path: string;
      data: PerformanceSummaryResponse;
    }>(url);

    return response.data.data;
  } catch (error: any) {
    console.error("실적 요약 조회 실패:", error);
    throw error;
  }
}

/**
 * 팀 직원별 실적 조회
 * GET /performance/teams/:teamId
 */
export async function getTeamEmployees(
  teamId: string,
  query: PerformanceFilterQuery
): Promise<TeamEmployeesResponse> {
  try {
    const params = new URLSearchParams();
    
    if (query.filterType) {
      params.append("filterType", query.filterType);
    }
    if (query.year !== undefined) {
      params.append("year", query.year.toString());
    }
    if (query.month !== undefined) {
      params.append("month", query.month.toString());
    }
    if (query.quarter !== undefined) {
      params.append("quarter", query.quarter.toString());
    }

    const queryString = params.toString();
    const url = `/performance/teams/${teamId}${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<{
      success: boolean;
      path: string;
      data: TeamEmployeesResponse;
    }>(url);

    return response.data.data;
  } catch (error: any) {
    console.error("팀 직원별 실적 조회 실패:", error);
    throw error;
  }
}

