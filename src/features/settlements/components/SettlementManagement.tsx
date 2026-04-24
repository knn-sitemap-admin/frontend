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
import { getSettlements, saveSettlement, updateSettlementStatus, getSettlementDetail } from "../api/settlement";
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

  // 상세 내역 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);

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

  // 상세 정산 내역 조회
  const { data: detailData = [], isLoading: isLoadingDetail } = useQuery({
    queryKey: ["settlement-detail", detailTarget?.accountId, selectedYear, selectedMonth],
    queryFn: () => getSettlementDetail(detailTarget?.accountId, parseInt(selectedYear), parseInt(selectedMonth)),
    enabled: !!detailTarget && detailModalOpen,
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

  // 지급 취소 (대기 상태로 전환)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending" | "paid" }) =>
      updateSettlementStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast({ title: "지급 취소 완료", description: "정산 상태가 대기 중으로 변경되었으며 가계부 내역이 삭제되었습니다." });
    },
  });

  // 지급 취소 확인 모달 상태
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [revertTarget, setRevertTarget] = useState<any>(null);

  const handleRevertPayment = (row: any) => {
    setRevertTarget(row);
    setRevertConfirmOpen(true);
  };

  const confirmRevertPayment = () => {
    if (revertTarget) {
      statusMutation.mutate({ id: revertTarget.id, status: "pending" });
      setRevertConfirmOpen(false);
    }
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
        <Table
          data={filteredData}
          className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] shadow-sm overflow-visible"
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
                    {row.status === "paid" ? "내용 수정" : "정산 확정"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>

                  {/* 상세 보기 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-all"
                    onClick={() => {
                      setDetailTarget(row);
                      setDetailModalOpen(true);
                    }}
                    title="실적 상세 보기"
                  >
                    <AlertCircle size={14} />
                    <span className="text-[11px] font-bold">상세</span>
                  </Button>

                  {/* 지급 취소 버튼 (지급 완료 상태일 때만) */}
                  {row.status === "paid" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all"
                      onClick={() => handleRevertPayment(row)}
                      title="지급 취소 (대기전환)"
                    >
                      <RefreshCw size={14} />
                      <span className="text-[11px] font-bold">취소</span>
                    </Button>
                  )}
                </div>
              )
            },
          ]}
          loading={isLoading}
          emptyMessage="정산 대상자가 없습니다."
        />
      </DataTableSection>

      {/* 실적 상세 내역 모달 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl rounded-[32px] border-none shadow-2xl backdrop-blur-xl bg-white/90">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600" /> {detailTarget?.name}님 상세 실적 내역
              <span className="text-sm font-normal text-gray-500 ml-2">{selectedYear}년 {selectedMonth}월</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold">계약일</th>
                    <th className="px-4 py-3 font-bold">매물명</th>
                    <th className="px-4 py-3 font-bold text-right">총 매출</th>
                    <th className="px-4 py-3 font-bold text-center">지분</th>
                    <th className="px-4 py-3 font-bold text-right">정산금</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {isLoadingDetail ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">데이터를 불러오는 중...</td>
                    </tr>
                  ) : detailData.length > 0 ? (
                    detailData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.contractDate}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{row.propertyName}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.grandTotal)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {row.sharePercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-blue-600">{formatCurrency(row.myAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">해당 기간의 실적 데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
                {detailData.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-right text-gray-900">합계</td>
                      <td className="px-4 py-4 text-right text-blue-700 text-lg">
                        {formatCurrency(detailData.reduce((acc: number, cur: any) => acc + cur.myAmount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDetailModalOpen(false)} className="rounded-xl w-full h-12 bg-gray-900 hover:bg-black text-white font-bold">닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 지급 취소 확인 모달 */}
      <Dialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl backdrop-blur-xl bg-white/90">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <RefreshCw className="text-red-500" /> 지급 취소 확인
            </DialogTitle>
          </DialogHeader>

          <div className="py-8 space-y-4 text-center">
            <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
              <RefreshCw size={40} className="animate-spin-slow" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {revertTarget?.name}님의 지급 처리를 취소하시겠습니까?
              </p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                취소 시 정산 상태가 <span className="text-orange-600 font-bold">미지급(대기)</span>으로 변경되며,<br />
                가계부에 연동된 <span className="text-red-600 font-bold">지출 내역이 자동으로 삭제</span>됩니다.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRevertConfirmOpen(false)} className="rounded-xl h-12 flex-1">아니오, 유지함</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 px-8 flex-1 font-bold shadow-lg shadow-red-500/20"
              onClick={confirmRevertPayment}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? "처리 중..." : "네, 취소하겠습니다"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataTablePageLayout>
  );
}
