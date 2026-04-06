"use client";

import React, { useCallback } from "react";
import { ContractList } from "@/features/contract-list";
import type { ContractData } from "@/components/contract-management/types";
import { getMyContracts } from "@/features/contract-records/api/contracts";
import { transformMyContractListItemToContractData } from "@/features/contract-records/utils/contractTransformers";
import { paginationConfig } from "@/components/contract-management/utils/tableConfig";

export function MyContractsPage() {
  const loadContracts = useCallback(
    async (
      page: number,
      filters: {
        searchTerm?: string;
        status?: string;
        year?: string;
        month?: string;
      },
    ): Promise<{
      items: ContractData[];
      total: number;
    }> => {
      // 년도/월 필터를 dateFrom, dateTo로 변환
      let dateFrom: string | undefined;
      let dateTo: string | undefined;

      if (filters.year && filters.year !== "all") {
        const year = filters.year;
        if (filters.month && filters.month !== "all") {
          const month = filters.month.padStart(2, "0");
          dateFrom = `${year}-${month}-01`;
          const nextMonth = new Date(Number(year), Number(month), 1);
          const lastDay = new Date(nextMonth.getTime() - 86400000);
          dateTo = `${year}-${month}-${String(lastDay.getDate()).padStart(
            2,
            "0",
          )}`;
        } else {
          dateFrom = `${year}-01-01`;
          dateTo = `${year}-12-31`;
        }
      }

      // 상태값 매핑 (UI -> API)
      const statusMap: Record<string, string> = {
        ongoing: "ongoing",
        completed: "done",
        cancelled: "canceled",
        rejected: "rejected",
      };
      const apiStatus = filters.status && filters.status !== "all" 
        ? (statusMap[filters.status] as any) 
        : undefined;

      const contractData = await getMyContracts({
        page,
        size: paginationConfig.listsPerPage,
        q: filters.searchTerm,
        status: apiStatus,
        dateFrom,
        dateTo,
      });

      return {
        items: contractData.items.map(
          transformMyContractListItemToContractData,
        ),
        total: contractData.total,
      };
    },
    [],
  );

  return (
    <ContractList
      title="내 계약"
      loadContracts={loadContracts}
      initialLoading={false}
      showAddButton={true}
    />
  );
}
