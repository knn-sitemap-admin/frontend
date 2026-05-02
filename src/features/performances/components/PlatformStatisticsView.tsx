"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlatformStatistics,
  getEmployees
} from "../api/performance";
import type {
  PlatformStatisticsResponse,
  PlatformStatItem
} from "../api/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  StatCard,
  StatCardsGrid,
  DataTableSection
} from "@/features/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/atoms/Select/Select";
import { getPositionRankLabel } from "../../users/utils/rankUtils";
import { CheckCircle2, Target, Users, XCircle } from "lucide-react";

interface PlatformStatisticsViewProps {
  filterQuery: any;
}

export function PlatformStatisticsView({ filterQuery }: PlatformStatisticsViewProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // 직원 목록 조회
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: getEmployees,
  });

  // 영업자(staff)만 필터링 (관리자/매니저 제외)
  const salesEmployees = useMemo(() => {
    return employees.filter(emp => emp.role === "staff");
  }, [employees]);

  // 플랫폼 통계 조회 (필터 포함)
  const statsQuery = useMemo(() => ({
    ...filterQuery,
    accountId: selectedStaffId === "all" ? undefined : selectedStaffId
  }), [filterQuery, selectedStaffId]);

  const { data, isLoading } = useQuery<PlatformStatisticsResponse>({
    queryKey: ["platform-statistics", statsQuery],
    queryFn: () => getPlatformStatistics(statsQuery),
  });

  const stats = data?.statistics || [];

  // 요약 데이터 계산
  const summary = useMemo(() => {
    return stats.reduce<{
      total: number;
      contractRecords: number;
      ongoing: number;
      completed: number;
      canceled: number;
      rejected: number;
    }>((acc, curr: PlatformStatItem) => ({
      total: (acc.total || 0) + (curr.totalCount || 0),
      contractRecords: (acc.contractRecords || 0) + (curr.contractCount || 0),
      ongoing: (acc.ongoing || 0) + (curr.ongoingCount || 0),
      completed: (acc.completed || 0) + (curr.completedCount || 0),
      canceled: (acc.canceled || 0) + (curr.canceledCount || 0),
      rejected: (acc.rejected || 0) + (curr.rejectedCount || 0),
    }), { total: 0, contractRecords: 0, ongoing: 0, completed: 0, canceled: 0, rejected: 0 });
  }, [stats]);

  const conversionRate = summary.total > 0
    ? (((summary.completed + (summary.ongoing || 0)) / summary.total) * 100).toFixed(1)
    : "0";

  if (isLoading) {
    return <div className="py-20 text-center text-gray-500">플랫폼 데이터를 분석 중입니다...</div>;
  }

  return (
    <div className="space-y-10">
      {/* 직원 필터 및 요약 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="pl-3 text-sm font-bold text-gray-400">담당자 필터:</span>
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="w-[180px] h-10 border-none bg-transparent hover:bg-gray-50 rounded-xl font-bold focus:ring-0">
              <SelectValue placeholder="직원 선택" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
              <SelectItem value="all" className="font-bold rounded-xl">전체 직원</SelectItem>
              {salesEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} className="font-bold rounded-xl">
                  {emp.name} {emp.positionRank ? `(${getPositionRankLabel(emp.positionRank)})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StatCardsGrid columns={3}>
        <StatCard
          label="총 유입 건수"
          value={`${summary.total.toLocaleString()}건`}
          icon={<Users className="h-6 w-6" />}
          variant="blue"
        />
        <StatCard
          label="계약건"
          value={`${summary.contractRecords.toLocaleString()}건`}
          icon={<Target className="h-6 w-6" />}
          variant="purple"
        />
        <StatCard
          label="계약완료"
          value={`${summary.completed.toLocaleString()}건`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          variant="green"
        />
        <StatCard
          label="미팅 취소"
          value={`${summary.canceled.toLocaleString()}건`}
          icon={<XCircle className="h-6 w-6" />}
          variant="orange"
        />
        <StatCard
          label="계약 부결"
          value={`${summary.rejected.toLocaleString()}건`}
          icon={<XCircle className="h-6 w-6" />}
          variant="red"
        />
        <StatCard
          label="계약 전환율"
          value={`${conversionRate}%`}
          icon={<Target className="h-6 w-6" />}
          variant="indigo"
        />
      </StatCardsGrid>

      {/* 차트 섹션 */}
      <DataTableSection title="플랫폼별 퍼포먼스 분석">
        <div className="h-[400px] w-full bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="platform"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontWeight: 600, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontWeight: 600, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Bar dataKey="contractCount" name="계약건" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="newCount" name="신규" stackId="a" fill="#3b82f6" />
              <Bar dataKey="reCount" name="재미팅" stackId="a" fill="#6366f1" />
              <Bar dataKey="canceledCount" name="미팅취소" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DataTableSection>

      {/* 데이터 테이블 */}
      <DataTableSection title="플랫폼별 상세 수치">
        <div className="overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-sm font-black text-gray-500">플랫폼</th>
                <th className="px-6 py-4 text-sm font-black text-blue-600 text-center">신규</th>
                <th className="px-6 py-4 text-sm font-black text-purple-600 text-center">재미팅</th>
                <th className="px-6 py-4 text-sm font-black text-orange-500 text-center">미팅취소</th>
                <th className="px-6 py-4 text-sm font-black text-purple-600 text-center">계약건</th>
                <th className="px-6 py-4 text-sm font-black text-gray-900 text-right">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.map((row: PlatformStatItem, index: number) => (
                <tr key={`${row.platform}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-gray-900">{row.platform}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-600">{row.newCount}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-600">{row.reCount}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-600">{row.canceledCount}</td>
                  <td className="px-6 py-4 text-center font-bold text-purple-600 bg-purple-50/30">{row.contractCount}</td>
                  <td className="px-6 py-4 text-right font-black text-gray-900">{row.totalCount}</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">
                    해당 기간의 통계 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {stats.length > 0 && (
              <tfoot className="bg-gray-50/80 border-t border-gray-100">
                <tr>
                  <td className="px-6 py-4 font-black text-gray-900">총합</td>
                  <td className="px-6 py-4 text-center font-black text-gray-900">{summary.total}</td>
                  <td className="px-6 py-4" colSpan={1}></td>
                  <td className="px-6 py-4 text-center font-black text-purple-600">{summary.contractRecords}건</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg">
                    {summary.completed}건 성공
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </DataTableSection>
    </div>
  );
}
