"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { getNotices } from "@/features/admin/api/notices";
import { cn } from "@/lib/cn";

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnreadNotices = async () => {
      try {
        const notices = await getNotices();
        if (notices && notices.length > 0) {
          const unread = notices.some((n) => n.isRead === false);
          setHasUnread(unread);
        }
      } catch (error) {
        console.error("공지사항 알림 확인 실패:", error);
      }
    };

    checkUnreadNotices();
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "relative h-10 w-10 rounded-xl bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm transition-all",
        className
      )}
      onClick={() => router.push("/my-page/notices")}
      aria-label="공지사항"
      title="공지사항 확인하기"
    >
      <Bell className="h-[18px] w-[18px]" />
      {hasUnread && (
        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
    </Button>
  );
}
