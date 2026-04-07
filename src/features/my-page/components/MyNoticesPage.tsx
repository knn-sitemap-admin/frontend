"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getNotices, getNotice, NoticeListResponse, NoticeResponse } from "@/features/admin/api/notices";
import { Table, SearchBar, processTableData } from "@/features/table";
import type { TableColumn, TableData } from "@/features/table/types/table";
import { useToast } from "@/hooks/use-toast";
import { Eye, Megaphone, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";

interface NoticeData extends TableData {
  id: number;
  title: string;
  author: { name: string } | null;
  views: number;
  createdAt: string;
}

const columns: TableColumn<NoticeData>[] = [
  {
    key: "id",
    label: "번호",
    width: "80px",
    align: "center",
  },
  {
    key: "title",
    label: "제목",
    render: (value) => (
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium text-gray-900 truncate">{value}</span>
      </div>
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
    width: "100px",
    align: "center",
    render: (value) => (
      <div className="flex items-center justify-center gap-1.5 text-gray-500">
        <Eye className="w-3.5 h-3.5" />
        {value}
      </div>
    ),
  },
  {
    key: "createdAt",
    label: "작성일",
    width: "130px",
    align: "center",
    render: (value) => (
      <div className="text-gray-500 text-sm">
        {new Date(value).toLocaleDateString("ko-KR")}
      </div>
    ),
  },
];

export function MyNoticesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [notices, setNotices] = useState<NoticeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<NoticeResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  const loadNotices = async () => {
    setIsLoading(true);
    try {
      const data = await getNotices();
      setNotices(data as any);
    } catch (error) {
      console.error("공지사항 로드 실패:", error);
      toast({
        title: "공지사항 목록 로드 실패",
        description: "정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const { processedData, pagination } = useMemo(() => {
    return processTableData(notices, {
      searchTerm,
      searchKeys: ["title"],
      currentPage,
      listsPerPage: 10,
    });
  }, [notices, searchTerm, currentPage]);

  const handleRowClick = async (row: NoticeData) => {
    try {
      const full = await getNotice(row.id);
      setSelectedNotice(full);
      setIsDetailOpen(true);
      // 조회수 즉시 반영 (낙관적 업데이트)
      setNotices(prev => prev.map(n => n.id === row.id ? { ...n, views: n.views + 1 } : n));
    } catch (error) {
      toast({ title: "공지사항 상세 로드 실패", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 공지사항</h1>
          <p className="text-sm text-gray-500 mt-1">회사의 주요 공지내용을 확인할 수 있습니다.</p>
        </div>
        <div className="w-full sm:max-w-xs">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="공지 제목으로 검색..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table
          data={processedData}
          columns={columns}
          pagination={pagination}
          loading={isLoading}
          emptyMessage="등록된 공지사항이 없습니다."
          onPageChange={setCurrentPage}
          onRowClick={handleRowClick}
        />
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <NoticeDetailContent notice={selectedNotice} />
      </Dialog>
    </div>
  );
}

function NoticeDetailContent({ notice }: { notice: NoticeResponse | null }) {
  if (!notice) return null;
  
  return (
    <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
      <DialogHeader className="p-6 bg-gray-50 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Notice</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(notice.createdAt).toLocaleDateString()}
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
            {notice.title}
          </DialogTitle>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm text-gray-600 font-medium">{notice.author?.name || "퇴사자/없음"}</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-3.5 h-3.5" />
              {notice.views}
            </div>
          </div>
        </div>
      </DialogHeader>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white min-h-[300px]">
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
          {notice.content}
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 border-t flex justify-end">
        <DialogClose asChild>
          <Button variant="outline" className="px-6 rounded-full font-semibold">목록으로</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
