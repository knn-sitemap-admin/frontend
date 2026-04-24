"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  className?: string;
}

export function AdminPageHeader({ className }: AdminPageHeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string>("");

  const menuItems = [
    {
      key: "team-management",
      label: "팀관리(관리자)",
      href: "/admin/team-management",
    },
    { key: "account-create", label: "계정생성", href: "/admin/account-create" },
    { key: "accounts", label: "계정목록", href: "/admin/accounts" },
    { key: "contracts", label: "계약관리", href: "/admin/contracts" },
    { key: "performance", label: "실적확인", href: "/admin/performance" },
    { key: "settlements", label: "정산관리", href: "/admin/settlements" },
    { key: "platform-statistics", label: "플랫폼통계", href: "/admin/platform-statistics" },
    { key: "expense-management", label: "가계부", href: "/admin/expense-management" },
    { key: "notices", label: "공지사항", href: "/admin/notices" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] transition-all duration-500 animate-in fade-in slide-in-from-top-4",
        className
      )}
    >
      {/* 로고와 돌아가기 버튼 */}
      <div className="flex items-center gap-6 flex-shrink-0">
        <Link href="/" className="group">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-gray-100 active:scale-90 transition-all duration-200"
            title="메인화면으로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500 group-hover:text-gray-900 transition-colors" />
          </Button>
        </Link>
        <Link href="/admin" className="flex items-center group transition-transform duration-300 hover:scale-105 active:scale-95">
          <div className="relative h-10 w-[140px]">
            <Image
              src="/mainlogo_v2.png"
              alt="Notemap Logo"
              fill
              className="object-contain filter drop-shadow-sm group-hover:brightness-110 transition-all"
              priority
            />
          </div>
        </Link>
      </div>

      {/* 메뉴 - 부드러운 애니메이션 레이아웃 */}
      <nav
        className="flex-1 md:flex-none md:w-auto min-w-0 overflow-x-auto overflow-y-hidden px-4 flex-shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="relative flex items-center gap-1 p-1 bg-gray-50/80 rounded-2xl border border-gray-100/50">
          {menuItems.map((item) => {
            const isActive = activeMenu === item.key;
            return (
              <Link key={item.key} href={item.href} className="relative">
                <button
                  className={cn(
                    "relative px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 z-10",
                    isActive
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                  onClick={() => setActiveMenu(item.key)}
                >
                  {item.label}
                  {isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                  )}
                </button>
                {/* 활성 상태 배경 슬라이딩 효과 (CSS Transition) */}
                {isActive && (
                  <div 
                    className="absolute inset-0 bg-white shadow-sm border border-gray-100 rounded-xl z-0 animate-in fade-in zoom-in-95 duration-200"
                    style={{ layoutId: "active-bg" } as any}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
