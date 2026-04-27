"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DataTablePageLayout,
  DataTablePageHeader,
  StatCard,
  StatCardsGrid,
  CardWithTable,
  TableScrollWrapper,
  PeriodFilters,
  getPeriodLabel,
  YearlyStatusSection,
} from "@/features/data-table";
import { Table, Pagination, SearchBar } from "@/features/table";
import { Button } from "@/components/atoms/Button/Button";
import { Wallet, Calendar, Plus, Search, PieChart, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";
import {
  getExpenseSummary,
  getExpenseList,
  createExpense,
  updateExpense,
  deleteExpense,
  getYearlyExpenseStats,
  type ExpenseItem,
} from "../api/expense";
import { ExpenseAddModal, type ExpenseFormData } from "./ExpenseAddModal";
import {
  buildExpenseFilterQuery,
  filterExpenseByPeriod,
} from "../utils/expenseUtils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/atoms/Skeleton/Skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/atoms/Card/Card";

export function Expense() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseFormData | (ExpenseFormData & { id: string }) | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const currentMonth = new Date().getMonth() + 1;

  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  const { data: expenseList = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["expense-list"],
    queryFn: () => getExpenseList({ period: "all" }),
  });

  // 데이터가 존재하는 연도 옵션 추출
  const yearOptions = useMemo(() => {
    if (!expenseList.length) return [currentYear.toString()];
    const years = new Set<string>();
    years.add(currentYear.toString());
    expenseList.forEach((item) => {
      const year = item.date?.split("-")[0];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [expenseList, currentYear]);

  // 선택된 연도에 데이터가 존재하는 월 옵션 추출
  const monthOptions = useMemo(() => {
    if (!expenseList.length) return Array.from({ length: 12 }, (_, i) => String(i + 1));
    const months = new Set<string>();
    expenseList.forEach((item) => {
      const parts = item.date?.split("-");
      if (parts && parts[0] === selectedYear) {
        months.add(String(parseInt(parts[1], 10)));
      }
    });
    if (months.size === 0) return Array.from({ length: 12 }, (_, i) => String(i + 1));
    return Array.from(months).sort((a, b) => Number(a) - Number(b));
  }, [expenseList, selectedYear]);

  useEffect(() => {
    if (selectedMonth !== "all") {
      if (!monthOptions.includes(selectedMonth)) {
        setSelectedMonth("all");
      }
    }
  }, [selectedYear, monthOptions]);

  const quarterOptions = ["1", "2", "3", "4"];

  const filterQuery = useMemo(
    () => buildExpenseFilterQuery(selectedPeriod, selectedYear, selectedQuarter, selectedMonth),
    [selectedPeriod, selectedYear, selectedQuarter, selectedMonth]
  );

  const periodLabel = useMemo(
    () => getPeriodLabel(selectedPeriod, selectedYear, selectedQuarter, selectedMonth),
    [selectedPeriod, selectedYear, selectedQuarter, selectedMonth]
  );

  const { data: expenseSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["expense-summary", filterQuery],
    queryFn: () => getExpenseSummary(filterQuery),
  });

  const yearlyData = useMemo(() => {
    const stats: Record<number, { month: number; totalAmount: number }> = {};
    expenseList.forEach((item) => {
      const parts = item.date?.split(/[-/.]/);
      if (parts && parts[0] === selectedYear) {
        const m = parseInt(parts[1], 10);
        if (!stats[m]) stats[m] = { month: m, totalAmount: 0 };
        stats[m].totalAmount += item.amount;
      }
    });
    return Object.values(stats);
  }, [expenseList, selectedYear]);

  const filteredByPeriod = useMemo(
    () => filterExpenseByPeriod(expenseList, filterQuery),
    [expenseList, filterQuery]
  );

  const filteredAndSearchedList = useMemo(() => {
    if (!searchTerm) return filteredByPeriod;
    const lowerSearch = searchTerm.toLowerCase();
    return filteredByPeriod.filter(
      (item) =>
        item.itemName.toLowerCase().includes(lowerSearch) ||
        item.memo.toLowerCase().includes(lowerSearch)
    );
  }, [filteredByPeriod, searchTerm]);

  // 카테고리별 통계 데이터
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    filteredAndSearchedList.forEach((item) => {
      const cat = item.itemName.split(":")[0]; // 품목명에서 카테고리 추출 (예: "식비: 점심" -> "식비")
      if (!stats[cat]) stats[cat] = { count: 0, total: 0 };
      stats[cat].count += 1;
      stats[cat].total += item.amount;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAndSearchedList]);

  // 페이지네이션 처리
  const totalCount = filteredAndSearchedList.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSearchedList.slice(start, start + pageSize);
  }, [filteredAndSearchedList, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterQuery]);

  const { mutate: createMutate } = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense-list"] });
      toast({ title: "지출 등록 완료", description: "지출 내역이 성공적으로 등록되었습니다." });
    },
  });

  const { mutate: updateMutate } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense-list"] });
      toast({ title: "지출 수정 완료", description: "지출 내역이 성공적으로 수정되었습니다." });
    },
  });

  const { mutate: deleteMutate } = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense-list"] });
      toast({ title: "삭제 완료", description: "지출 내역이 삭제되었습니다." });
    },
  });

  const handleAddExpense = async (data: ExpenseFormData) => {
    if (editingItem && "id" in editingItem) {
      updateMutate({ id: editingItem.id, data });
    } else {
      createMutate(data);
    }
    setAddModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      deleteMutate(id);
    }
  };

  const previousMonthAmount = expenseSummary?.previousMonthAmount ?? 0;
  const currentMonthAmount = expenseSummary?.currentMonthAmount ?? 0;

  return (
    <DataTablePageLayout>
      <DataTablePageHeader
        title="가계부"
        description="지출 내역 및 운영 비용 관리"
        periodLabel={periodLabel}
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
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StatCardsGrid title="지출 요약" columns={selectedPeriod === "all" ? 1 : 2}>
            {selectedPeriod !== "all" && (
              <StatCard
                label={selectedPeriod === "yearly" ? "전년 지출액" : selectedPeriod === "quarter" ? "전 분기 지출액" : "전월 지출액"}
                value={formatCurrency(previousMonthAmount)}
                icon={<Calendar className="h-6 w-6" />}
                variant="blue"
              />
            )}
            <StatCard
              label={selectedPeriod === "all" ? "총 지출액" : selectedPeriod === "yearly" ? "해당 연도 지출액" : selectedPeriod === "quarter" ? "해당 분기 지출액" : "당월 지출액"}
              value={formatCurrency(currentMonthAmount)}
              icon={<Wallet className="h-6 w-6" />}
              variant="green"
            />
          </StatCardsGrid>

          <CardWithTable
            title="상세 지출 내역"
            headerActions={
              <div className="flex items-center gap-2">
                <SearchBar
                  placeholder="품목명, 메모 검색..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                  className="w-64"
                />
                <Button onClick={() => { setEditingItem(null); setAddModalOpen(true); }}>
                  <Plus className="h-4 w-4" /> 새로 만들기
                </Button>
              </div>
            }
          >
            <TableScrollWrapper>
              {isLoadingList ? (
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <Table
                    data={paginatedList}
                    columns={[
                      { key: "date", label: "날짜", sortable: true, width: "12%" },
                      { key: "itemName", label: "품목명", sortable: true, width: "20%" },
                      {
                        key: "amount",
                        label: "금액",
                        sortable: true,
                        width: "15%",
                        render: (value) => <span className="font-bold text-gray-900">{formatCurrency(value)}</span>,
                      },
                      { key: "memo", label: "메모", sortable: false, width: "38%", render: (v) => <span className="text-gray-500 text-sm line-clamp-1">{v}</span> },
                      {
                        key: "actions",
                        label: "관리",
                        width: "15%",
                        render: (_, item: any) => (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="text-blue-500 h-8 px-2" onClick={() => { setEditingItem(item); setAddModalOpen(true); }}>수정</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 h-8 px-2" onClick={() => handleDeleteExpense(item.id)}>삭제</Button>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage={searchTerm ? "검색 결과가 없습니다." : "등록된 지출 내역이 없습니다."}
                  />
                  <div className="p-4 border-t border-gray-50 bg-gray-50/30">
                    <Pagination
                      pagination={{
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalLists: totalCount,
                        listsPerPage: pageSize,
                      }}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              )}
            </TableScrollWrapper>
          </CardWithTable>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl bg-white/70 backdrop-blur-md overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                <PieChart className="text-blue-500" size={20} /> 지출 카테고리별 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-4">
                {categoryStats.length > 0 ? (
                  categoryStats.map((stat, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-end mb-1.5">
                        <div>
                          <span className="text-sm font-bold text-gray-900">{stat.name}</span>
                          <span className="text-[10px] text-gray-400 ml-2">{stat.count}건</span>
                        </div>
                        <span className="text-sm font-black text-gray-900">{formatCurrency(stat.total)}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 group-hover:bg-blue-600"
                          style={{ width: `${(stat.total / currentMonthAmount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <TrendingDown size={48} className="mb-2 opacity-20" />
                    <p className="text-sm">통계를 표시할 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseAddModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddExpense}
        initialData={editingItem}
      />

      <YearlyStatusSection 
        title="지출 현황"
        year={parseInt(selectedYear)}
        data={yearlyData}
        type="expense"
      />
    </DataTablePageLayout>
  );
}
