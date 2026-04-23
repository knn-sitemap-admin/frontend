"use client";

import { useState } from "react";
import { PlatformStatisticsView } from "@/features/performances/components/PlatformStatisticsView";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/atoms/Select/Select";
import { buildPerformanceFilterQuery } from "@/features/performances/api/performance";
import { DataTablePageLayout, DataTablePageHeader } from "@/features/data-table";

export default function PlatformStatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("THIS_MONTH");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState("1");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

  const filterQuery = buildPerformanceFilterQuery(
    selectedPeriod,
    selectedYear,
    selectedQuarter,
    selectedMonth
  );

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
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = (new Date().getFullYear() - i).toString();
                    return <SelectItem key={y} value={y}>{y}년</SelectItem>;
                  })}
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
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = (i + 1).toString();
                    return <SelectItem key={m} value={m}>{m}월</SelectItem>;
                  })}
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
