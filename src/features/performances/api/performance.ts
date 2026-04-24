import { apiFetch } from "@/shared/api/fetch";
import type {
  PerformanceFilterQuery,
  PerformanceSummaryResponse,
  TeamEmployeesResponse,
  PlatformStatisticsResponse,
} from "./types";

/**
 * 프론트엔드 필터 타입을 백엔드 필터 타입으로 변환
 */
export function convertFilterTypeToBackend(
  period: string
): "THIS_MONTH" | "MONTH" | "QUARTER" | "YEAR" | "ALL" {
  const p = period.toLowerCase();
  switch (p) {
    case "month":
      return "THIS_MONTH";
    case "monthly":
      return "MONTH";
    case "quarter":
      return "QUARTER";
    case "yearly":
      return "YEAR";
    case "all":
      return "ALL";
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
 */
export async function getPerformanceSummary(
  query: PerformanceFilterQuery
): Promise<PerformanceSummaryResponse> {
  const params: Record<string, any> = { ...query };
  const data = await apiFetch.get<{ data: PerformanceSummaryResponse }>("/performance/summary", params);
  return data.data;
}

/**
 * 팀 직원별 실적 조회
 */
export async function getTeamEmployees(
  teamId: string,
  query: PerformanceFilterQuery
): Promise<TeamEmployeesResponse> {
  const params: Record<string, any> = { ...query };
  const data = await apiFetch.get<{ data: TeamEmployeesResponse }>(`/performance/teams/${teamId}`, params);
  return data.data;
}

/**
 * 모든 활성 직원 목록 조회
 */
export async function getEmployees(): Promise<any[]> {
  const data = await apiFetch.get<{ data: any[] }>("/performance/employees");
  return data.data;
}

/**
 * 특정 직원의 월별 실적 추이 조회
 */
export async function getEmployeePerformance(
  accountId: string,
  year: number
): Promise<any> {
  const data = await apiFetch.get<{ data: any }>(`/performance/employees/${accountId}`, { year });
  return data.data;
}

/**
 * 플랫폼별 통계 조회
 */
export async function getPlatformStatistics(
  query: PerformanceFilterQuery
): Promise<PlatformStatisticsResponse> {
  const params: Record<string, any> = { ...query };
  const data = await apiFetch.get<{ data: PlatformStatisticsResponse }>("/performance/platform-statistics", params);
  return data.data;
}

/**
 * 데이터가 존재하는 기간 목록 조회
 */
export async function getAvailablePeriods(): Promise<{
  years: number[];
  yearMonths: { year: number; month: number }[];
}> {
  const data = await apiFetch.get<{
    data: {
      years: number[];
      yearMonths: { year: number; month: number }[];
    };
  }>("/performance/available-periods");
  return data.data;
}
