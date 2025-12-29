"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PerformanceData } from "../types/PerformanceData";
import { StatsCards } from "./StatsCards";
import { TeamStatsCards } from "./TeamStatsCards";
import { TeamAllowanceBarChart } from "./TeamAllowanceBarChart";
import { TeamDetailView } from "./TeamDetailView";
import { PerformanceFilters } from "./PerformanceFilters";
import { generateYearOptions } from "../utils/performanceUtils";
import { CHART_CONFIG } from "../utils/chartConfig";
import {
  getPerformanceSummary,
  getTeamEmployees,
  buildPerformanceFilterQuery,
} from "../api/performance";
import {
  transformTeamSummaryToTeamStat,
  transformCompanyKpiToPerformanceStats,
  transformTeamEmployeesToPerformanceData,
} from "../utils/transformPerformanceData";

export function Performance() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
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

  // 연도 옵션 생성
  const yearOptions = generateYearOptions(currentYear);
  // 분기 옵션 (1~4)
  const quarterOptions = ["1", "2", "3", "4"];
  // 월 옵션 (1~12)
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));

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
  const { totalContracts, totalAllowance, netProfit, totalEmployees } = useMemo(() => {
    if (!performanceSummary) {
      return {
        totalContracts: 0,
        totalAllowance: 0,
        netProfit: 0,
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
    <div className="mx-auto max-w-7xl p-6 space-y-6 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">실적 확인</h1>
          <p className="text-gray-600 mt-1">계약기록 기반 실적 분석</p>
          {performanceSummary?.resolvedRange.label && (
            <p className="text-sm text-gray-500 mt-1">
              기간: {performanceSummary.resolvedRange.label}
            </p>
          )}
        </div>
        <PerformanceFilters
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
          onClose={() => {}}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <>
          {/* 1. 회사 총매출 */}
          <StatsCards
            totalContracts={totalContracts}
            totalAllowance={totalAllowance}
            netProfit={netProfit}
            totalEmployees={totalEmployees}
          />

          {/* 2. 팀 실적 - 그래프 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">팀 실적</h2>
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
          </div>

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
            <div ref={teamDetailRef} className="scroll-mt-6">
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
        </>
      )}
    </div>
  );
}
