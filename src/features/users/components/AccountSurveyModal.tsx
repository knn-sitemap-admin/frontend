"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/atoms/Dialog/Dialog";
import { getEmployeePerformance, getAvailablePeriods } from "@/features/performances/api/performance";
import {
  StatCard,
  StatCardsGrid
} from "@/features/data-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  MapPin,
  Calendar,
  TrendingUp,
  Loader2 as Spinner
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";

interface AccountSurveyModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName: string;
}

export function AccountSurveyModal({
  open,
  onClose,
  accountId,
  accountName,
}: AccountSurveyModalProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState(currentYear);

  // 가용 기간 데이터 조회
  const { data: periods } = useQuery({
    queryKey: ["available-periods"],
    queryFn: getAvailablePeriods,
    enabled: open,
  });

  const yearOptions = React.useMemo(() => {
    return (periods?.years || [currentYear]).map(y => y.toString());
  }, [periods, currentYear]);

  // 실적 조회
  const { data: performance, isLoading } = useQuery({
    queryKey: ["employee-performance", accountId, selectedYear],
    queryFn: () => getEmployeePerformance(accountId!, selectedYear),
    enabled: !!accountId && open,
  });

  // 차트 데이터 및 통계 계산
  const { chartData, totals } = React.useMemo(() => {
    if (!performance) return { chartData: [], totals: { surveyCount: 0 } };

    const data = performance.monthlyStats.map((stat: any) => ({
      name: `${stat.month}월`,
      "답사 건수": stat.surveyCount || 0,
    }));

    const totalSurveys = performance.monthlyStats.reduce(
      (acc: number, curr: any) => acc + (curr.surveyCount || 0),
      0
    );

    return { chartData: data, totals: { surveyCount: totalSurveys } };
  }, [performance]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-100 p-2 rounded-lg">
              <MapPin className="h-5 w-5 text-orange-600" />
            </div>
            <DialogTitle className="text-2xl font-black">
              {accountName}님 답사 현황
            </DialogTitle>
          </div>
          <DialogDescription>
            {selectedYear}년도 월별 현장 답사 활동 내역입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 연도 선택 */}
          <div className="flex justify-end items-center gap-2">
            <span className="text-sm font-bold text-gray-400">조회 연도:</span>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {yearOptions.map((year) => (
                <Button
                  key={year}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                    selectedYear === parseInt(year)
                      ? "bg-white shadow-sm text-orange-600"
                      : "text-gray-500 hover:bg-white/50"
                  )}
                  onClick={() => setSelectedYear(parseInt(year))}
                >
                  {year}년
                </Button>
              ))}
            </div>
          </div>

          {/* 통계 요약 */}
          <StatCardsGrid columns={1}>
            <StatCard
              label="연간 총 답사 건수"
              value={`${totals.surveyCount.toLocaleString()}건`}
              icon={<MapPin className="h-6 w-6" />}
              variant="orange"
            />
          </StatCardsGrid>

          {/* 월별 그래프 */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              월별 답사 추이
            </h4>
            <div className="h-[300px] w-full">
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Spinner className="h-8 w-8 text-orange-500 animate-spin" />
                  <span className="text-sm font-bold text-gray-400">데이터 로딩 중...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#fff7ed' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar
                      dataKey="답사 건수"
                      fill="#f97316"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-black text-gray-400 uppercase">월</th>
                  <th className="py-3 px-6 text-right text-xs font-black text-gray-400 uppercase">답사 건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {chartData.map((stat: any, i: number) => (
                  <tr key={i} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="py-3 px-6 font-bold text-gray-600">{stat.name}</td>
                    <td className="py-3 px-6 text-right font-black text-orange-600 group-hover:scale-110 transition-transform origin-right">
                      {stat["답사 건수"]}건
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={onClose}
            className="rounded-xl px-8 font-bold bg-gray-900 hover:bg-black transition-all"
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
