"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PerformanceData } from "../types/PerformanceData";
import {
  DataTablePageLayout,
  DataTablePageHeader,
  StatCard,
  StatCardsGrid,
  DataTableSection,
  PeriodFilters,
  generateYearOptions,
  getPeriodLabel,
} from "@/features/data-table";
import { TeamStatsCards } from "./TeamStatsCards";
import { TeamAllowanceBarChart } from "./TeamAllowanceBarChart";
import { TeamDetailView } from "./TeamDetailView";
import { CHART_CONFIG } from "../utils/chartConfig";
import { DollarSign, TrendingUp, Users, FileText } from "lucide-react";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";
import {
  getPerformanceSummary,
  getTeamEmployees,
  buildPerformanceFilterQuery,
  getAvailablePeriods
} from "../api/performance";
import {
  transformTeamSummaryToTeamStat,
  transformCompanyKpiToPerformanceStats,
  transformTeamEmployeesToPerformanceData
} from "../utils/transformPerformanceData";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/atoms/Tabs/Tabs";
import { EmployeePerformanceView } from "./EmployeePerformanceView";
import { cn } from "@/lib/cn";

export function Performance() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = useState(
    currentQuarter.toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<string | null>(
    null
  );
  const teamDetailRef = useRef<HTMLDivElement>(null);

  // 가용 기간 데이터 조회
  const { data: periods } = useQuery({
    queryKey: ["available-periods"],
    queryFn: getAvailablePeriods,
  });

  // 연도 옵션 생성
  const yearOptions = useMemo(() => {
    return (periods?.years || [currentYear]).map(y => y.toString());
  }, [periods, currentYear]);

  // 분기 옵션 (1~4)
  const quarterOptions = ["1", "2", "3", "4"];

  // 월 옵션 (1~12) - 선택된 연도 기준 가용 월만 필터링
  const monthOptions = useMemo(() => {
    if (!periods?.yearMonths) return Array.from({ length: 12 }, (_, i) => String(i + 1));
    return periods.yearMonths
      .filter(pm => pm.year.toString() === selectedYear)
      .map(pm => pm.month.toString())
      .sort((a, b) => Number(a) - Number(b));
  }, [periods, selectedYear]);

  // 선택된 연도에 해당 월 데이터가 없으면 첫 번째 가용 월로 자동 변경
  useEffect(() => {
    if (selectedPeriod === "monthly" && monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth, selectedPeriod]);

  // 필터 쿼리 생성
  const filterQuery = useMemo(() => {
    return buildPerformanceFilterQuery(
      selectedPeriod,
      selectedYear,
      selectedQuarter,
      selectedMonth
    );
  }, [selectedPeriod, selectedYear, selectedQuarter, selectedMonth]);

  // 실적 요약 조회
  const {
    data: performanceSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
  } = useQuery({
    queryKey: ["performance-summary", filterQuery],
    queryFn: () => getPerformanceSummary(filterQuery),
  });

  // 팀별 통계 변환
  const teamStats = useMemo(() => {
    if (!performanceSummary) return [];
    return performanceSummary.teams.map(transformTeamSummaryToTeamStat);
  }, [performanceSummary]);

  // 전체 통계 변환
  const {
    totalContracts,
    completedContracts,
    rejectedContracts,
    totalGrossSales,
    totalNetProfit,
    totalEmployees
  } = useMemo(() => {
    if (!performanceSummary) {
      return {
        totalContracts: 0,
        completedContracts: 0,
        rejectedContracts: 0,
        totalGrossSales: 0,
        totalNetProfit: 0,
        totalEmployees: 0,
      };
    }
    return transformCompanyKpiToPerformanceStats(performanceSummary.company);
  }, [performanceSummary]);

  // 선택된 팀 ID 찾기
  const selectedTeamId = useMemo(() => {
    if (!selectedTeamDetail || !performanceSummary) return null;
    const team = performanceSummary.teams.find(
      (t) => t.teamName === selectedTeamDetail
    );
    return team?.teamId || null;
  }, [selectedTeamDetail, performanceSummary]);

  // 팀 직원별 실적 조회
  const {
    data: teamEmployeesData,
    isLoading: isLoadingTeamEmployees,
  } = useQuery({
    queryKey: ["team-employees", selectedTeamId, filterQuery],
    queryFn: () => {
      if (!selectedTeamId) throw new Error("teamId is required");
      return getTeamEmployees(selectedTeamId, filterQuery);
    },
    enabled: !!selectedTeamId,
  });

  // 선택된 팀의 직원별 데이터 변환
  const selectedTeamMembers = useMemo(() => {
    if (!teamEmployeesData || !selectedTeamDetail) return [];
    const periodLabel =
      performanceSummary?.resolvedRange.label || selectedPeriod;
    return transformTeamEmployeesToPerformanceData(
      teamEmployeesData,
      periodLabel
    );
  }, [teamEmployeesData, selectedTeamDetail, performanceSummary, selectedPeriod]);

  // 팀 선택 시 해당 섹션으로 스크롤
  useEffect(() => {
    if (selectedTeamDetail && teamDetailRef.current) {
      setTimeout(() => {
        teamDetailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [selectedTeamDetail]);

  // 로딩 상태
  const isLoading = isLoadingSummary || (selectedTeamId && isLoadingTeamEmployees);

  // 에러 처리
  if (summaryError) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          실적 데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      </div>
    );
  }

  return (
    <DataTablePageLayout>
      <DataTablePageHeader
        title="실적 확인"
        description="분양 기록 기반 실적 및 수익 분석"
        periodLabel={
          performanceSummary?.resolvedRange.label ||
          getPeriodLabel(
            selectedPeriod,
            selectedYear,
            selectedQuarter,
            selectedMonth
          )
        }
        actions={
          <PeriodFilters
            selectedPeriod={selectedPeriod}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            selectedMonth={selectedMonth}
            yearOptions={yearOptions}
            quarterOptions={quarterOptions}
            monthOptions={monthOptions}
            onPeriodChange={setSelectedPeriod}
            onYearChange={setSelectedYear}
            onQuarterChange={setSelectedQuarter}
            onMonthChange={setSelectedMonth}
            onClose={() => { }}
          />
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">데이터를 분석 중입니다...</div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 1. 회사 총 실적 - 탭 상단 고정 */}
          <StatCardsGrid title="전체 실적 요약" columns={4}>
            <StatCard
              label="총매출"
              value={formatCurrency(totalGrossSales)}
              icon={<DollarSign className="h-6 w-6" />}
              variant="blue"
            />
            <StatCard
              label="순수익"
              value={formatCurrency(totalNetProfit)}
              valueClassName={cn(
                "text-base sm:text-lg lg:text-xl font-black text-green-600 leading-none tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
              )}
              icon={<TrendingUp className="h-6 w-6" />}
              variant="green"
            />
            <StatCard
              label="총 계약 건수"
              value={`${totalContracts.toLocaleString()}건`}
              icon={<FileText className="h-6 w-6" />}
              variant="purple"
            />
            <StatCard
              label="계약완료"
              value={`${completedContracts.toLocaleString()}건`}
              icon={<FileText className="h-6 w-6" />}
              variant="green"
            />
            <StatCard
              label="계약부결"
              value={`${rejectedContracts.toLocaleString()}건`}
              icon={<FileText className="h-6 w-6" />}
              variant="red"
            />
            <StatCard
              label="총 인원수"
              value={`${totalEmployees}명`}
              icon={<Users className="h-6 w-6" />}
              variant="orange"
            />
          </StatCardsGrid>

          <Tabs defaultValue="team" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-gray-100/80 p-1 rounded-xl ring-1 ring-gray-200">
                <TabsTrigger
                  value="team"
                  className="px-8 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all"
                >
                  팀별 실적
                </TabsTrigger>
                <TabsTrigger
                  value="employee"
                  className="px-8 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all"
                >
                  영업자별 실적
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="team" className="space-y-10 focus:outline-none">
              {/* 2. 팀 실적 - 그래프 */}
              <DataTableSection title="팀 실적 현황">
                {teamStats.length > 0 ? (
                  <TeamAllowanceBarChart
                    teamStats={teamStats}
                    chartConfig={CHART_CONFIG}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    표시할 팀 실적 데이터가 없습니다.
                  </div>
                )}
              </DataTableSection>

              {/* 3. 팀별 총 금액, 건수, 순수익 카드 */}
              {teamStats.length > 0 ? (
                <TeamStatsCards
                  teamStats={teamStats}
                  selectedTeamDetail={selectedTeamDetail}
                  onTeamSelect={setSelectedTeamDetail}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  표시할 팀 데이터가 없습니다.
                </div>
              )}

              {/* 선택된 팀의 직원별 상세 정보 */}
              {selectedTeamDetail && (
                <div ref={teamDetailRef} className="scroll-mt-6 animate-in slide-in-from-top-4 duration-500">
                  {isLoadingTeamEmployees ? (
                    <div className="text-center text-gray-500 py-8">
                      직원 데이터를 불러오는 중...
                    </div>
                  ) : (
                    <TeamDetailView
                      selectedTeamDetail={selectedTeamDetail}
                      selectedTeamMembers={selectedTeamMembers}
                      selectedPeriod={selectedPeriod}
                      selectedYear={selectedYear}
                      selectedQuarter={selectedQuarter}
                      selectedMonth={selectedMonth}
                      yearOptions={yearOptions}
                      quarterOptions={quarterOptions}
                      monthOptions={monthOptions}
                      chartConfig={CHART_CONFIG}
                      onPeriodChange={setSelectedPeriod}
                      onYearChange={setSelectedYear}
                      onQuarterChange={setSelectedQuarter}
                      onMonthChange={setSelectedMonth}
                      onClose={() => setSelectedTeamDetail(null)}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="employee" className="focus:outline-none">
              <EmployeePerformanceView />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DataTablePageLayout>
  );
}
