"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Table, SearchBar, processTableData } from "@/features/table";
import type { TableColumn, TableData } from "@/features/table/types/table";
import { useToast } from "@/hooks/use-toast";
import { CreateNoticeForm } from "../components/CreateNoticeForm";

import { Users, Eye, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { getNotices, getNoticeReadStatus, deleteNotice, NoticeReadStatus } from "../api/notices";
import { Button } from "@/components/atoms/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";

// 공지사항 데이터 타입 (API 응답과 일치)
interface NoticeData extends TableData {
  id: number;
  title: string;
  author: { name: string } | null;
  views: number;
  createdAt: string;
}

export function NoticesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [notices, setNotices] = useState<NoticeData[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  
  // 조회 현황 모달 상태
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusData, setStatusData] = useState<NoticeReadStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [currentNoticeTitle, setCurrentNoticeTitle] = useState("");

  const { toast } = useToast();

  const handleCheckStatus = async (id: number, title: string) => {
    setIsLoadingStatus(true);
    setCurrentNoticeTitle(title);
    try {
      const data = await getNoticeReadStatus(id);
      setStatusData(data);
      setIsStatusOpen(true);
    } catch (error) {
      toast({ title: "조회 현황을 불러오지 못했습니다.", variant: "destructive" });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`"${title}" 공지사항을 삭제하시겠습니까?`)) return;

    try {
      await deleteNotice(id);
      toast({ title: "공지사항이 삭제되었습니다." });
      loadNotices();
    } catch (error) {
      toast({ title: "삭제 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const columns = useMemo(() => [
    {
      key: "id",
      label: "번호",
      width: "80px",
      align: "center",
    },
    {
      key: "title",
      label: "제목",
      render: (value: string) => (
        <div className="font-medium text-gray-900 truncate">{value}</div>
      ),
    },
    {
      key: "author",
      label: "작성자",
      width: "120px",
      align: "center",
      render: (value: any) => value?.name || "퇴사자/없음",
    },
    {
      key: "views",
      label: "조회수",
      width: "80px",
      align: "center",
    },
    {
      key: "createdAt",
      label: "작성일",
      width: "120px",
      align: "center",
      render: (value: string) => new Date(value).toLocaleDateString("ko-KR"),
    },
    {
      key: "actions",
      label: "작업",
      width: "180px",
      align: "center",
      render: (_: any, row: NoticeData) => (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleCheckStatus(row.id, row.title);
            }}
          >
            <Users className="w-3.5 h-3.5" />
            현황
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id, row.title);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  // 공지사항 목록 로드
  const loadNotices = useCallback(async () => {
    setIsLoadingNotices(true);
    try {
      const noticeData = await getNotices();
      setNotices(noticeData as any);
    } catch (error: any) {
      console.error("공지사항 목록 로드 실패:", error);
      setNotices([]);
      toast({
        title: "공지사항 목록 로드 실패",
        description: "백엔드 서버를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNotices(false);
    }
  }, [toast]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // 데이터 처리
  const { processedData, pagination } = useMemo(() => {
    return processTableData(notices, {
      searchTerm,
      searchKeys: ["title", "author"],
      currentPage,
      listsPerPage: 10,
    });
  }, [notices, searchTerm, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (row: NoticeData) => {
    console.log("공지사항 클릭:", row);
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
        <div className="w-full sm:max-w-xs">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="제목, 작성자로 검색..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          총 {notices.length}개의 공지사항
        </div>
        <CreateNoticeForm onNoticeCreated={loadNotices} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table
          data={processedData}
          columns={columns as any}
          pagination={pagination}
          loading={isLoadingNotices}
          emptyMessage="공지사항이 없습니다."
          onPageChange={handlePageChange}
          onRowClick={handleRowClick}
        />
      </div>

      {/* 조회 현황 모달 */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Read Analytics</span>
            </div>
            <DialogTitle className="text-xl font-bold truncate">
              "{currentNoticeTitle}" 조회 현황
            </DialogTitle>
          </DialogHeader>

          {statusData && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-3 gap-4 p-6 bg-white border-b flex-shrink-0">
                <div className="bg-gray-50 p-4 rounded-xl text-center border">
                  <div className="text-xs text-gray-500 font-bold mb-1 uppercase">전체 인원</div>
                  <div className="text-2xl font-black text-gray-900">{statusData.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                  <div className="text-xs text-green-600 font-bold mb-1 uppercase">읽음</div>
                  <div className="text-2xl font-black text-green-700">{statusData.readCount}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                  <div className="text-xs text-red-600 font-bold mb-1 uppercase">미조회</div>
                  <div className="text-2xl font-black text-red-700">{statusData.unreadCount}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 읽은 사람 리스트 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-green-700 pb-2 border-b sticky top-0 bg-white z-10">
                    <CheckCircle2 className="w-5 h-5" />
                    읽은 직원 ({statusData.readList.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {statusData.readList.length > 0 ? (
                      statusData.readList.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-2.5 bg-green-50/30 border border-green-100 rounded-lg text-sm">
                          <span className="font-semibold text-gray-900">{emp.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm italic">데이터가 없습니다</div>
                    )}
                  </div>
                </div>

                {/* 읽지 않은 사람 리스트 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-red-700 pb-2 border-b sticky top-0 bg-white z-10">
                    <XCircle className="w-5 h-5" />
                    읽지 않은 직원 ({statusData.unreadList.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {statusData.unreadList.length > 0 ? (
                      statusData.unreadList.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-2.5 bg-red-50/30 border border-red-100 rounded-lg text-sm">
                          <span className="font-semibold text-gray-900">{emp.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm italic">모두 조회하였습니다</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-gray-50 border-t flex justify-end flex-shrink-0">
            <Button onClick={() => setIsStatusOpen(false)} className="px-8 rounded-full">닫기</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
