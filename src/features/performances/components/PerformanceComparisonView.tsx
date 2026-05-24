"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { 
  getPerformanceSummary, 
  getTeamEmployees 
} from "../api/performance";
import { 
  CardWithTable 
} from "@/features/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/Tabs/Tabs";
import { MapPin, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";

interface PerformanceComparisonViewProps {
  filterQuery: any;
  yearOptions: string[];
}

export function PerformanceComparisonView({ filterQuery }: PerformanceComparisonViewProps) {
  const [viewMode, setViewMode] = useState<"team" | "employee">("team");

  // 1. 팀별 요약 데이터 조회 (팀 목록 획득용)
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["performance-summary", filterQuery],
    queryFn: () => getPerformanceSummary(filterQuery),
  });

  const teams = summary?.teams || [];

  // 2. 모든 팀의 상세 데이터를 병렬로 조회 (직원별 보기 모드일 때 사용)
  const teamDetailsQueries = useQueries({
    queries: teams.map(team => ({
      queryKey: ["team-employees-detail", team.teamId, filterQuery],
      queryFn: () => getTeamEmployees(team.teamId, filterQuery),
      enabled: viewMode === "employee" && !!team.teamId,
    }))
  });

  const isAnyTeamLoading = teamDetailsQueries.some(q => q.isLoading);

  // 전 직원 데이터 평탄화 (Flatten)
  const allEmployees = useMemo(() => {
    if (viewMode !== "employee") return [];
    return teamDetailsQueries
      .filter(q => q.data)
      .flatMap(q => {
        const teamName = q.data!.team.teamName;
        return q.data!.employees.map(emp => ({
          ...emp,
          teamName
        }));
      })
      .sort((a, b) => b.surveyCount - a.surveyCount); // 답사 순 정렬
  }, [teamDetailsQueries, viewMode]);

  const isLoading = isLoadingSummary || (viewMode === "employee" && isAnyTeamLoading);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            답사 통계 스프레드
          </h3>
          <p className="text-sm text-gray-500 mt-1">팀 및 직원별 답사(Survey) 활동량을 집중적으로 비교 분석합니다.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-bold transition-all",
              viewMode === "team" ? "bg-white shadow-sm text-orange-600" : "text-gray-500"
            )}
            onClick={() => setViewMode("team")}
          >
            팀별 통계
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-bold transition-all",
              viewMode === "employee" ? "bg-white shadow-sm text-orange-600" : "text-gray-500"
            )}
            onClick={() => setViewMode("employee")}
          >
            직원별 통계
          </Button>
        </div>
      </div>

      <CardWithTable
        title={viewMode === "team" ? "팀별 답사 활동 지표" : "전 직원 답사 활동 순위"}
        description={viewMode === "team" 
          ? "팀 전체의 현장 활동량을 비교합니다." 
          : "개인별 현장 답사 활동 순위와 비중을 확인합니다."}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-y border-gray-100">
                <th className="py-4 px-6 text-left text-xs font-black text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                  {viewMode === "team" ? "팀명" : "성함 / 소속"}
                </th>
                <th className="py-4 px-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider">
                  {viewMode === "team" ? "팀원 수" : "직급"}
                </th>
                <th className="py-4 px-6 text-center text-xs font-black text-orange-600 uppercase tracking-wider min-w-[120px] bg-orange-50/30">
                  총 답사 건수 (Total Surveys)
                </th>
                <th className="py-4 px-6 text-right text-xs font-black text-gray-400 uppercase tracking-wider min-w-[150px]">
                  {viewMode === "team" ? "인당 평균 답사" : "비고"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                       <span className="text-sm font-bold text-gray-400">데이터를 분석 하는 중...</span>
                    </div>
                  </td>
                </tr>
              ) : viewMode === "team" ? (
                teams.map((team, idx) => (
                  <tr key={team.teamId} className="group hover:bg-orange-50/30 transition-colors">
                    <td className="py-4 px-6 sticky left-0 bg-white group-hover:bg-orange-50/30 z-10 border-r border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                          {idx + 1}
                        </div>
                        <span className="font-black text-gray-900">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-gray-500">{team.memberCount}명</td>
                    <td className="py-4 px-6 text-center font-black text-orange-600 bg-orange-50/10">
                      <div className="flex items-center justify-center gap-2 text-lg">
                        <MapPin className="h-4 w-4" />
                        {team.surveyCount.toLocaleString()}건
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-gray-400 tabular-nums">
                      주 평균 약 {(team.surveyCount / 4).toFixed(1)}건
                    </td>
                  </tr>
                ))
              ) : (
                allEmployees.map((emp, idx) => (
                  <tr key={emp.accountId} className="group hover:bg-orange-50/30 transition-colors">
                    <td className="py-4 px-6 sticky left-0 bg-white group-hover:bg-orange-50/30 z-10 border-r border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs text-white",
                          idx === 0 ? "bg-orange-500 shadow-md" : idx === 1 ? "bg-orange-400" : idx === 2 ? "bg-orange-300" : "bg-gray-300"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-black text-gray-900">{emp.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{emp.teamName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-gray-500">{emp.positionRank || "-"}</td>
                    <td className="py-4 px-6 text-center font-black text-orange-600 bg-orange-50/10">
                      <div className="flex items-center justify-center gap-2 text-lg">
                        <MapPin className="h-4 w-4" />
                        {emp.surveyCount.toLocaleString()}건
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-gray-400 tabular-nums">
                      {idx === 0 ? "최다 답사" : ""}
                    </td>
                  </tr>
                ))
              )}

              {!isLoading && (viewMode === "team" ? teams.length === 0 : allEmployees.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-400 font-bold">표시할 답사 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
            {!isLoading && teams.length > 0 && (
               <tfoot className="bg-gray-900 text-white font-bold">
                  <tr>
                    <td className="py-4 px-6 sticky left-0 bg-gray-900 z-10">전체 합계</td>
                    <td className="py-4 px-4 text-center">
                      {viewMode === "team" ? teams.reduce((a, b) => a + b.memberCount, 0) : allEmployees.length}명
                    </td>
                    <td className="py-4 px-6 text-center text-orange-400 bg-white/5 text-xl">
                      {teams.reduce((a, b) => a + b.surveyCount, 0).toLocaleString()}건
                    </td>
                    <td className="py-4 px-6 text-right text-gray-400">
                      인당 평균 {(teams.reduce((a, b) => a + b.surveyCount, 0) / (viewMode === "team" ? teams.reduce((a, b) => a + b.memberCount, 1) : allEmployees.length)).toFixed(1)}건
                    </td>
                  </tr>
               </tfoot>
            )}
          </table>
        </div>
      </CardWithTable>
    </div>
  );
}
