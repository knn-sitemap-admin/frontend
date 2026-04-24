"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DataTablePageLayout,
  DataTablePageHeader,
  StatCard,
  StatCardsGrid,
  DataTableSection,
  PeriodFilters,
} from "@/features/data-table";
import { Table } from "@/features/table";
import { Button } from "@/components/atoms/Button/Button";
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Search,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  Edit3,
  Users
} from "lucide-react";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";
import { cn } from "@/lib/cn";
import { getAvailablePeriods } from "@/features/performances/api/performance";
import { getSettlements, saveSettlement, updateSettlementStatus } from "../api/settlement";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/atoms/Dialog/Dialog";

export function SettlementManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [searchTerm, setSearchTerm] = useState("");

  // 정산 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [adjustment, setAdjustment] = useState(0);
  const [memo, setMemo] = useState("");

  // 가용 기간 데이터 조회
  const { data: periods } = useQuery({
    queryKey: ["available-periods"],
    queryFn: getAvailablePeriods,
  });

  // 정산 데이터 조회
  const { data: settlements = [], isLoading, refetch } = useQuery({
    queryKey: ["settlements", selectedYear, selectedMonth],
    queryFn: () => getSettlements(parseInt(selectedYear), parseInt(selectedMonth)),
  });

  const yearOptions = useMemo(() => {
    return (periods?.years || [currentYear]).map(y => y.toString());
  }, [periods, currentYear]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  }, []);

  const filteredData = useMemo(() => {
    if (!Array.isArray(settlements)) return [];
    return settlements.filter((s: any) => 
      (s.name || "").includes(searchTerm) || (s.positionRank || "").includes(searchTerm)
    );
  }, [settlements, searchTerm]);

  const totals = useMemo(() => {
    if (!Array.isArray(settlements)) return { total: 0, paid: 0, pending: 0 };
    const total = settlements.reduce((acc: number, curr: any) => acc + curr.finalAmount, 0);
    const paid = settlements.filter((s: any) => s.status === "paid").reduce((acc: number, curr: any) => acc + curr.finalAmount, 0);
    return { total, paid, pending: total - paid };
  }, [settlements]);

  // 정산 저장 mutation
  const saveMutation = useMutation({
    mutationFn: saveSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast({ title: "정산 완료", description: "정산 내역이 성공적으로 저장되었습니다." });
      setIsModalOpen(false);
    },
  });

  const handleOpenSettlement = (emp: any) => {
    setSelectedEmp(emp);
    setAdjustment(emp.adjustmentAmount || 0);
    setMemo(emp.memo || "");
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    saveMutation.mutate({
      accountId: selectedEmp.accountId,
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      adjustmentAmount: adjustment,
      memo: memo,
      status: "paid"
    });
  };

  return (
    <DataTablePageLayout>
      <DataTablePageHeader
        title="정산 관리"
        description="영업자별 월별 실적 정산 및 급여 지급 관리"
        periodLabel={`${selectedYear}년 ${selectedMonth}월 정산 내역`}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="영업자 검색..."
                className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-md border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <PeriodFilters
              selectedPeriod="monthly"
              selectedYear={selectedYear}
              selectedQuarter="1"
              selectedMonth={selectedMonth}
              yearOptions={yearOptions}
              quarterOptions={["1", "2", "3", "4"]}
              monthOptions={monthOptions}
              onPeriodChange={() => { }}
              onYearChange={(y) => setSelectedYear(y)}
              onQuarterChange={() => { }}
              onMonthChange={(m) => setSelectedMonth(m)}
              hidePeriodType={true}
            />
            <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        }
      />

      <StatCardsGrid title="정산 요약" columns={4}>
        <StatCard
          label="총 정산 예정액"
          value={formatCurrency(totals.total)}
          icon={<DollarSign className="h-6 w-6" />}
          variant="blue"
        />
        <StatCard
          label="지급 완료액"
          value={formatCurrency(totals.paid)}
          valueClassName="text-green-600"
          icon={<CheckCircle2 className="h-6 w-6" />}
          variant="green"
        />
        <StatCard
          label="미지급 잔액"
          value={formatCurrency(totals.pending)}
          valueClassName="text-orange-600"
          icon={<AlertCircle className="h-6 w-6" />}
          variant="orange"
        />
        <StatCard
          label="정산 대상 인원"
          value={`${settlements.length}명`}
          icon={<Users className="h-6 w-6" />}
          variant="purple"
        />
      </StatCardsGrid>

      <DataTableSection
        title="영업자별 정산 목록"
        description="월별 실적 기반 정산 금액 확인 및 지급 상태 변경"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] overflow-hidden shadow-sm">
          <Table
            data={filteredData}
            columns={[
              {
                key: "name",
                label: "영업자",
                width: "15%",
                render: (val, row) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                      {val?.[0] || "U"}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{val}</div>
                      <div className="text-[10px] text-gray-500 uppercase">{row.positionRank || "Staff"}</div>
                    </div>
                  </div>
                )
              },
              {
                key: "calculatedAmount",
                label: "계산 정산금",
                width: "15%",
                render: (val) => <span className="font-medium">{formatCurrency(val)}</span>
              },
              {
                key: "adjustmentAmount",
                label: "조정액",
                width: "12%",
                render: (val) => (
                  <span className={cn(
                    "font-bold",
                    val > 0 ? "text-blue-600" : val < 0 ? "text-red-600" : "text-gray-400"
                  )}>
                    {val > 0 ? `+${formatCurrency(val)}` : val < 0 ? `-${formatCurrency(Math.abs(val))}` : "0"}
                  </span>
                )
              },
              {
                key: "finalAmount",
                label: "최종 지급액",
                width: "15%",
                render: (val) => <span className="font-black text-blue-700">{formatCurrency(val)}</span>
              },
              {
                key: "status",
                label: "상태",
                width: "12%",
                render: (val) => (
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
                    val === "paid"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-orange-50 text-orange-700 border-orange-100"
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", val === "paid" ? "bg-green-600" : "bg-orange-600")} />
                    {val === "paid" ? "지급 완료" : "미지급"}
                  </div>
                )
              },
              {
                key: "paidAt",
                label: "지급일",
                width: "15%",
                render: (val) => <span className="text-gray-500 text-xs">{val ? new Date(val).toLocaleDateString() : "-"}</span>
              },
              {
                key: "actions",
                label: "관리",
                width: "16%",
                render: (_, row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenSettlement(row)}
                      className={cn(
                        "h-8 rounded-lg shadow-sm transition-all active:scale-95 group",
                        row.status === "paid" ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {row.status === "paid" ? "수정" : "정산 확정"}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600">
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>
                )
              },
            ]}
            loading={isLoading}
            emptyMessage="정산 대상자가 없습니다."
          />
        </div>
      </DataTableSection>

      {/* 정산 안내 섹션 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-[24px] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">정산 처리 프로세스</h3>
            <p className="text-blue-100/70 text-sm mb-6 leading-relaxed">
              1. 실적 기반 자동 계산 금액 확인<br />
              2. 추가 수당 또는 공제액(식대 등) 입력<br />
              3. 정산 확정 시 '지급 완료' 상태로 변경 및 기록 저장
            </p>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] border border-white/20">데이터 스냅샷 보존</div>
              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] border border-white/20">수동 조정 지원</div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 h-64 w-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-1000" />
        </div>

        <div className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">지급 내역 가계부 연동</h3>
            <p className="text-gray-500 text-sm mb-0 leading-relaxed">
              확정된 정산 내역은 나중에 가계부(지출) 내역으로<br />자동 전환되어 사업 지출 통계에 반영될 예정입니다.
            </p>
          </div>
          <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <CreditCard size={32} />
          </div>
        </div>
      </div>

      {/* 정산 확정 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl backdrop-blur-xl bg-white/90">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">
              {selectedEmp?.name}님 정산 확정
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">실적 계산 금액</span>
                <span className="font-bold">{formatCurrency(selectedEmp?.calculatedAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">조정 금액</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={adjustment}
                    onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-xs text-gray-400">원</span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">최종 지급액</span>
                <span className="text-xl font-black text-blue-600">
                  {formatCurrency(Number(selectedEmp?.calculatedAmount || 0) + Number(adjustment))}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                <Edit3 size={14} /> 메모 (지급 근거 등)
              </label>
              <textarea
                className="w-full h-24 p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                placeholder="예: 인센티브 포함, 식대 공제 등..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12">취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 flex-1 font-bold shadow-lg shadow-blue-500/20"
              onClick={handleConfirm}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "저장 중..." : "정산 완료 및 지급 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataTablePageLayout>
  );
}
