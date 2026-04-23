"use client";

import React, { useState, useEffect } from "react";
import { PlatformStatisticsView } from "@/features/performances/components/PlatformStatisticsView";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/atoms/Select/Select";
import { buildPerformanceFilterQuery, getAvailablePeriods } from "@/features/performances/api/performance";
import { DataTablePageLayout, DataTablePageHeader } from "@/features/data-table";
import { useQuery } from "@tanstack/react-query";

export default function PlatformStatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("THIS_MONTH");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState("1");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

  const { data: periods } = useQuery({
    queryKey: ["available-periods"],
    queryFn: getAvailablePeriods,
  });

  const availableYears = periods?.years || [new Date().getFullYear()];
  const availableMonths = periods?.yearMonths
    ? periods.yearMonths
        .filter(pm => pm.year.toString() === selectedYear)
        .map(pm => pm.month.toString())
        .sort((a, b) => Number(b) - Number(a)) // 최신 월이 위로
    : Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  const filterQuery = buildPerformanceFilterQuery(
    selectedPeriod,
    selectedYear,
    selectedQuarter,
    selectedMonth
  );

  // 선택된 연도에 해당 월 데이터가 없으면 첫 번째 가용 월로 자동 변경
  useEffect(() => {
    if (selectedPeriod === "MONTHLY" && availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth, selectedPeriod]);

  return (
    <DataTablePageLayout>
      <DataTablePageHeader
        title="플랫폼 퍼포먼스 통계"
        description="플랫폼별 유입 경로와 최종 계약 전환율을 정밀 분석합니다."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px] h-10 border-none bg-white rounded-xl font-bold shadow-sm">
                <SelectValue placeholder="조회 기간" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="THIS_MONTH">이번 달</SelectItem>
                <SelectItem value="MONTHLY">월별 조회</SelectItem>
                <SelectItem value="QUARTER">분기별 조회</SelectItem>
                <SelectItem value="YEARLY">연도별 조회</SelectItem>
                <SelectItem value="ALL">누적 통계</SelectItem>
              </SelectContent>
            </Select>

            {(selectedPeriod === "MONTHLY" || selectedPeriod === "QUARTER" || selectedPeriod === "YEARLY") && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] h-10 border-none bg-white rounded-xl font-bold shadow-sm">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedPeriod === "QUARTER" && (
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[100px] h-10 border-none bg-white rounded-xl font-bold shadow-sm">
                  <SelectValue placeholder="분기" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {[1, 2, 3, 4].map(q => (
                    <SelectItem key={q} value={q.toString()}>{q}분기</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedPeriod === "MONTHLY" && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[100px] h-10 border-none bg-white rounded-xl font-bold shadow-sm">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>{m}월</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <div className="pt-6">
        <PlatformStatisticsView filterQuery={filterQuery} />
      </div>
    </DataTablePageLayout>
  );
}
