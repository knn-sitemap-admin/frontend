// 백엔드 API 응답 타입

export type FilterType = "THIS_MONTH" | "MONTH" | "QUARTER" | "YEAR" | "ALL";

export interface PerformanceFilterQuery {
  filterType?: FilterType;
  year?: number;
  month?: number; // 1-12
  quarter?: number; // 1-4
  accountId?: string;
}

export interface ResolvedRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export interface CompanyKpi {
  grossSales: number; // 총매출
  netProfit: number; // 순수익
  contractCount: number; // 완료 계약 수
  headcount: number; // 총 인원수
}

export interface TeamSummary {
  teamId: string;
  teamName: string;
  grossSales: number; // 팀 기여분 총 매출
  netProfit: number; // 팀 기여분 순수익(회사의 수익)
  finalPayout: number; // 팀 최종수당 합
  contractCount: number; // 팀 계약 건수
  memberCount: number; // 팀원 수
}

export interface TopTeam {
  teamId: string;
  teamName: string;
  grossSales: number;
  netProfit: number;
  finalPayout: number;
  contractCount: number;
  rank: 1 | 2 | 3;
}

export interface PerformanceSummaryResponse {
  resolvedRange: ResolvedRange;
  company: CompanyKpi;
  teams: TeamSummary[];
  topTeams: TopTeam[];
}

export interface TeamEmployeeItem {
  accountId: string;
  name: string | null;
  positionRank: string | null;
  grossSales: number; // 개인 기여분 총 매출
  netProfit: number; // 개인 기여분 순수익(회사의 수익)
  finalPayout: number; // 직원 최종수당
  contractCount: number; // 직원이 참여한 완료 계약 건수
}

export interface TeamEmployeesResponse {
  team: {
    teamId: string;
    teamName: string;
  };
  employees: TeamEmployeeItem[];
}

export interface EmployeeMonthlyStat {
  year: number;
  month: number;
  grossSales: number;
  netProfit: number;
  finalPayout: number;
  contractCount: number;
}

export interface EmployeePerformanceResponse {
  accountId: string;
  name: string | null;
  positionRank: string | null;
  monthlyStats: EmployeeMonthlyStat[];
}

export interface BaseEmployee {
  id: string;
  name: string | null;
  positionRank: string | null;
}

export interface PlatformStatItem {
  platform: string;
  newCount: number;
  reCount: number;
  canceledCount: number;
  contractedCount: number;
  rejectedCount: number;
  totalCount: number;
}

export interface PlatformStatisticsResponse {
  resolvedRange: ResolvedRange;
  statistics: PlatformStatItem[];
}

