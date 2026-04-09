"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployees, getEmployeePerformance } from "../api/performance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/atoms/Card/Card";
import { Button } from "@/components/atoms/Button/Button";
import { 
  formatCurrency, 
  formatKoreanAmount 
} from "@/components/contract-management/utils/contractUtils";
import { 
  DataTableSection, 
  generateYearOptions, 
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
  Legend, 
  Cell
} from "recharts";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  User as UserIcon,
  ChevronRight,
  Loader2 as Spinner
} from "lucide-react";
import { cn } from "@/lib/cn";

export function EmployeePerformanceView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const yearOptions = generateYearOptions(currentYear);

  // 직원 목록 조회
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: getEmployees,
  });

  // 선택된 직원의 실적 조회
  const { data: performance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ["employee-performance", selectedEmployeeId, selectedYear],
    queryFn: () => getEmployeePerformance(selectedEmployeeId!, selectedYear),
    enabled: !!selectedEmployeeId,
  });

  const selectedEmployee = useMemo(() => 
    employees.find((e: any) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  // 차트 데이터 변환
  const chartData = useMemo(() => {
    if (!performance) return [];
    return performance.monthlyStats.map((stat: any) => ({
      name: `${stat.month}월`,
      "영업자 수익": stat.finalPayout,
      "회사 수익": stat.netProfit,
      total: stat.grossSales,
      contracts: stat.contractCount,
    }));
  }, [performance]);

  // 연간 합계 계산
  const totals = useMemo(() => {
    if (!performance) return { grossSales: 0, netProfit: 0, finalPayout: 0, contractCount: 0 };
    return performance.monthlyStats.reduce((acc: any, curr: any) => ({
      grossSales: acc.grossSales + curr.grossSales,
      netProfit: acc.netProfit + curr.netProfit,
      finalPayout: acc.finalPayout + curr.finalPayout,
      contractCount: acc.contractCount + curr.contractCount,
    }), { grossSales: 0, netProfit: 0, finalPayout: 0, contractCount: 0 });
  }, [performance]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 영업자 선택 섹션 */}
      <DataTableSection title="영업자 선택" description="실적을 확인할 영업자를 선택하세요">
        <div className="flex flex-wrap gap-2 py-4">
          {isLoadingEmployees ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted animate-pulse rounded-full" />
            ))
          ) : (
            employees.map((emp: any) => (
              <Button
                key={emp.id}
                variant={selectedEmployeeId === emp.id ? "default" : "outline"}
                className={cn(
                  "rounded-full px-5 py-2 transition-all hover:scale-105 active:scale-95",
                  selectedEmployeeId === emp.id 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md border-none text-white font-semibold" 
                    : "bg-white/50 backdrop-blur-sm border-gray-200 hover:border-blue-400 hover:bg-blue-50/50"
                )}
                onClick={() => setSelectedEmployeeId(emp.id)}
              >
                <UserIcon className={cn("mr-2 h-4 w-4", selectedEmployeeId === emp.id ? "text-white" : "text-gray-400")} />
                {emp.name}
                <span className="ml-2 text-[10px] opacity-60 font-normal uppercase">{emp.positionRank || "Staff"}</span>
              </Button>
            ))
          )}
        </div>
      </DataTableSection>

      {!selectedEmployeeId ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <Users className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">영업자를 선택해주세요</h3>
            <p className="text-gray-500 mt-2 max-w-sm">상단에서 영업자를 클릭하면 연도별 상세 실적 리포트를 확인할 수 있습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 연도 필터 */}
          <div className="flex justify-end gap-2 items-center">
            <div className="text-sm font-medium text-gray-500 mr-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 분석 연도:
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {yearOptions.map((year: any) => (
                <Button
                  key={year}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs h-8 px-4 rounded-md",
                    selectedYear === parseInt(year) 
                      ? "bg-white shadow-sm font-bold text-blue-600" 
                      : "text-gray-500 hover:bg-white/50"
                  )}
                  onClick={() => setSelectedYear(parseInt(year))}
                >
                  {year}년
                </Button>
              ))}
            </div>
          </div>

          {/* 연간 통계 요약 */}
          <StatCardsGrid title={`${selectedEmployee?.name}님 ${selectedYear}년 실적 요약`} columns={4}>
            <StatCard
              label="연간 총 매출"
              value={formatCurrency(totals.grossSales)}
              icon={<DollarSign className="h-6 w-6" />}
              variant="blue"
            />
            <StatCard
              label="연간 영업자 수익"
              value={formatCurrency(totals.finalPayout)}
              valueClassName="text-indigo-600"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="purple"
            />
            <StatCard
              label="연간 회사 수익"
              value={formatCurrency(totals.netProfit)}
              valueClassName="text-green-600"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="green"
            />
             <StatCard
              label="연간 총 계약"
              value={`${totals.contractCount}건`}
              icon={<Users className="h-6 w-6" />}
              variant="orange"
            />
          </StatCardsGrid>

          {/* 월별 그래프 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 shadow-sm border-none bg-gradient-to-br from-white to-gray-50/50 overflow-hidden">
              <CardHeader className="border-b border-gray-100/50 pb-4 bg-white/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">월별 수익 추이</CardTitle>
                    <CardDescription>회사와 영업자의 월별 수익 비교 (단위: 원)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100 transition-all hover:bg-blue-100">
                        <div className="h-2 w-2 rounded-full bg-blue-600" /> 영업자 수익
                     </div>
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100 transition-all hover:bg-emerald-100">
                        <div className="h-2 w-2 rounded-full bg-emerald-600" /> 회사 수익
                     </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 h-[400px]">
                {isLoadingPerformance ? (
                   <div className="w-full h-full flex items-center justify-center">
                      <Spinner className="h-8 w-8 text-blue-500 animate-spin" />
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        tickFormatter={(val) => formatKoreanAmount(val)}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/90 backdrop-blur-md border border-white/50 shadow-xl rounded-xl p-4 min-w-[200px] ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                                <p className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2">{label}</p>
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-xs text-gray-600">{entry.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-900">{formatCurrency(entry.value)}</span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between font-bold text-[#333]">
                                   <span className="text-xs">총 기여 매출</span>
                                   <span className="text-sm">{formatCurrency(payload[0].payload.total)}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="영업자 수익" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                        barSize={32}
                        animationBegin={200}
                        animationDuration={1500}
                      />
                      <Bar 
                        dataKey="회사 수익" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        barSize={32}
                        animationBegin={400}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
 
            <Card className="border-none shadow-sm flex flex-col bg-white overflow-hidden">
               <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                  <CardTitle className="text-lg">월별 요약</CardTitle>
               </CardHeader>
               <CardContent className="flex-1 overflow-auto p-0 scrollbar-hide">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500">
                      <tr>
                        <th className="py-3 px-4 text-left">월</th>
                        <th className="py-3 px-4 text-right">수익 합계</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {chartData.map((stat: any, i: number) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="py-3 px-4 font-semibold text-gray-700">{stat.name}</td>
                          <td className="py-3 px-4 text-right">
                             <div className="flex flex-col items-end">
                                <span className="text-blue-600 font-bold">{formatKoreanAmount(stat["영업자 수익"])}</span>
                                <span className="text-emerald-600 text-[10px]">{formatKoreanAmount(stat["회사 수익"])}</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between border-b border-gray-100">
               <div>
                  <CardTitle className="text-lg">연간 상세 데이터 시트</CardTitle>
                  <CardDescription>월별 매출 기여 및 수익 배분 상세</CardDescription>
               </div>
               <div className="h-10 w-10 rounded-xl bg-blue-100/50 flex items-center justify-center text-blue-600">
                  <TrendingUp className="h-5 w-5" />
               </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6 text-center">분석 월</th>
                    <th className="py-3 px-4 text-center">계약 건수</th>
                    <th className="py-3 px-4 text-right">기여 총 매출</th>
                    <th className="py-3 px-4 text-right">회사 수익</th>
                    <th className="py-3 px-4 text-right">영업자 수익</th>
                    <th className="py-3 px-4 text-right bg-blue-50/50">수익 총합</th>
                    <th className="py-3 px-6 text-right">건당 평균 매출</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chartData.map((stat: any, i: number) => {
                    const totalIncome = stat["영업자 수익"] + stat["회사 수익"];
                    const avg = stat.contracts > 0 ? stat.total / stat.contracts : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-center font-bold text-gray-900">{stat.name}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-md bg-gray-100 text-[11px] font-bold">{stat.contracts}건</span>
                        </td>
                        <td className="py-4 px-4 text-right font-medium tabular-nums">{formatCurrency(stat.total)}</td>
                        <td className="py-4 px-4 text-right text-emerald-600 font-medium tabular-nums">{formatCurrency(stat["회사 수익"])}</td>
                        <td className="py-4 px-4 text-right text-blue-600 font-bold tabular-nums">{formatCurrency(stat["영업자 수익"])}</td>
                        <td className="py-4 px-4 text-right font-black bg-blue-50/30 text-gray-900 tabular-nums">{formatCurrency(totalIncome)}</td>
                        <td className="py-4 px-6 text-right text-gray-400 text-xs tabular-nums">{formatCurrency(Math.round(avg))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-900 text-white font-bold">
                  <tr>
                    <td className="py-4 px-6 text-center">합계</td>
                    <td className="py-4 px-4 text-center">{totals.contractCount}건</td>
                    <td className="py-4 px-4 text-right">{formatCurrency(totals.grossSales)}</td>
                    <td className="py-4 px-4 text-right text-emerald-400">{formatCurrency(totals.netProfit)}</td>
                    <td className="py-4 px-4 text-right text-blue-400">{formatCurrency(totals.finalPayout)}</td>
                    <td className="py-4 px-4 text-right bg-gray-800 text-white">{formatCurrency(totals.netProfit + totals.finalPayout)}</td>
                    <td className="py-4 px-6 text-right text-xs opacity-50">
                      {formatCurrency(Math.round(totals.contractCount > 0 ? totals.grossSales / totals.contractCount : 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
