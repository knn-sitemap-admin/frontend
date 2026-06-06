"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployeesList,
  deleteAccount,
  updateAccountDisabled,
  updateAccountCanDownloadImage,
  getDeletedAccounts,
  restoreAccount,
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
import { AccountSurveyDetailModal } from "@/features/account-favorites/components/SurveyPerformanceDetailModal";

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [editingPositionRank, setEditingPositionRank] = useState<string | null>(null);

  // 삭제된 계정 목록 조회 Query
  const {
    data: deletedAccountsList,
    isLoading: isDeletedLoading,
    error: deletedError,
  } = useQuery({
    queryKey: ["deleted-employees-list"],
    queryFn: getDeletedAccounts,
    enabled: activeTab === "deleted",
  });

  // 계정 복원 Mutation
  const restoreAccountMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      return await restoreAccount(credentialId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-employees-list"] });
      toast({
        title: "계정 복원 완료",
        description: "계정이 성공적으로 복원되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "계정 복원 실패",
        description: error?.response?.data?.message || "계정 복원 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleRestore = (credentialId: string) => {
    restoreAccountMutation.mutate(credentialId);
  };

  // 즐겨찾기 관련 상태
  const [viewingFavoritesAccountId, setViewingFavoritesAccountId] = useState<string | null>(null);
  const [viewingFavoritesAccountName, setViewingFavoritesAccountName] = useState<string>("");

  // 예약한 핀 관련 상태
  const [viewingReservedPinsAccountId, setViewingReservedPinsAccountId] = useState<string | null>(null);
  const [viewingReservedPinsAccountName, setViewingReservedPinsAccountName] = useState<string>("");

  // 답사 현황 관련 핵심 상태
  const [viewingSurveyPerformanceAccountId, setViewingSurveyPerformanceAccountId] = useState<string | null>(null);
  const [viewingSurveyPerformanceAccountName, setViewingSurveyPerformanceAccountName] = useState<string>("");

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
  const handleSort = (column: "name" | "rank" | null, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const apiSort = sortColumn || "rank";

  // 계정 목록 조회
  const {
    data: employeesList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees-list", apiSort, searchName],
    queryFn: () => getEmployeesList({ sort: apiSort, name: searchName || undefined }),
  });

  // AccountsPage.tsx 내부의 useQuery 부분을 아래 코드로 교체하세요.

  const {
    data: surveyPerformanceResponse,
    isLoading: isSurveyPerformanceLoading
  } = useQuery({
    queryKey: ["survey-performance", viewingSurveyPerformanceAccountId],
    queryFn: async () => {
      if (!viewingSurveyPerformanceAccountId) return [];

      // 🎯 백엔드 새 스펙: /performance/survey/employees/:accountId
      const res = await api.get(`/performance/survey/employees/${viewingSurveyPerformanceAccountId}`);

      // 백엔드 { success: true, data: [...] } 구조에서 배열 데이터 추출
      return res.data?.data ?? [];
    },
    // 계정 목록에서 직원을 클릭해 ID가 셋팅되었을 때만 트리거 (네트워크 낭비 방지)
    enabled: !!viewingSurveyPerformanceAccountId,
  });

  // 계정 비활성화 토글
  const toggleAccountMutation = useMutation({
    mutationFn: async ({ credentialId, disabled }: { credentialId: string; disabled: boolean }) => {
      return await updateAccountDisabled(credentialId, disabled);
    },
    onMutate: async ({ credentialId, disabled }) => {
      const targetIdStr = String(credentialId);
      await queryClient.cancelQueries({ queryKey: ["employees-list"] });
      const queryKeyPrefix = ["employees-list"];
      const previousQueriesData = queryClient.getQueriesData<EmployeeListItem[]>({ queryKey: queryKeyPrefix });

      queryClient.setQueriesData<EmployeeListItem[]>(
        { queryKey: queryKeyPrefix },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((item) =>
            String(item.credentialId) === targetIdStr ? { ...item, isDisabled: disabled } : item
          );
        }
      );
      return { previousQueriesData };
    },
    onError: (error: any, variables, context: any) => {
      console.error("[Mutation] 계정 상태 토글 실패:", error);
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
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      toast({
        title: "계정 상태 변경 완료",
        description: "계정 상태가 성공적으로 변경되었습니다.",
      });
    },
  });

  // 이미지 다운로드 권한 토글 mutation
  const toggleImageDownloadMutation = useMutation({
    mutationFn: async ({ credentialId, canDownload }: { credentialId: string; canDownload: boolean }) => {
      return await updateAccountCanDownloadImage(credentialId, canDownload);
    },
    onMutate: async ({ credentialId, canDownload }) => {
      const targetIdStr = String(credentialId);
      await queryClient.cancelQueries({ queryKey: ["employees-list"] });
      const queryKeyPrefix = ["employees-list"];
      const previousQueriesData = queryClient.getQueriesData<EmployeeListItem[]>({ queryKey: queryKeyPrefix });

      queryClient.setQueriesData<EmployeeListItem[]>(
        { queryKey: queryKeyPrefix },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((item) =>
            String(item.credentialId) === targetIdStr ? { ...item, canDownloadImage: canDownload } : item
          );
        }
      );
      return { previousQueriesData };
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([key, data]: [any, any]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast({
        title: "권한 변경 실패",
        description: error?.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-list"] });
      toast({
        title: "권한 변경 완료",
        description: "이미지 다운로드 권한이 변경되었습니다.",
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
        description: error?.response?.data?.message || "계정 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 백엔드 응답을 UserRow 형식으로 변환
  const transformToUserRows = (employees: EmployeeListItem[]): UserRow[] => {
    return employees.map((employee) => {
      return {
        id: employee.accountId,
        credentialId: String(employee.credentialId),
        name: employee.name || "이름 없음",
        phone: employee.phone || undefined,
        positionRank: employee.positionRank || undefined,
        photo_url: employee.profileUrl || undefined,
        teamName: employee.teamName || undefined,
        favoritePins: employee.favoritePins || [],
        reservedPinDrafts: employee.reservedPinDrafts || [],
        // 💡 목록 조회 시 기본 요약정보 바딩을 유지하기 위한 로직
        surveySummary: (employee as any).surveySummary || { totalCount: 0 },
        role: employee.role,
        disabled: !!employee.isDisabled,
        canDownloadImage: !!employee.canDownloadImage,
      };
    });
  };

  const userRows = useMemo(() => {
    if (!employeesList) return [];
    let rows = transformToUserRows(employeesList);
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
      toast({ title: "오류", description: "계정 정보를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }
    deleteAccountMutation.mutate(credentialId);
  };

  // 활성/비활성 토글 핸들러
  const handleToggleStatus = (accountId: string, currentDisabled: boolean) => {
    const account = userRows.find((row) => row.id === accountId);
    const credentialId = account?.credentialId;
    if (!credentialId) {
      toast({ title: "오류", description: "계정 정보를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }
    toggleAccountMutation.mutate({ credentialId, disabled: !currentDisabled });
  };

  // 이미지 다운로드 권한 토글 핸들러
  const handleToggleImageDownload = (accountId: string, currentCanDownload: boolean) => {
    const account = userRows.find((row) => row.id === accountId);
    const credentialId = account?.credentialId;
    if (!credentialId) {
      toast({ title: "오류", description: "계정 정보를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }
    toggleImageDownloadMutation.mutate({ credentialId, canDownload: !currentCanDownload });
  };

  const handleChangeRole = (id: string, role: RoleKey) => { };

  // 계정 수정 핸들러
  const handleEdit = async (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    const positionRank = account?.positionRank || null;
    const credentialId = account?.credentialId;
    if (!credentialId) {
      toast({ title: "오류", description: "계정 정보를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }
    setEditingCredentialId(credentialId);
    setEditingPositionRank(positionRank);
  };

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

  // 답사 현황 보기 핸들러 (자식 리스트 컴포넌트에서 트리거됨)
  const handleViewSurveyPerformance = (accountId: string) => {
    const account = userRows.find((row) => row.id === accountId);
    setViewingSurveyPerformanceAccountId(accountId);
    setViewingSurveyPerformanceAccountName(account?.name || "");
  };

  const viewingAccountFavorites = useMemo(() => {
    if (!viewingFavoritesAccountId) return null;
    const account = userRows.find((row) => row.id === viewingFavoritesAccountId);
    return account?.favoritePins || [];
  }, [viewingFavoritesAccountId, userRows]);

  const viewingAccountReservedPins = useMemo(() => {
    if (!viewingReservedPinsAccountId) return null;
    const account = userRows.find((row) => row.id === viewingReservedPinsAccountId);
    return account?.reservedPinDrafts || [];
  }, [viewingReservedPinsAccountId, userRows]);

  const handleCloseFavoritesModal = () => {
    setViewingFavoritesAccountId(null);
    setViewingFavoritesAccountName("");
  };

  const handleCloseReservedPinsModal = () => {
    setViewingReservedPinsAccountId(null);
    setViewingReservedPinsAccountName("");
  };

  // 답사 현황 모달 닫기 핸들러
  const handleCloseSurveyPerformanceModal = () => {
    setViewingSurveyPerformanceAccountId(null);
    setViewingSurveyPerformanceAccountName("");
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">계정 목록</h1>
        <p className="text-sm text-muted-foreground">
          등록된 모든 계정을 조회하고 관리합니다.
        </p>
      </header>

      {/* 탭 메뉴 */}
      <div className="flex border-b border-gray-100 gap-6">
        <button
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "active"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          onClick={() => setActiveTab("active")}
        >
          활성 계정
        </button>
        <button
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "deleted"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          onClick={() => setActiveTab("deleted")}
        >
          삭제된 계정 관리
        </button>
      </div>

      {activeTab === "active" ? (
        <>
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
              <div className="p-10 text-center text-muted-foreground">로딩 중...</div>
            ) : (
              <AccountsListPage
                rows={userRows}
                onChangeRole={handleChangeRole}
                onRemove={handleRemove}
                onToggleStatus={handleToggleStatus}
                onToggleImageDownload={handleToggleImageDownload}
                onEdit={handleEdit}
                onViewFavorites={handleViewFavorites}
                onViewReservedPins={handleViewReservedPins}
                onViewSurveyPerformance={handleViewSurveyPerformance}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* 삭제된 계정 목록 탭 */}
          {deletedError && (
            <div className="rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              삭제된 계정 목록을 불러오는 중 오류가 발생했습니다.
            </div>
          )}

          <div className="p-1 pb-8">
            {isDeletedLoading ? (
              <div className="p-10 text-center text-muted-foreground">로딩 중...</div>
            ) : !deletedAccountsList || deletedAccountsList.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground bg-gray-50/50">
                삭제된 계정이 존재하지 않습니다.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-muted-foreground border-b font-black">
                    <tr>
                      <th className="px-6 py-4 text-left">이름</th>
                      <th className="px-6 py-4 text-left">이메일</th>
                      <th className="px-6 py-4 text-left">연락처</th>
                      <th className="px-6 py-4 text-left">역할</th>
                      <th className="px-6 py-4 text-left">탈퇴일(삭제일)</th>
                      <th className="px-6 py-4 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deletedAccountsList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{item.name || "-"}</td>
                        <td className="px-6 py-4 text-gray-600">{item.email}</td>
                        <td className="px-6 py-4 text-gray-600">{item.phone || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                            {item.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRestore(item.id)}
                            disabled={restoreAccountMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            복원하기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

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

      {/* 💡 [연동 완] API 데이터 및 로딩 상태를 받아 컴포넌트에 바인딩 주입 */}
      <AccountSurveyDetailModal
        open={!!viewingSurveyPerformanceAccountId}
        accountId={viewingSurveyPerformanceAccountId}
        accountName={viewingSurveyPerformanceAccountName}
        onClose={handleCloseSurveyPerformanceModal}
      />

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