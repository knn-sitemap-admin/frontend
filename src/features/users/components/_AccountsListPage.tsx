"use client";

import React, { useState } from "react";
import { Trash2, Edit, List, ChevronUp, ChevronDown, BarChart3 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/atoms/Avatar/Avatar";
import type { UserRow, RoleKey } from "@/features/users/types";
import { getPositionRankLabel } from "../utils/rankUtils";

type SortColumn = "name" | "rank" | null;
type SortDirection = "asc" | "desc";

// SurveyPerformance 엔티提 기반으로 서비스에서 가공해줄 통계 데이터 타입 확장
// (만약 수신하는 필드명이 다르다면 이 부분을 백엔드 Response에 맞게 수정해주세요)
type SurveySummary = {
  totalCount: number;      // 총 답사 횟수 (survey_performance row count)
  lastSurveyedAt?: string; // 최근 답사일
};

type ExtendedUserRow = UserRow & {
  // 백엔드에서 유저 목록을 가져올 때 함께 조인(Join)하거나 가공해서 넣어준다고 가정합니다.
  surveySummary?: SurveySummary;
};

type Props = {
  rows: ExtendedUserRow[]; // 확장된 타입 적용
  onChangeRole?: (id: string, role: RoleKey) => void;
  onRemove: (id: string) => void;
  onEdit?: (credentialId: string) => void;
  onViewFavorites?: (accountId: string) => void;
  onViewReservedPins?: (accountId: string) => void;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortColumn, direction: SortDirection) => void;
  hideDepartment?: boolean;
  hideEdit?: boolean;
  hideFavorites?: boolean;
  hideReservedPins?: boolean;
  hideImageProtection?: boolean;
  removeLabel?: string;
  onSetLeader?: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: boolean) => void;
  onToggleImageDownload?: (id: string, currentCanDownload: boolean) => void;
  onViewSurveyPerformance?: (accountId: string) => void;
};

