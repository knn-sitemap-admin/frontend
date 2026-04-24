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
  Clock
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
    <div className="mx-auto max-w-7xl p-6 space-y-8 bg-gray-50">
      <main className="mt-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href} className="group">
                <Card className="h-full bg-white border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 rounded-[32px] overflow-hidden group-active:scale-[0.98]">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl bg-gradient-to-br flex items-center justify-center text-white mb-3 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                      action.gradient,
                      action.shadow
                    )}>
                      <Icon size={28} />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-400 font-medium leading-relaxed mb-2">
                        {action.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Go to settings</span>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { CreditCard } from "lucide-react";
