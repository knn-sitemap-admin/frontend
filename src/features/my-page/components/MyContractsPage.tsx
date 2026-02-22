"use client";

import React, { useCallback } from "react";
import { ContractList } from "@/features/contract-list";
import type { ContractData } from "@/components/contract-management/types";
import { getMyContracts } from "@/features/contract-records/api/contracts";
import { transformMyContractListItemToContractData } from "@/features/contract-records/utils/contractTransformers";
import { paginationConfig } from "@/components/contract-management/utils/tableConfig";

export function MyContractsPage() {
  const loadContracts = useCallback(
    async (page: number): Promise<{
      items: ContractData[];
      total: number;
    }> => {
      const contractData = await getMyContracts({
        page,
        size: paginationConfig.listsPerPage,
      });

      return {
        items: contractData.items.map(
          transformMyContractListItemToContractData
        ),
        total: contractData.total,
      };
    },
    []
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
