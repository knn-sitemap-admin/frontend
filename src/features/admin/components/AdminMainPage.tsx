"use client";

import {
  Card,
  CardContent,
} from "@/components/atoms/Card/Card";
import {
  Users,
  FileText,
  Bell,
  TrendingUp,
  Wallet,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  LayoutGrid,
  BarChart3,
  Calendar,
  Clock,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/features/users/api/account";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function AdminMainPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 프로필 정보 가져오기
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000,
  });

  const quickActions = useMemo(() => [
    ...(profile?.role === "admin"
      ? [
        {
          title: "팀 관리(관리자)",
          description: "전체 팀 목록 및 권한 관리",
          href: "/admin/team-management",
          icon: ShieldCheck,
          gradient: "from-blue-600 to-indigo-600",
          shadow: "shadow-blue-500/20",
        },
      ]
      : []),
    {
      title: "계정 생성",
      description: "새로운 운영자/영업자 계정 등록",
      href: "/admin/account-create",
      icon: UserPlus,
      gradient: "from-cyan-500 to-blue-500",
      shadow: "shadow-cyan-500/20",
    },
    {
      title: "계정 목록",
      description: "사용자 조회 및 정보 수정",
      href: "/admin/accounts",
      icon: Users,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/20",
    },
    {
      title: "계약 관리",
      description: "모든 계약 데이터 통합 관리",
      href: "/admin/contracts",
      icon: FileText,
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
    },
    {
      title: "실적 확인",
      description: "실시간 성과 지표 및 랭킹",
      href: "/admin/performance",
      icon: TrendingUp,
      gradient: "from-orange-500 to-rose-500",
      shadow: "shadow-orange-500/20",
    },
    {
      title: "플랫폼 통계",
      description: "매체별 효율 및 전환 분석",
      href: "/admin/platform-statistics",
      icon: BarChart3,
      gradient: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-500/20",
    },
    {
      title: "정산 관리",
      description: "월별 수당 계산 및 지급",
      href: "/admin/settlements",
      icon: CreditCard,
      gradient: "from-blue-600 to-cyan-600",
      shadow: "shadow-blue-600/20",
    },
    {
      title: "가계부",
      description: "지출 관리 및 재무 현황",
      href: "/admin/expense-management",
      icon: Wallet,
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/20",
    },
    {
      title: "공지사항",
      description: "전사 공지 및 시스템 안내",
      href: "/admin/notices",
      icon: Bell,
      gradient: "from-purple-500 to-fuchsia-600",
      shadow: "shadow-purple-500/20",
    },
  ], [profile]);

  return (
    <div className="fixed inset-0 bg-gray-50/50 flex flex-col overflow-hidden p-3 sm:p-6">
      <div className="mx-auto w-full max-w-5xl h-full flex flex-col">
        {/* 초슬림 헤더 */}
        <header className="mb-3 sm:mb-6 px-1 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0">
              <div className="flex items-center gap-1.5 text-blue-600 font-black text-[9px] uppercase tracking-widest">
                <ShieldCheck size={10} />
                <span>Admin Console</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                시스템 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">관리자 설정</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-gray-100">
              <Clock size={10} className="text-blue-500" />
              <span className="text-[10px] sm:text-xs font-black text-gray-700">{currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* 3열 그리드 - 카드 비율 고정 및 과도한 확장 방지 */}
        <main className="flex-1 flex items-center justify-center min-h-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md sm:max-w-none">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href} className="group block aspect-[4/5] sm:aspect-auto">
                  <Card className="h-full bg-white border-gray-50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 rounded-xl sm:rounded-[24px] overflow-hidden group-active:scale-[0.95] flex flex-col">
                    <CardContent className="p-1.5 sm:p-5 flex flex-col items-center sm:items-start justify-center h-full text-center sm:text-left">
                      <div className={cn(
                        "w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-1 sm:mb-3 transition-all duration-500 group-hover:scale-110 shadow-sm shrink-0",
                        action.gradient,
                        action.shadow
                      )}>
                        <Icon className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
                      </div>

                      <div className="w-full overflow-hidden">
                        <h3 className="text-[9px] xs:text-[10px] sm:text-sm font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                          {action.title.split('(')[0]}
                        </h3>
                        <p className="hidden md:block text-[11px] text-gray-400 font-medium leading-tight mt-1 line-clamp-1 opacity-70">
                          {action.description}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-1 mt-2 text-[9px] font-black text-gray-300 uppercase tracking-tighter group-hover:text-blue-400 transition-colors">
                        <span>Enter</span>
                        <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
