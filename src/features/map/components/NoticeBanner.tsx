"use client";

import React, { useState, useEffect } from "react";
import { getNotices, getNotice, NoticeListResponse, NoticeResponse } from "@/features/admin/api/notices";
import { X, Megaphone, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/atoms/Dialog/Dialog";

export function NoticeBanner() {
  const [noticeList, setNoticeList] = useState<NoticeListResponse | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLatestNotice = async () => {
      try {
        const notices = await getNotices();
        if (notices && notices.length > 0) {
          const latest = notices[0];
          
          const dismissedId = localStorage.getItem("dismissed_notice_id");
          if (dismissedId !== String(latest.id)) {
            setNoticeList(latest);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("공지사항 배너 로드 실패:", error);
      }
    };

    fetchLatestNotice();
  }, []);

  const handleShowDetail = async () => {
    if (!noticeList) return;
    
    setIsLoading(true);
    try {
      const fullNotice = await getNotice(noticeList.id);
      setSelectedNotice(fullNotice);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("공지사항 상세 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (noticeList) {
      localStorage.setItem("dismissed_notice_id", String(noticeList.id));
    }
    setIsVisible(false);
  };

  if (!isVisible || !noticeList) return (
    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <NoticeDetailContent notice={selectedNotice} />
    </Dialog>
  );

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] w-[90%] max-w-2xl">
        <div 
          onClick={handleShowDetail}
          className="bg-white border border-primary/20 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 cursor-pointer hover:border-primary/40 transition-colors"
        >
          <div className="bg-primary/10 p-1.5 rounded-full flex-shrink-0">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">
              <span className="text-primary font-bold mr-2">[공지]</span>
              {noticeList.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2 flex-shrink-0">
            <Eye className="w-3.5 h-3.5" />
            {noticeList.views}
          </div>

          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 hover:bg-primary/5 rounded-full flex-shrink-0 pointer-events-none">
            {isLoading ? "로딩 중..." : "자세히 보기"}
            <ChevronRight className="w-3 h-3" />
          </Button>

          <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0" />

          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            aria-label="공지 닫기"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <NoticeDetailContent notice={selectedNotice} />
      </Dialog>
    </>
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
            <span className="text-xs text-gray-500">{new Date(notice.createdAt).toLocaleDateString()}</span>
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
          <Button variant="outline" className="px-6 rounded-full font-semibold">닫기</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
