// 백엔드 API 응답 타입

export type FilterType = "THIS_MONTH" | "MONTH" | "QUARTER" | "YEAR";

export interface PerformanceFilterQuery {
  filterType?: FilterType;
  year?: number;
  month?: number; // 1-12
  quarter?: number; // 1-4
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
  finalPayout: number; // 팀 최종수당 합
  contractCount: number; // 팀 계약 건수
  memberCount: number; // 팀원 수
}

export interface TopTeam {
  teamId: string;
  teamName: string;
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

