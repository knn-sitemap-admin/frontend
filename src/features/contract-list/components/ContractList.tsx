"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Table, SearchBar, processTableData } from "@/features/table";
import type { ContractData } from "@/components/contract-management/types";
import {
  contractTableColumns,
  searchKeys,
  paginationConfig,
} from "@/components/contract-management/utils/tableConfig";
import { getContract, getContractFilterOptions } from "@/features/contract-records/api/contracts";
import { transformContractResponseToSalesContract } from "@/features/contract-records/utils/contractTransformers";
import { SalesContractRecordsModal } from "@/features/contract-records/components/SalesContractRecordsModal";
import type { SalesContractData } from "@/features/contract-records/types/contract-records";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select"; // Corrected import path
import { Button } from "@/components/atoms/Button/Button"; // Import Button component
import { Plus, List, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface ContractListProps {
  title: string;
  /** 급여 컬럼 라벨 (관리자: "회사 입금액", 내 계약: "급여") */
  salaryColumnLabel?: string;
  loadContracts: (
    page: number,
    filters: {
      searchTerm?: string;
      status?: string;
      year?: string;
      month?: string;
    },
  ) =>
    | Promise<{ items: ContractData[]; total: number }>;
  initialLoading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showAddButton?: boolean;
}

export function ContractList({
  title,
  salaryColumnLabel,
  loadContracts: loadContractsFn,
  initialLoading = false,
  searchPlaceholder = "계약번호, 고객명, 담당자로 검색...",
  emptyMessage = "계약이 없습니다.",
  showAddButton = false,
}: ContractListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingContracts, setIsLoadingContracts] = useState(initialLoading);
  const [selectedContract, setSelectedContract] =
    useState<SalesContractData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [yearMonthMap, setYearMonthMap] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // 가용 필터 옵션 로드
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const data = await getContractFilterOptions();
      setYearMonthMap(data);
    };
    fetchFilterOptions();
  }, []);

  // 필터나 검색어가 변경되면 1페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedStatus, searchTerm]);

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedStatus("all");
    setSearchTerm("");
    // currentPage는 useEffect에 의해 자동으로 1로 재설정됩니다.
  };

  // 가용 연도 리스트
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const dbYears = Object.keys(yearMonthMap);
    const years = Array.from(new Set([currentYear, ...dbYears])).sort((a, b) => b.localeCompare(a));
    return ["all", ...years];
  }, [yearMonthMap]);

  // 가용 월 리스트 (선택된 연도 기준)
  const monthOptions = useMemo(() => {
    if (selectedYear === "all") {
      return ["all", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())];
    }
    const availableMonths = yearMonthMap[selectedYear] || [];
    // 데이터가 있는 월들만 정렬하여 반환
    return ["all", ...availableMonths.sort((a, b) => Number(a) - Number(b))];
  }, [yearMonthMap, selectedYear]);

  // 연도 변경 시 선택된 월이 유효한지 체크
  useEffect(() => {
    if (selectedYear !== "all" && selectedMonth !== "all") {
      const availableMonths = yearMonthMap[selectedYear] || [];
      if (!availableMonths.includes(selectedMonth)) {
        setSelectedMonth("all");
      }
    }
  }, [selectedYear, monthOptions]);

  // 계약 목록 로드
  const loadContracts = React.useCallback(async () => {
    try {
      setIsLoadingContracts(true);
      const result = await loadContractsFn(currentPage, {
        searchTerm,
        status: selectedStatus,
        year: selectedYear,
        month: selectedMonth,
      });

      if (result && typeof result === "object" && "items" in result) {
        setContracts(result.items);
        setTotalCount(result.total ?? result.items.length);
      } else {
        const items = result as unknown as ContractData[];
        setContracts(items);
        setTotalCount(items.length);
      }
    } catch (error: any) {
      console.error("계약 목록 로드 실패:", error);
      setContracts([]);
      setTotalCount(0);

      toast({
        title: "계약 목록 로드 실패",
        description: "백엔드 서버를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContracts(false);
    }
  }, [
    loadContractsFn,
    currentPage,
    searchTerm,
    selectedStatus,
    selectedYear,
    selectedMonth,
    toast,
  ]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // 필터 옵션들
  const filterOptions = useMemo(() => {
    return {
      years: yearOptions,
      months: monthOptions,
      statuses: ["all", "ongoing", "completed", "cancelled", "rejected"],
    };
  }, [yearOptions, monthOptions]);

  const { processedData, pagination } = useMemo(() => {
    // API에서 이미 필터링된 결과가 오므로 그대로 사용
    const totalPages = Math.ceil(totalCount / paginationConfig.listsPerPage);

    return {
      processedData: contracts,
      pagination: {
        currentPage,
        totalPages: totalPages || 1,
        listsPerPage: paginationConfig.listsPerPage,
        totalLists: totalCount,
      },
    };
  }, [contracts, currentPage, totalCount]);


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = async (row: ContractData) => {
    try {
      const id = Number(row.backendContractId ?? row.id);
      const contract = await getContract(id);
      const fullData = transformContractResponseToSalesContract(contract);
      setSelectedContract(fullData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("계약 상세 조회 실패:", error);
      toast({
        title: "계약 상세 조회 실패",
        description: "계약 상세 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const statusMap: Record<string, string> = {
    rejected: "부결",
    ongoing: "계약중",
    completed: "계약완료",
    cancelled: "해약",
  };
  return (
    <>
      <div className="mx-auto max-w-[1600px] p-6 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="년도" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year === "all" ? "전체 년도" : `${year}년`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[100px]">
                <SelectValue placeholder="월" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month === "all" ? "전체 월" : `${month}월`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="계약 상태" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all"
                      ? "전체 상태"
                      : statusMap[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-full sm:max-w-xs">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={searchPlaceholder}
              />
            </div>
            {/* 필터 초기화 버튼 */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full sm:w-auto"
            >
              필터 초기화
            </Button>
            {showAddButton && (
              <Button
                onClick={() => {
                  setSelectedContract(null);
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto ml-0 sm:ml-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                신규 계약
              </Button>
            )}
          </div>
        </div>

        <Table
          data={processedData}
          columns={
            salaryColumnLabel
              ? contractTableColumns.map((col) =>
                col.key === "salesPersonSalary"
                  ? { ...col, label: salaryColumnLabel }
                  : col
              )
              : contractTableColumns
          }
          pagination={pagination}
          loading={isLoadingContracts}
          emptyMessage={emptyMessage}
          onPageChange={handlePageChange}
          onRowClick={handleRowClick}
        />
      </div>

      <SalesContractRecordsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContract(null);
        }}
        data={selectedContract ?? undefined}
        onDataChange={() => {
          loadContracts();
        }}
      />
    </>
  );
}
