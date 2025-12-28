"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployeesList,
  type EmployeeListItem,
} from "@/features/users/api/account";
import AccountsListPage from "@/features/users/components/_AccountsListPage";
import AccountEditFormModal from "@/features/users/components/_AccountEditFormModal";
import { AccountFavoritesModal } from "@/features/account-favorites";
import type { UserRow, RoleKey } from "@/features/users/types";
import { api } from "@/shared/api/api";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/features/table/components/SearchBar";
import { getCredentialIdFromAccountId } from "@/features/users/api/account";

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null
  );
  const [viewingFavoritesAccountId, setViewingFavoritesAccountId] = useState<
    string | null
  >(null);
  const [viewingFavoritesAccountName, setViewingFavoritesAccountName] =
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
    direction: "asc" | "desc"
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

  // 계정 비활성화
  const disableAccountMutation = useMutation({
    mutationFn: async ({
      credentialId,
      disabled,
    }: {
      credentialId: string;
      disabled: boolean;
    }) => {
      const response = await api.patch<{
        message: string;
        data: { id: string };
      }>(`/dashboard/accounts/credentials/${credentialId}/disable`, {
        disabled,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      toast({
        title: "계정 상태 변경 완료",
        description: "계정 상태가 성공적으로 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "계정 상태 변경 실패",
        description:
          error?.response?.data?.message ||
          "계정 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 백엔드 응답을 UserRow 형식으로 변환
  const transformToUserRows = (employees: EmployeeListItem[]): UserRow[] => {
    return employees.map((employee) => {
      return {
        id: employee.accountId, // accountId를 id로 사용
        name: employee.name || "이름 없음",
        phone: employee.phone || undefined,
        positionRank: employee.positionRank || undefined,
        photo_url: employee.profileUrl || undefined,
        teamName: employee.teamName || undefined,
      };
    });
  };

  // accountId -> credentialId 매핑 캐시
  const credentialIdMapRef = React.useRef<Map<string, string>>(new Map());
  const loadingCredentialIdsRef = React.useRef<Set<string>>(new Set());

  // 계정 목록이 변경될 때 credentialId 매핑 미리 로드 (선택적)
  // 주의: 이 함수는 비효율적이므로 필요할 때만 호출하도록 개선 가능
  // 현재는 수정/삭제 클릭 시에만 credentialId를 조회하도록 함

  const userRows = useMemo(() => {
    if (!employeesList) return [];
    let rows = transformToUserRows(employeesList);

    // 내림차순일 때 배열 뒤집기 (백엔드는 항상 오름차순으로 반환)
    if (sortDirection === "desc") {
      rows = [...rows].reverse();
    }

    return rows;
  }, [employeesList, sortDirection]);

  // 계정 제거/비활성화 핸들러
  const handleRemove = async (accountId: string) => {
    // 캐시에서 credentialId 조회
    let credentialId = credentialIdMapRef.current.get(accountId);

    // 캐시에 없으면 조회 시도
    if (!credentialId && !loadingCredentialIdsRef.current.has(accountId)) {
      loadingCredentialIdsRef.current.add(accountId);
      try {
        const fetchedCredentialId = await getCredentialIdFromAccountId(
          accountId
        );
        if (fetchedCredentialId) {
          credentialId = fetchedCredentialId;
          credentialIdMapRef.current.set(accountId, fetchedCredentialId);
        }
      } catch (error) {
        console.error("credentialId 조회 실패:", error);
      } finally {
        loadingCredentialIdsRef.current.delete(accountId);
      }
    }

    if (!credentialId) {
      toast({
        title: "오류",
        description: "계정 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        "해당 계정을 비활성화하시겠습니까? 비활성화된 계정은 로그인할 수 없습니다."
      )
    ) {
      disableAccountMutation.mutate({
        credentialId,
        disabled: true,
      });
    }
  };

  // 역할 변경 핸들러 (현재는 사용하지 않지만 Props에 필요)
  const handleChangeRole = (id: string, role: RoleKey) => {
    // TODO: 역할 변경 기능이 필요하면 구현
    console.log("역할 변경:", { id, role });
  };

  // 계정 수정 핸들러
  const handleEdit = async (accountId: string) => {
    // 캐시에서 credentialId 조회
    let credentialId = credentialIdMapRef.current.get(accountId);

    // 캐시에 없으면 조회 시도
    if (!credentialId && !loadingCredentialIdsRef.current.has(accountId)) {
      loadingCredentialIdsRef.current.add(accountId);
      try {
        const fetchedCredentialId = await getCredentialIdFromAccountId(
          accountId
        );
        if (fetchedCredentialId) {
          credentialId = fetchedCredentialId;
          credentialIdMapRef.current.set(accountId, fetchedCredentialId);
        }
      } catch (error) {
        console.error("credentialId 조회 실패:", error);
      } finally {
        loadingCredentialIdsRef.current.delete(accountId);
      }
    }

    if (!credentialId) {
      toast({
        title: "오류",
        description: "계정 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    setEditingCredentialId(credentialId);
  };

  // 수정 완료 핸들러
  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employees-list"] });
    setEditingCredentialId(null);
  };

  // 즐겨찾기 목록 보기 핸들러
  const handleViewFavorites = (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    setViewingFavoritesAccountId(accountId);
    setViewingFavoritesAccountName(account?.name || "");
  };

  // 즐겨찾기 모달 닫기
  const handleCloseFavoritesModal = () => {
    setViewingFavoritesAccountId(null);
    setViewingFavoritesAccountName("");
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
            onEdit={handleEdit}
            onViewFavorites={handleViewFavorites}
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
          onClose={() => setEditingCredentialId(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 즐겨찾기 목록 모달 */}
      <AccountFavoritesModal
        open={!!viewingFavoritesAccountId}
        accountId={viewingFavoritesAccountId}
        accountName={viewingFavoritesAccountName}
        onClose={handleCloseFavoritesModal}
      />
    </div>
  );
}
