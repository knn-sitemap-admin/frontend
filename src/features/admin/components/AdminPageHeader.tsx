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
  LayoutDashboard,
  Menu
} from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/atoms/Sheet/Sheet";

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
        "sticky top-0 z-50 w-full flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all duration-300",
        className
      )}
    >
      {/* 로고와 돌아가기 버튼 */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <Link href="/" className="group">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-md active:scale-90 transition-all border border-gray-100/50"
            title="메인화면으로 돌아가기"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-blue-600" />
          </Button>
        </Link>
        <Link href="/admin" className="flex items-center group transition-all hover:opacity-80 active:scale-95">
          <div className="relative h-7 w-[100px] sm:h-9 sm:w-[130px]">
            <Image
              src="/mainlogo.webp"
              alt="Notemap Logo"
              fill
              className="object-contain filter drop-shadow-sm"
              priority
            />
          </div>
        </Link>
      </div>

      {/* 데스크탑 메뉴 */}
      <nav
        className="hidden lg:flex flex-1 max-w-[80%] px-8 min-w-0"
      >
        <div className="relative flex items-center gap-1 p-1 bg-gray-100/50 rounded-2xl border border-gray-200/30 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "relative group px-3.5 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                  isActive
                    ? "bg-white shadow-sm border border-gray-100 z-10"
                    : "hover:bg-white/40 text-gray-500 hover:text-gray-900"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                <span className={cn(
                  "text-[13px] font-bold tracking-tight",
                  isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 모바일 메뉴 (Hamburger) */}
      <div className="lg:hidden flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100">
              <Menu className="h-6 w-6 text-gray-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0 border-l-0">
            <SheetHeader className="p-6 border-b border-gray-50 text-left">
              <SheetTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                관리자 메뉴
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col p-3 gap-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all",
                      isActive 
                        ? "bg-blue-50 text-blue-700 font-bold" 
                        : "text-gray-600 hover:bg-gray-50 active:scale-98"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
                    <span className="text-sm">{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
