"use client";

import React, { useState, useEffect } from "react";
import { getNotices, getNotice, NoticeListResponse, NoticeResponse } from "@/features/admin/api/notices";
import { Eye, Clock } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/atoms/Dialog/Dialog";

export function NoticeBanner() {
  const [selectedNotice, setSelectedNotice] = useState<NoticeResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchLatestNotice = async () => {
      try {
        const notices = await getNotices();
        if (notices && notices.length > 0) {
          // 안 읽은 첫 번째 공지 찾기
          const unreadNotice = notices.find((n) => n.isRead === false);
          
          if (unreadNotice) {
            const fullNotice = await getNotice(unreadNotice.id);
            setSelectedNotice(fullNotice);
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error("공지사항 팝업 로드 실패:", error);
      }
    };

    fetchLatestNotice();
  }, []);

  if (!isOpen || !selectedNotice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setIsOpen(false);
    }}>
      <DialogContent 
        overlayClassName="bg-black/20"
        className="sm:max-w-[700px] max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl"
      >
        <DialogHeader className="p-6 bg-gray-50 border-b">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Notice</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(selectedNotice.createdAt).toLocaleDateString()}
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
              {selectedNotice.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {selectedNotice.title} 공지사항의 상세 내용입니다.
            </DialogDescription>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm text-gray-600 font-medium">{selectedNotice.author?.name || "퇴사자/없음"}</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                {selectedNotice.views}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white min-h-[300px]">
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
            {selectedNotice.content}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex items-center justify-end">
          <Button variant="outline" className="px-6 rounded-full font-semibold" onClick={() => setIsOpen(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
