import type { TeamStat } from "./performanceUtils";
import type { PerformanceData } from "../types/PerformanceData";
import type {
  TeamSummary,
  CompanyKpi,
  TeamEmployeeItem,
  TeamEmployeesResponse,
} from "../api/types";

/**
 * 백엔드 TeamSummary를 프론트엔드 TeamStat으로 변환
 */
export function transformTeamSummaryToTeamStat(team: TeamSummary): TeamStat {
  return {
    team: team.teamName,
    totalAllowance: team.finalPayout,
    totalContracts: team.contractCount,
    memberCount: team.memberCount,
    avgAllowance: team.memberCount > 0 ? team.finalPayout / team.memberCount : 0,
  };
}

/**
 * 백엔드 CompanyKpi를 프론트엔드 PerformanceStats로 변환
 */
export function transformCompanyKpiToPerformanceStats(
  company: CompanyKpi
): {
  totalContracts: number;
  totalAllowance: number; // 총매출 (grossSales)
  netProfit: number; // 순수익
  totalEmployees: number;
} {
  return {
    totalContracts: company.contractCount,
    totalAllowance: company.grossSales, // 총매출
    netProfit: company.netProfit, // 순수익
    totalEmployees: company.headcount,
  };
}

/**
 * 백엔드 TeamEmployeeItem을 프론트엔드 PerformanceData로 변환
 */
export function transformTeamEmployeeToPerformanceData(
  employee: TeamEmployeeItem,
  teamName: string,
  period: string
): PerformanceData {
  return {
    id: employee.accountId,
    employeeName: employee.name || "이름 없음",
    team: teamName,
    contractCount: employee.contractCount,
    finalAllowance: employee.finalPayout,
    period,
  };
}

/**
 * 팀 직원별 실적 응답을 프론트엔드 PerformanceData 배열로 변환
 */
export function transformTeamEmployeesToPerformanceData(
  teamEmployees: TeamEmployeesResponse,
  period: string
): PerformanceData[] {
  const teamName = teamEmployees.team.teamName;
  return teamEmployees.employees.map((employee) =>
    transformTeamEmployeeToPerformanceData(employee, teamName, period)
  );
}

