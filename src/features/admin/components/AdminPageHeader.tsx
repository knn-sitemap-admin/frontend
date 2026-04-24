"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserCheck,
  FileText,
  TrendingUp,
  CreditCard,
  BarChart3,
  Wallet,
  Bell,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  className?: string;
}

export function AdminPageHeader({ className }: AdminPageHeaderProps) {
  const pathname = usePathname();

  const menuItems = useMemo(() => [
    { key: "admin", label: "관리 대시보드", href: "/admin", icon: LayoutDashboard },
    { key: "team-management", label: "팀관리", href: "/admin/team-management", icon: Users },
    { key: "account-create", label: "계정생성", href: "/admin/account-create", icon: UserPlus },
    { key: "accounts", label: "계정목록", href: "/admin/accounts", icon: UserCheck },
    { key: "contracts", label: "계약관리", href: "/admin/contracts", icon: FileText },
    { key: "performance", label: "실적확인", href: "/admin/performance", icon: TrendingUp },
    { key: "settlements", label: "정산관리", href: "/admin/settlements", icon: CreditCard },
    { key: "platform-statistics", label: "통계", href: "/admin/platform-statistics", icon: BarChart3 },
    { key: "expense-management", label: "가계부", href: "/admin/expense-management", icon: Wallet },
    { key: "notices", label: "공지사항", href: "/admin/notices", icon: Bell },
  ], []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full flex items-center justify-between px-4 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] transition-all duration-500 animate-in fade-in slide-in-from-top-4",
        className
      )}
    >
      {/* 로고와 돌아가기 버튼 */}
      <div className="flex items-center gap-6 flex-shrink-0">
        <Link href="/" className="group">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-md active:scale-90 transition-all duration-300 border border-gray-100/50"
            title="메인화면으로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </Button>
        </Link>
        <Link href="/admin" className="flex items-center group transition-all duration-300 hover:opacity-80 active:scale-95">
          <div className="relative h-9 w-[130px]">
            <Image
              src="/mainlogo.webp"
              alt="Notemap Logo"
              fill
              className="object-contain filter drop-shadow-sm transition-all"
              priority
            />
          </div>
        </Link>
      </div>

      {/* 메뉴 - 부드러운 애니메이션 레이아웃 */}
      <nav
        className="flex-1 max-w-[80%] px-8 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="relative flex items-center gap-1.5 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200/30">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "relative group px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2.5 whitespace-nowrap",
                  isActive
                    ? "bg-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] border border-gray-100 z-10 scale-[1.02]"
                    : "hover:bg-white/40 text-gray-500 hover:text-gray-900"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  isActive ? "text-blue-600 scale-110" : "text-gray-400 group-hover:text-gray-600"
                )} />
                <span className={cn(
                  "text-[13px] font-bold tracking-tight transition-all",
                  isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900"
                )}>
                  {item.label}
                </span>

                {isActive && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 ml-1 animate-in zoom-in duration-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
