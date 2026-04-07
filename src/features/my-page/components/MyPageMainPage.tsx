"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Button } from "@/components/atoms/Button/Button";
import { User, Users, FileText, Megaphone } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/features/users/api/account";

export function MyPageMainPage() {
  // 프로필 정보 가져오기
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000, // 10분
  });

  const quickActions = [
    {
      title: "프로필",
      description: "내 정보 조회 및 수정",
      href: "/my-page/profile",
      icon: User,
      color: "bg-blue-500",
    },
    {
      title: "공지사항",
      description: "전체 공지 내역 확인",
      href: "/my-page/notices",
      icon: Megaphone,
      color: "bg-yellow-500",
    },
    {
      title: "팀 관리",
      description: "팀원 정보 조회 및 관리",
      href: "/my-page/my-team",
      icon: Users,
      color: "bg-indigo-500",
    },
    {
      title: "내 계약",
      description: "본인이 계약한 계약목록 조회",
      href: "/my-page/my-contracts",
      icon: FileText,
      color: "bg-green-500",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8 bg-gray-50">
      <main className="mt-6 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-16">마이페이지</h1>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer aspect-square">
                  <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                    <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                      <action.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
