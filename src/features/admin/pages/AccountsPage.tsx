"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployeesList,
  deleteAccount,
  updateAccountDisabled,
  type EmployeeListItem,
} from "@/features/users/api/account";
import AccountsListPage from "@/features/users/components/_AccountsListPage";
import AccountEditFormModal from "@/features/users/components/_AccountEditFormModal";
import {
  AccountFavoritesModal,
  AccountReservedPinsModal,
} from "@/features/account-favorites";
import type { UserRow, RoleKey } from "@/features/users/types";
import { api } from "@/shared/api/api";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/features/table/components/SearchBar";
// getCredentialIdFromAccountId는 더 이상 사용되지 않습니다.

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [editingPositionRank, setEditingPositionRank] = useState<string | null>(
    null,
  );
  const [viewingFavoritesAccountId, setViewingFavoritesAccountId] = useState<
    string | null
  >(null);
  const [viewingFavoritesAccountName, setViewingFavoritesAccountName] =
    useState<string>("");
  const [viewingReservedPinsAccountId, setViewingReservedPinsAccountId] =
    useState<string | null>(null);
  const [viewingReservedPinsAccountName, setViewingReservedPinsAccountName] =
    useState<string>("");

  // 검색 및 정렬 상태
  const [searchNameInput, setSearchNameInput] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<"name" | "rank" | null>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // 검색어 debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchName(searchNameInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchNameInput]);

  // 정렬 핸들러
  const handleSort = (
    column: "name" | "rank" | null,
    direction: "asc" | "desc",
  ) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // 백엔드 API용 sort 값 (null이면 rank 사용)
  const apiSort = sortColumn || "rank";

  // 계정 목록 조회 (새로운 API 사용)
  const {
    data: employeesList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees-list", apiSort, searchName],
    queryFn: () =>
      getEmployeesList({ sort: apiSort, name: searchName || undefined }),
  });

  // 계정 비활성화 토글 (optimistic update)
  const toggleAccountMutation = useMutation({
    mutationFn: async ({
      credentialId,
      disabled,
    }: { credentialId: string; disabled: boolean }) => {
      return await updateAccountDisabled(credentialId, disabled);
    },
    // Optimistically update the cached list
    onMutate: async ({ credentialId, disabled }) => {
      const targetIdStr = String(credentialId);
      console.log(`[Mutation] 계정 상태 토글 시작: id=${targetIdStr}, targetDisabled=${disabled}`);
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["employees-list"] });

      // Snapshot the previous value for all matching queries
      const queryKeyPrefix = ["employees-list"];
      const previousQueriesData = queryClient.getQueriesData<EmployeeListItem[]>({ queryKey: queryKeyPrefix });

      // Optimistically update all matching queries
      queryClient.setQueriesData<EmployeeListItem[]>(
        { queryKey: queryKeyPrefix },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((item) =>
            String(item.credentialId) === targetIdStr
              ? { ...item, isDisabled: disabled }
              : item
          );
        }
      );

      return { previousQueriesData };
    },
    onError: (error: any, variables, context: any) => {
      console.error("[Mutation] 계정 상태 토글 실패:", error);
      // Rollback to previous data on error
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([key, data]: [any, any]) => {
          queryClient.setQueryData(key, data);
        });
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || "알 수 없는 오류가 발생했습니다.";
      
      toast({
        title: "계정 상태 변경 실패",
        description: `사유: ${errorMessage}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      toast({
        title: "계정 상태 변경 완료",
        description: "계정 상태가 성공적으로 변경되었습니다.",
      });
    },
  });

  // 계정 가삭제 (Soft Delete)
  const deleteAccountMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      return await deleteAccount(credentialId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      toast({
        title: "계정 삭제 완료",
        description: "계정이 목록에서 제거되었습니다. (가삭제)",
      });
    },
    onError: (error: any) => {
      toast({
        title: "계정 삭제 실패",
        description:
          error?.response?.data?.message || "계정 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 백엔드 응답을 UserRow 형식으로 변환
  const transformToUserRows = (employees: EmployeeListItem[]): UserRow[] => {
    return employees.map((employee) => {
      // 디버깅 로그 추가: 특정 계정의 상태 확인
      if (employee.credentialId === "8" || String(employee.credentialId) === "8") {
        console.log(`[Transform] 계정 8 발견, isDisabled=${employee.isDisabled}`);
      }
      return {
        id: employee.accountId, // accountId를 id로 사용
        credentialId: String(employee.credentialId), // 확실히 문자열로 변환
        name: employee.name || "이름 없음",
        phone: employee.phone || undefined,
        positionRank: employee.positionRank || undefined,
        photo_url: employee.profileUrl || undefined,
        teamName: employee.teamName || undefined,
        favoritePins: employee.favoritePins || [], // 계정별 즐겨찾기 핀 목록 포함
        reservedPinDrafts: employee.reservedPinDrafts || [], // 계정별 예약한 핀 목록 포함
        role: employee.role, // role 정보 포함
        disabled: !!employee.isDisabled, // 확실히 불리언으로 변환
      };
    });
  };

  const userRows = useMemo(() => {
    if (!employeesList) return [];
    let rows = transformToUserRows(employeesList);

    // 내림차순일 때 배열 뒤집기 (백엔드는 항상 오름차순으로 반환)
    if (sortDirection === "desc") {
      rows = [...rows].reverse();
    }

    return rows;
  }, [employeesList, sortDirection]);

  // 계정 가삭제 핸들러
  const handleRemove = async (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    const credentialId = account?.credentialId;

    if (!credentialId) {
      toast({
        title: "오류",
        description: "계정 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    deleteAccountMutation.mutate(credentialId);
  };

  // 활성/비활성 토글 핸들러
  const handleToggleStatus = (accountId: string, currentDisabled: boolean) => {
    const account = userRows.find((row) => row.id === accountId);
    const credentialId = account?.credentialId;

    if (!credentialId) {
      toast({
        title: "오류",
        description: "계정 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    toggleAccountMutation.mutate({
      credentialId,
      disabled: !currentDisabled,
    });
  };

  // 역할 변경 핸들러 (현재는 사용하지 않지만 Props에 필요)
  const handleChangeRole = (id: string, role: RoleKey) => {
    // TODO: 역할 변경 기능이 필요하면 구현
    console.log("역할 변경:", { id, role });
  };

  // 계정 수정 핸들러
  const handleEdit = async (accountId: string) => {
    // userRows에서 해당 계정 찾기
    const account = userRows.find((row) => row.id === accountId);
    const positionRank = account?.positionRank || null;
    const credentialId = account?.credentialId;

    if (!credentialId) {
      toast({
        title: "오류",
        description: "계정 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    setEditingCredentialId(credentialId);
    setEditingPositionRank(positionRank);
  };

  // 수정 완료 핸들러
  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employees-list"] });
    setEditingCredentialId(null);
    setEditingPositionRank(null);
  };

  // 즐겨찾기 목록 보기 핸들러
  const handleViewFavorites = (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    setViewingFavoritesAccountId(accountId);
    setViewingFavoritesAccountName(account?.name || "");
  };

  // 예약한 핀 목록 보기 핸들러
  const handleViewReservedPins = (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    setViewingReservedPinsAccountId(accountId);
    setViewingReservedPinsAccountName(account?.name || "");
  };

  // 현재 보고 있는 계정의 favoritePins 가져오기
  const viewingAccountFavorites = useMemo(() => {
    if (!viewingFavoritesAccountId) return null;
    const account = userRows.find(
      (row) => row.id === viewingFavoritesAccountId,
    );
    return account?.favoritePins || [];
  }, [viewingFavoritesAccountId, userRows]);

  // 현재 보고 있는 계정의 reservedPinDrafts 가져오기
  const viewingAccountReservedPins = useMemo(() => {
    if (!viewingReservedPinsAccountId) return null;
    const account = userRows.find(
      (row) => row.id === viewingReservedPinsAccountId,
    );
    return account?.reservedPinDrafts || [];
  }, [viewingReservedPinsAccountId, userRows]);

  // 즐겨찾기 모달 닫기
  const handleCloseFavoritesModal = () => {
    setViewingFavoritesAccountId(null);
    setViewingFavoritesAccountName("");
  };

  // 예약한 핀 모달 닫기
  const handleCloseReservedPinsModal = () => {
    setViewingReservedPinsAccountId(null);
    setViewingReservedPinsAccountName("");
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">계정 목록</h1>
        <p className="text-sm text-muted-foreground">
          등록된 모든 계정을 조회하고 관리합니다.
        </p>
      </header>

      {/* 검색 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full sm:max-w-md">
          <SearchBar
            value={searchNameInput}
            onChange={setSearchNameInput}
            placeholder="이름으로 검색..."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          계정 목록을 불러오는 중 오류가 발생했습니다.
        </div>
      )}

      <div className="p-1 pb-8">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <AccountsListPage
            rows={userRows}
            onChangeRole={handleChangeRole}
            onRemove={handleRemove}
            onToggleStatus={handleToggleStatus}
            onEdit={handleEdit}
            onViewFavorites={handleViewFavorites}
            onViewReservedPins={handleViewReservedPins}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </div>

      {/* 계정 수정 모달 */}
      {editingCredentialId && (
        <AccountEditFormModal
          open={true}
          credentialId={editingCredentialId}
          positionRank={editingPositionRank}
          onClose={() => {
            setEditingCredentialId(null);
            setEditingPositionRank(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 즐겨찾기 목록 모달 */}
      <AccountFavoritesModal
        open={!!viewingFavoritesAccountId}
        accountId={viewingFavoritesAccountId}
        accountName={viewingFavoritesAccountName}
        favoritePins={viewingAccountFavorites || []}
        onClose={handleCloseFavoritesModal}
      />

      {/* 예약한 핀 목록 모달 */}
      <AccountReservedPinsModal
        open={!!viewingReservedPinsAccountId}
        accountId={viewingReservedPinsAccountId}
        accountName={viewingReservedPinsAccountName}
        reservedPinDrafts={viewingAccountReservedPins || []}
        onClose={handleCloseReservedPinsModal}
      />
    </div>
  );
}