export default function AccountsListPage({
  rows,
  onRemove,
  onEdit,
  onViewFavorites,
  onViewReservedPins,
  sortColumn = null,
  sortDirection = "asc",
  onSort,
  hideDepartment = false,
  hideEdit = false,
  hideFavorites = false,
  hideReservedPins = false,
  hideImageProtection = false,
  removeLabel = "삭제",
  onSetLeader,
  onToggleStatus,
  onToggleImageDownload,
  onViewSurveyPerformance,
}: Props) {
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => { },
    variant: "default",
  });

  const handleViewFavorites = (accountId: string) => {
    onViewFavorites?.(accountId);
  };

  const handleViewReservedPins = (accountId: string) => {
    onViewReservedPins?.(accountId);
  };

  const handleSortClick = (column: "name" | "rank") => {
    if (!onSort) return;
    if (sortColumn === column) {
      onSort(column, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(column, "asc");
    }
  };

  const SortIcon = ({ column }: { column: "name" | "rank" }) => {
    if (!onSort) return null;
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4 ml-1" />
      ) : (
        <ChevronDown className="h-4 w-4 ml-1" />
      );
    }
    return <ChevronUp className="h-4 w-4 ml-1 opacity-40" />;
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: "name" | "rank";
    children: React.ReactNode;
  }) => {
    if (!onSort) {
      return <th className="px-4 py-3 text-left font-medium">{children}</th>;
    }
    return (
      <th
        className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => handleSortClick(column)}
      >
        <div className="flex items-center">
          {children}
          <SortIcon column={column} />
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border">
      {rows.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          데이터가 없습니다.
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 레이아웃 */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-center font-medium">프로필 사진</th>
                  <SortableHeader column="name">이름</SortableHeader>
                  <th className="px-4 py-3 text-left font-medium">연락처</th>
                  <SortableHeader column="rank">직급</SortableHeader>
                  {!hideDepartment && (
                    <th className="px-4 py-3 text-left font-medium">부서</th>
                  )}
                  {/* 헤더명도 엔티티 성격에 맞게 '답사 성과'로 통일 */}
                  <th className="px-4 py-3 text-center font-medium">답사 성과</th>
                  {!hideReservedPins && (
                    <th className="px-4 py-3 text-center font-medium">
                      예약한 매물 목록
                    </th>
                  )}
                  {!hideFavorites && (
                    <th className="px-4 py-3 text-center font-medium">
                      즐겨찾기 목록
                    </th>
                  )}
                  {!hideEdit && (
                    <th className="px-4 py-3 text-center font-medium">계정 수정</th>
                  )}
                  {!hideImageProtection && (
                    <th className="px-4 py-3 text-center font-medium">
                      이미지 보호
                    </th>
                  )}
                  <th className="px-4 py-3 text-center font-medium">
                    {removeLabel}
                  </th>
                  {onSetLeader && (
                    <th className="px-4 py-3 text-center font-medium">역할 관리</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const phone = u.phone ?? "-";
                  const initials = u.name ? u.name.charAt(0).toUpperCase() : "?";

                  // 데이터 바인딩을 위한 변수 추출 (없을 시 기본값 처리)
                  const totalCount = u.surveySummary?.totalCount ?? 0;

                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={u.photo_url || undefined}
                              alt={u.name}
                            />
                            <AvatarFallback className="bg-muted text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3">{phone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getPositionRankLabel(u.positionRank)}
                          {u.disabled && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              정지
                            </span>
                          )}
                        </div>
                      </td>
                      {!hideDepartment && (
                        <td className="px-4 py-3">{u.teamName || "-"}</td>
                      )}

                      {/* 💡 데스크톱: 데이터 바인딩 연동 (누적 건수 노출 + 상세 조회 버튼) */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium text-indigo-600 border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                            onClick={() => onViewSurveyPerformance?.(u.id)}
                            title="상세 답사현황 보기"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            상세보기
                          </button>
                        </div>
                      </td>

                      {!hideReservedPins && (
                        <td className="px-4 py-3 text-center">
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            onClick={() => handleViewReservedPins(u.id)}
                            title="예약한 매물 목록"
                          >
                            <List className="h-4 w-4" />
                            목록
                          </button>
                        </td>
                      )}
                      {!hideFavorites && (
                        <td className="px-4 py-3 text-center">
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            onClick={() => handleViewFavorites(u.id)}
                            title="즐겨찾기 목록"
                          >
                            <List className="h-4 w-4" />
                            목록
                          </button>
                        </td>
                      )}
                      {!hideEdit && (
                        <td className="px-4 py-3 text-center">
                          {onEdit ? (
                            <button
                              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => onEdit(u.id)}
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                              수정
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {!hideImageProtection && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${!u.canDownloadImage ? "bg-emerald-600" : "bg-slate-200"
                                  }`}
                                onClick={() => onToggleImageDownload?.(u.id, !!u.canDownloadImage)}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!u.canDownloadImage
                                    ? "translate-x-5"
                                    : "translate-x-0"
                                    }`}
                                />
                              </button>
                              <span className={`text-[10px] font-bold uppercase ${!u.canDownloadImage ? "text-emerald-600" : "text-slate-400"}`}>
                                {!u.canDownloadImage ? "ON" : "OFF"}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        {u.role === "admin" ? (
                          <span className="text-muted-foreground text-xs">-</span>
                        ) : (
                          <div className="flex justify-center gap-2">
                            {onToggleStatus && (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${!u.disabled ? "bg-blue-600" : "bg-slate-200"
                                    }`}
                                  onClick={() => onToggleStatus(u.id, !!u.disabled)}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!u.disabled
                                      ? "translate-x-5"
                                      : "translate-x-0"
                                      }`}
                                  />
                                </button>
                                <span className={`text-[10px] font-bold uppercase ${!u.disabled ? "text-blue-600" : "text-slate-400"}`}>
                                  {!u.disabled ? "활성" : "차단"}
                                </span>
                              </div>
                            )}
                            <button
                              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setConfirmConfig({
                                  open: true,
                                  title: removeLabel,
                                  description:
                                    removeLabel === "팀 제외"
                                      ? "해당 직원을 팀에서 제외하시겠습니까?"
                                      : "해당 계정을 삭제하시겠습니까?",
                                  variant: "destructive",
                                  onConfirm: () => onRemove(u.id),
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {removeLabel}
                            </button>
                          </div>
                        )}
                      </td>
                      {onSetLeader && (
                        <td className="px-4 py-3 text-center">
                          {u.role === "team_leader" ? (
                            <span className="text-blue-600 font-bold text-xs">
                              현재 팀장
                            </span>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setConfirmConfig({
                                  open: true,
                                  title: "팀장 임명",
                                  description: "이 직원을 팀장으로 임명하시겠습니까?",
                                  variant: "default",
                                  onConfirm: () => onSetLeader(u.id),
                                });
                              }}
                            >
                              팀장 임명
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 레이아웃 */}
          <div className="sm:hidden divide-y">
            {rows.map((u) => {
              const phone = u.phone ?? "-";
              const initials = u.name ? u.name.charAt(0).toUpperCase() : "?";
              const totalCount = u.surveySummary?.totalCount ?? 0;

              return (
                <div key={u.id} className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={u.photo_url || undefined} alt={u.name} />
                      <AvatarFallback className="bg-muted text-lg font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900 truncate">{u.name}</h3>
                        {u.disabled && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                            정지
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        {getPositionRankLabel(u.positionRank)}
                        {!hideDepartment && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{u.teamName || "-"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm"> {/* 💡 바인딩을 위해 3열로 분할 */}
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">연락처</div>
                      <div className="font-bold text-gray-700 text-xs truncate">{phone}</div>
                    </div>

                    {/* 💡 모바일 전용: 답사 수치 바인딩 영역 추가 */}
                    <div className="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-50">
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">총 답사</div>
                      <div className="font-bold text-indigo-700 text-sm">{totalCount}건</div>
                    </div>

                    {!hideImageProtection && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">이미지 보호</div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!u.canDownloadImage ? "bg-emerald-600" : "bg-slate-200"}`}
                            onClick={() => onToggleImageDownload?.(u.id, !!u.canDownloadImage)}
                          >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${!u.canDownloadImage ? "translate-x-3" : "translate-x-0"}`} />
                          </button>
                          <span className={`text-[9px] font-black ${!u.canDownloadImage ? "text-emerald-600" : "text-slate-400"}`}>
                            {!u.canDownloadImage ? "ON" : "OFF"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* 💡 모바일: 상세보기 액션 버튼 매핑 */}
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
                      onClick={() => onViewSurveyPerformance?.(u.id)}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      성과조회
                    </button>
                    {!hideReservedPins && (
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        onClick={() => handleViewReservedPins(u.id)}
                      >
                        <List className="h-3.5 w-3.5" />
                        예약목록
                      </button>
                    )}
                    {!hideFavorites && (
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        onClick={() => handleViewFavorites(u.id)}
                      >
                        <List className="h-3.5 w-3.5" />
                        즐겨찾기
                      </button>
                    )}
                    {!hideEdit && onEdit && (
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100"
                        onClick={() => onEdit(u.id)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        정보수정
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      {onToggleStatus && u.role !== "admin" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!u.disabled ? "bg-blue-600" : "bg-slate-200"}`}
                            onClick={() => onToggleStatus(u.id, !!u.disabled)}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${!u.disabled ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                          <span className={`text-[10px] font-black uppercase ${!u.disabled ? "text-blue-600" : "text-slate-400"}`}>
                            {!u.disabled ? "활성" : "차단"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onSetLeader && (
                        u.role === "team_leader" ? (
                          <span className="text-blue-600 font-black text-xs px-2">현재 팀장</span>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setConfirmConfig({
                                open: true,
                                title: "팀장 임명",
                                description: "이 직원을 팀장으로 임명하시겠습니까?",
                                variant: "default",
                                onConfirm: () => onSetLeader(u.id),
                              });
                            }}
                          >
                            팀장임명
                          </button>
                        )
                      )}
                      {u.role !== "admin" && (
                        <button
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                          onClick={() => {
                            setConfirmConfig({
                              open: true,
                              title: removeLabel,
                              description:
                                removeLabel === "팀 제외"
                                  ? "해당 직원을 팀에서 제외하시겠습니까?"
                                  : "해당 계정을 삭제하시겠습니까?",
                              variant: "destructive",
                              onConfirm: () => onRemove(u.id),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {removeLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) =>
          setConfirmConfig((prev) => ({ ...prev, open }))
        }
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        variant={confirmConfig.variant}
      />
    </div>
  );
}