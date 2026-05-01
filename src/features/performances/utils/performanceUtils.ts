import type { PerformanceData } from "../types/PerformanceData";

export interface TeamStat {
  team: string;
  totalAllowance: number;
  totalGrossSales: number;
  totalNetProfit: number;
  totalContracts: number;
  completedContracts: number;
  rejectedContracts: number;
  memberCount: number;
  avgAllowance: number;
  avgGrossSales: number;
}

export interface PerformanceStats {
  totalContracts: number;
  completedContracts: number;
  rejectedContracts: number;
  totalAllowance: number;
  totalGrossSales: number;
  totalNetProfit: number;
  totalEmployees: number;
}

export function calculateTeamStats(
  performanceData: PerformanceData[]
): TeamStat[] {
  const stats: Record<
    string,
    {
      totalAllowance: number;
      totalGrossSales: number;
      totalNetProfit: number;
      totalContracts: number;
      completedContracts: number;
      rejectedContracts: number;
      memberCount: number;
    }
  > = {};

  performanceData.forEach((item) => {
    if (!stats[item.team]) {
      stats[item.team] = {
        totalAllowance: 0,
        totalGrossSales: 0,
        totalNetProfit: 0,
        totalContracts: 0,
        completedContracts: 0,
        rejectedContracts: 0,
        memberCount: 0,
      };
    }
    stats[item.team].totalAllowance += item.finalAllowance;
    stats[item.team].totalGrossSales += (item.grossSales || 0);
    stats[item.team].totalNetProfit += (item.netProfit || 0);
    stats[item.team].totalContracts += item.totalContractCount;
    stats[item.team].completedContracts += item.completedContractCount;
    stats[item.team].rejectedContracts += item.rejectedContractCount;
    stats[item.team].memberCount += 1;
  });

  return Object.entries(stats)
    .map(([team, data]) => ({
      team,
      totalAllowance: data.totalAllowance,
      totalGrossSales: data.totalGrossSales,
      totalNetProfit: data.totalNetProfit,
      totalContracts: data.totalContracts,
      completedContracts: data.completedContracts,
      rejectedContracts: data.rejectedContracts,
      memberCount: data.memberCount,
      avgAllowance: data.totalAllowance / data.memberCount,
      avgGrossSales: data.totalGrossSales / data.memberCount,
    }))
    .sort((a, b) => a.team.localeCompare(b.team));
}

export function calculateOverallStats(
  performanceData: PerformanceData[]
): PerformanceStats {
  const totalContracts = performanceData.reduce(
    (sum, item) => sum + item.totalContractCount,
    0
  );
  const completedContracts = performanceData.reduce(
    (sum, item) => sum + item.completedContractCount,
    0
  );
  const rejectedContracts = performanceData.reduce(
    (sum, item) => sum + item.rejectedContractCount,
    0
  );
  const totalAllowance = performanceData.reduce(
    (sum, item) => sum + item.finalAllowance,
    0
  );
  const totalGrossSales = performanceData.reduce(
    (sum, item) => sum + (item.grossSales || 0),
    0
  );
  const totalNetProfit = performanceData.reduce(
    (sum, item) => sum + (item.netProfit || 0),
    0
  );
  const totalEmployees = performanceData.length;

  return {
    totalContracts,
    completedContracts,
    rejectedContracts,
    totalAllowance,
    totalGrossSales,
    totalNetProfit,
    totalEmployees,
  };
}

export function getTeamMembers(
  performanceData: PerformanceData[],
  teamName: string
): PerformanceData[] {
  return performanceData.filter((item) => item.team === teamName);
}

export function generateYearOptions(currentYear: number): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 5 + i;
    return year.toString();
  });
}
