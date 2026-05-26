"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/atoms/Dialog/Dialog";
import { MapPin, Calendar, Loader2 as Spinner } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";

import { cn } from "@/lib/cn"; // 프로젝트 내 className 합치기 유틸 (없으면 지우셔도 됩니다)
import { api } from "@/shared/api/api";

interface PinDetail {
    id: string;
    name: string;
    addressLine: string;
}

interface AccountSurveyItem {
    id: string;
    accountId: string;
    pinId: string;
    pinDraftId: string | null;
    surveyedAt: string;
    createdAt: string;
    pin: PinDetail;
}

interface AccountSurveyDetailModalProps {
    open: boolean;
    onClose: () => void;
    accountId: string | null;
    accountName: string;
}

export function AccountSurveyDetailModal({
    open,
    onClose,
    accountId,
    accountName,
}: AccountSurveyDetailModalProps) {

    // 📅 기간 조회를 위한 연도/월 상태 관리 (기본값: 현재 연도 2026년, 월은 ALL)
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = React.useState(currentYear);
    const [selectedMonth, setSelectedMonth] = React.useState<number | "ALL">("ALL");

    // 🎯 API로 전체 데이터 조회
    const { data: details = [], isLoading } = useQuery<AccountSurveyItem[]>({
        queryKey: ["employee-survey-details-list", accountId],
        queryFn: async () => {
            if (!accountId) return [];
            const res = await api.get(`/performance/survey/employees/${accountId}`);
            return res.data?.data ?? [];
        },
        enabled: !!accountId && open,
    });

    // 🎛️ [클라이언트 사이드 기간 필터링]
    // 1. 전체 데이터 중에서 존재하는 연도(Years) 목록만 중복 제거해서 상단 탭 메뉴용 배열 생성
    const availableYears = React.useMemo(() => {
        if (details.length === 0) return [currentYear];

        const years = details.map(item => {
            const date = new Date(item.surveyedAt);
            return isNaN(date.getTime()) ? currentYear : date.getFullYear();
        });

        // 중복 제거 후 내림차순 정렬 (예: [2026, 2025, 2024])
        return Array.from(new Set(years)).sort((a, b) => b - a);
    }, [details, currentYear]);

    // 1-1. 선택된 연도의 데이터 중에서 존재하는 월(Months) 목록만 중복 제거해서 생성
    const availableMonths = React.useMemo(() => {
        if (details.length === 0) return [];
        const months = details
            .filter(item => {
                const date = new Date(item.surveyedAt);
                const itemYear = isNaN(date.getTime()) ? currentYear : date.getFullYear();
                return itemYear === selectedYear;
            })
            .map(item => {
                const date = new Date(item.surveyedAt);
                return date.getMonth() + 1; // 1 ~ 12
            });
        // 중복 제거 후 오름차순 정렬
        return Array.from(new Set(months)).sort((a, b) => a - b);
    }, [details, selectedYear, currentYear]);

    // 연도가 바뀌면 선택된 월을 초기화
    React.useEffect(() => {
        setSelectedMonth("ALL");
    }, [selectedYear]);

    // 2. 선택된 연도/월에 해당하는 데이터만 필터링
    const filteredItems = React.useMemo(() => {
        return details.filter(item => {
            const date = new Date(item.surveyedAt);
            const itemYear = isNaN(date.getTime()) ? currentYear : date.getFullYear();
            const itemMonth = isNaN(date.getTime()) ? 1 : date.getMonth() + 1;
            
            const matchYear = itemYear === selectedYear;
            const matchMonth = selectedMonth === "ALL" ? true : itemMonth === selectedMonth;
            
            return matchYear && matchMonth;
        });
    }, [details, selectedYear, selectedMonth, currentYear]);

    // 📅 답사 일자 포맷팅 유틸 (YYYY-MM-DD)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr.split("T")[0];
        return date.toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <MapPin className="h-5 w-5 text-orange-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">
                            {accountName}님의 상세 답사 통계
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-400">
                        현장 앱에서 완료된 해당 직원의 실시간 답사 상세 내역입니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">

                    {/* ⏱️ 상단 연도/월 필터링 버튼 영역 */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-end items-center gap-2">
                            <span className="text-sm font-bold text-gray-400">조회 연도:</span>
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                                {availableYears.map((year) => (
                                    <Button
                                        key={year}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                                            selectedYear === year
                                                ? "bg-white shadow-sm text-orange-600"
                                                : "text-gray-500 hover:bg-white/50"
                                        )}
                                        onClick={() => setSelectedYear(year)}
                                    >
                                        {year}년
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {availableMonths.length > 0 && (
                            <div className="flex justify-end items-center gap-2">
                                <span className="text-sm font-bold text-gray-400">조회 월:</span>
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                                            selectedMonth === "ALL"
                                                ? "bg-white shadow-sm text-orange-600"
                                                : "text-gray-500 hover:bg-white/50"
                                        )}
                                        onClick={() => setSelectedMonth("ALL")}
                                    >
                                        전체
                                    </Button>
                                    {availableMonths.map((month) => (
                                        <Button
                                            key={month}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-8 px-4 text-xs font-bold rounded-lg transition-all",
                                                selectedMonth === month
                                                    ? "bg-white shadow-sm text-orange-600"
                                                    : "text-gray-500 hover:bg-white/50"
                                            )}
                                            onClick={() => setSelectedMonth(month)}
                                        >
                                            {month}월
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="w-full py-16 flex flex-col items-center justify-center gap-2">
                            <Spinner className="h-8 w-8 text-orange-500 animate-spin" />
                            <span className="text-sm font-bold text-gray-400">데이터 로딩 중...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* 📊 메인 데이터 테이블 (필터링된 데이터인 filteredItems 매핑) */}
                            <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold text-xs">
                                            <th className="py-3.5 px-4 w-[80px] text-center">번호</th>
                                            <th className="py-3.5 px-4 text-center">답사 일자</th>
                                            <th className="py-3.5 px-4 text-left">답사 장소 / 지점명</th>
                                            <th className="py-3.5 px-4 text-center text-orange-600">분류</th>
                                            <th className="py-3.5 px-4 text-center">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white text-slate-700">
                                        {filteredItems.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-4 text-center font-bold text-slate-500">
                                                    {index + 1}
                                                </td>
                                                <td className="py-4 px-4 text-center text-slate-500">
                                                    {formatDate(item.surveyedAt)}
                                                </td>
                                                <td className="py-4 px-4 text-left font-semibold text-slate-800">
                                                    <div className="flex flex-col">
                                                        <span>{item.pin?.name || "미지정 매물"}</span>
                                                        <span className="text-xs font-normal text-slate-400 mt-0.5">
                                                            {item.pin?.addressLine || "주소 정보 없음"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {item.pinDraftId ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100">
                                                            초안 연동 (#{item.pinDraftId})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                            일반 답사
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                                        완료
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* 해당 연도/월에 데이터가 없을 때 */}
                                        {filteredItems.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-sm text-gray-400 bg-white">
                                                    {selectedYear}년도 {selectedMonth !== "ALL" ? `${selectedMonth}월에` : "전체에서"} 조회된 답사 성과 데이터가 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* 🖤 하단 총계 바 (선택된 연도의 건수 실시간 반영) */}
                            <div className="w-full bg-slate-900 rounded-xl overflow-hidden flex items-center text-sm font-bold text-white shadow-md">
                                <div className="py-4 px-6 bg-slate-800/50 min-w-[150px]">
                                    {selectedYear}년 {selectedMonth !== "ALL" ? `${selectedMonth}월` : "전체"} 활동 합계
                                </div>
                                <div className="py-4 px-6 flex-1 text-center text-orange-400 text-base border-r border-slate-800">
                                    {filteredItems.length}건
                                </div>
                                <div className="py-4 px-6 text-slate-400 text-xs font-normal">
                                    상세 목록 기준
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={onClose}
                        className="rounded-xl px-8 font-bold bg-gray-900 hover:bg-black text-white transition-all"
                    >
                        닫기
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}