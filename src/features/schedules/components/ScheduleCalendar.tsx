"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, Banknote, Home, Home as HomeIcon, Calendar as CalIcon, Bell, Phone, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { getSchedules, Schedule } from "@/features/schedules/api/schedules";
import { ScheduleModal } from "./ScheduleModal";
import { getProfile, getEmployeesList } from "@/features/users/api/account";
import { useQuery } from "@tanstack/react-query";
import { ScheduleTrashModal } from "./ScheduleTrashModal";
import { getKoreanHoliday } from "../utils/holiday";
import { getContracts, getMyContracts } from "@/features/contract-records/api/contracts";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/atoms/Sheet/Sheet";
import { SalesContractRecordsModal } from "@/features/contract-records";
import type { SalesContractData } from "@/features/contract-records/types/contract-records";

export default function ScheduleCalendar() {
  const router = useRouter();
  // 초기 상태 로드 ( hydration mismatch 방지를 위해 useEffect에서 로드 )
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [staffId, setStaffId] = useState<string>("all");
  const [onlyHolidays, setOnlyHolidays] = useState(false);
  const [onlyFinalPayments, setOnlyFinalPayments] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);


  useEffect(() => {
    // sessionStorage에서 상태 복원
    const savedMonth = sessionStorage.getItem("calendar_current_month");
    const savedFilter = sessionStorage.getItem("calendar_filter_mode");
    const savedStaff = sessionStorage.getItem("calendar_staff_id");
    const savedHolidays = sessionStorage.getItem("calendar_only_holidays");
    const savedPayments = sessionStorage.getItem("calendar_only_final_payments");

    if (savedMonth) {
      const date = new Date(savedMonth);
      setCurrentMonth(date);
    }

    if (savedFilter) setFilterMode(savedFilter as "all" | "mine");
    if (savedStaff) setStaffId(savedStaff);
    if (savedHolidays) setOnlyHolidays(savedHolidays === "true");
    if (savedPayments) setOnlyFinalPayments(savedPayments === "true");

    setIsHydrated(true);
  }, []);

  const [hoveredContractId, setHoveredContractId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const [contractDefaultData, setContractDefaultData] = useState<Partial<SalesContractData> | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragYRef = React.useRef(0);
  const dragXRef = React.useRef(0);
  const startYRef = React.useRef<number | null>(null);
  const startXRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.targetTouches[0].clientY;
    startXRef.current = e.targetTouches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null || startXRef.current === null) return;
    const currentY = e.targetTouches[0].clientY;
    const currentX = e.targetTouches[0].clientX;
    const deltaY = currentY - startYRef.current;
    const deltaX = currentX - startXRef.current;

    // 세로 드래그 (시트 닫기용 - 아래로만)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        setDragY(deltaY);
        dragYRef.current = deltaY;
      }
      setDragX(0);
      dragXRef.current = 0;
    } else {
      // 가로 드래그 (날짜 변경용)
      setDragX(deltaX);
      dragXRef.current = deltaX;
      setDragY(0);
      dragYRef.current = 0;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current !== null && startXRef.current !== null) {
      const endY = e.changedTouches[0].clientY;
      const endX = e.changedTouches[0].clientX;
      const diffY = endY - startYRef.current;
      const diffX = endX - startXRef.current;

      // 좌우 스와이프 감지 (가로 이동이 세로 이동보다 크고 일정 거리 이상일 때)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // 오른쪽 스와이프 -> 이전 날짜
          setSelectedDate(prev => subDays(prev, 1));
        } else {
          // 왼쪽 스와이프 -> 다음 날짜
          setSelectedDate(prev => addDays(prev, 1));
        }
      } else if (diffY > 100) {
        // 아래로 드래그 -> 시트 닫기
        setIsAgendaOpen(false);
      }
    }

    startYRef.current = null;
    startXRef.current = null;
    setIsDragging(false);
    setDragY(0);
    setDragX(0);
    dragYRef.current = 0;
    dragXRef.current = 0;
  };

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const isPowerful = profile?.role === "admin" || profile?.role === "manager";

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", { onlyActive: true }],
    queryFn: () => getEmployeesList({ onlyActive: true }),
    enabled: isPowerful,
  });

  const { 
    data: calendarData = { schedules: [], contracts: [] }, 
    isLoading: isCalendarLoading,
    refetch: refetchCalendar 
  } = useQuery({
    queryKey: ["calendar", { 
      year: currentMonth.getFullYear(), 
      staffId, 
      filterMode, 
      onlyHolidays, 
      onlyFinalPayments, 
      profileId: profile?.account?.id 
    }],
    queryFn: async () => {
      const year = currentMonth.getFullYear();
      const startDateStr = format(new Date(year, 0, 1), "yyyy-MM-dd");
      const endDateStr = format(new Date(year, 11, 31), "yyyy-MM-dd");

      const params: any = {
        from: startDateStr,
        to: endDateStr,
      };

      if (onlyHolidays) params.onlyHolidays = true;

      if (staffId && staffId !== "all" && staffId !== "mine") {
        params.assignedStaffId = staffId;
      } else if (filterMode === "mine" || (!isPowerful && staffId === "all")) {
        if (profile?.account?.id) params.assignedStaffId = profile.account.id;
      }

      const contractParams = {
        paymentDateFrom: startDateStr,
        paymentDateTo: endDateStr,
        size: 5000,
        assignedStaffId: params.assignedStaffId
      };

      const [scheduleData, contractData] = await Promise.all([
        getSchedules(params),
        (!isPowerful || filterMode === "mine") 
          ? getMyContracts(contractParams) 
          : getContracts(contractParams)
      ]);

      return {
        schedules: scheduleData,
        contracts: contractData?.items || []
      };
    },
    enabled: isHydrated && (filterMode !== "mine" || !!profile?.account?.id),
  });

  // 상태 보존을 위한 효과
  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem("calendar_current_month", currentMonth.toISOString());
    sessionStorage.setItem("calendar_filter_mode", filterMode);
    sessionStorage.setItem("calendar_staff_id", staffId);
    sessionStorage.setItem("calendar_only_holidays", String(onlyHolidays));
    sessionStorage.setItem("calendar_only_final_payments", String(onlyFinalPayments));
  }, [currentMonth, filterMode, staffId, onlyHolidays, onlyFinalPayments, isHydrated]);

  // 기존 state 호환을 위해 유지 (또는 calendarData 직접 사용으로 리팩토링)
  const schedules = calendarData.schedules;
  const contracts = calendarData.contracts;
  const isLoading = isCalendarLoading;

  // 검색 결과 필터링
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    const matchedSchedules = schedules.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    ).map(s => ({ ...s, eventType: "schedule" as const }));

    const matchedContracts = contracts.filter(c => 
      c.siteName.toLowerCase().includes(q) || 
      (c.customerName && c.customerName.toLowerCase().includes(q))
    ).map(c => ({
      id: `contract-${c.id}`,
      title: `잔금: ${c.siteName}`,
      startDate: c.finalPaymentDate,
      endDate: c.finalPaymentDate,
      eventType: "contract" as const,
      originalData: c
    }));

    return [...matchedSchedules, ...matchedContracts].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ).slice(0, 10); // 최대 10개만 표시
  }, [searchQuery, schedules, contracts]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { locale: ko }),
      end: endOfWeek(monthEnd, { locale: ko })
    });
  }, [currentMonth]);

  const getDaySchedules = (day: Date) => {
    const d = startOfDay(day);
    const dayStr = format(d, "yyyy-MM-dd");

    // 1) 일반 일정 필터링
    const daySchedules = schedules
      .filter(s => {
        const start = startOfDay(new Date(s.startDate));
        const end = endOfDay(new Date(s.endDate));
        const isInRange = d >= start && d <= end;
        if (!isInRange) return false;
        return true;
      })
      .map(s => ({
        ...s,
        eventType: "schedule" as const
      }));

    // 2) 계약 잔금일 필터링 (가상 이벤트 생성)
    const dayContracts = contracts
      .filter(c => {
        if (!c.finalPaymentDate) return false;
        // c.finalPaymentDate(YYYY-MM-DD...)와 dayStr(YYYY-MM-DD) 직접 비교
        const cDateStr = c.finalPaymentDate.split('T')[0];
        return cDateStr === dayStr;
      })
      .map(c => ({
        id: `contract-${c.id}`,
        title: `잔금: ${c.siteName}`,
        startDate: c.finalPaymentDate,
        endDate: c.finalPaymentDate,
        category: "잔금",
        color: "royal", // 잔금일 전용 색상
        location: c.siteName,
        customerPhone: c.customerPhone,
        salesTeamPhone: c.salesTeamPhone,
        creator: {
          id: c.createdByAccountId || "",
          name: c.createdByName
        },
        status: c.status,
        eventType: "contract" as const,
        originalData: c
      }));

    // 3) 최종 필터링
    let finalSchedules = [...daySchedules, ...dayContracts];
    if (onlyFinalPayments) {
      finalSchedules = finalSchedules.filter(s => s.eventType === "contract");
    } else if (onlyHolidays) {
      // 휴무일만 볼 때는 계약 잔금일 일정을 제외
      finalSchedules = finalSchedules.filter(s => s.eventType === "schedule");
    }

    return finalSchedules
      .sort((a, b) => {
        // 우선순위 점수 계산 (낮을수록 상단)
        const getPriority = (item: any) => {
          if (item.category === "휴무") return 1;
          if (item.eventType === "schedule") return 2;
          if (item.eventType === "contract") return 3;
          return 4;
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return 0;
      });
  };

  const [sheetSide, setSheetSide] = useState<"bottom" | "right">("bottom");

  useEffect(() => {
    const handleResize = () => {
      setSheetSide(window.innerWidth < 640 ? "bottom" : "right");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDayClick = (day: Date, openAgenda: boolean = true) => {
    setSelectedDate(day);
    if (openAgenda) {
      setIsAgendaOpen(true);
    }
  };

  const handleScheduleClick = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (item.eventType === "contract") {
      // 계약 상세 데이터로 변환 (originalData 사용 또는 API 재조회)
      try {
        const { getContract } = await import("@/features/contract-records/api/contracts");
        const fullContract = await getContract(item.originalData.id);

        // SalesContractRecordsModal은 SalesContractData 형식을 기대하므로 변환 필요
        const { transformContractResponseToSalesContract } = await import("@/features/contract-records/utils/contractTransformers");
        const transformed = transformContractResponseToSalesContract(fullContract);

        setContractDefaultData(transformed as any);
        setIsContractModalOpen(true);
      } catch (err) {
        console.error("Failed to load contract detail:", err);
      }
    } else {
      setSelectedSchedule(item);
      setSelectedDate(new Date(item.startDate));
      setIsModalOpen(true);
    }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleCreateContract = (schedule: Schedule) => {
    setContractDefaultData({
      customerInfo: {
        name: schedule.title || "",
        contact: schedule.customerPhone || "",
      },
      contractSite: {
        siteName: schedule.location || "",
        address: "",
        teamContact: "",
      },
      contractDate: format(new Date(schedule.startDate), "yyyy-MM-dd"),
      scheduleId: String(schedule.id),
      staffAllocations: [
        {
          id: "company",
          name: "회사",
          type: "company",
          percentage: 100,
          isDirectInput: false,
          rebateAllowance: 0,
          finalAllowance: 0,
        },
        ...(schedule.creator ? [
          {
            id: "employee1",
            accountId: schedule.creator.id,
            name: schedule.creator.name,
            type: "employee",
            percentage: 0,
            isDirectInput: false,
            rebateAllowance: 0,
            finalAllowance: 0,
          }
        ] : [])
      ]
    } as any);
    setIsContractModalOpen(true);
  };

  const getScheduleColor = (category: string, colorId?: string) => {
    const colorMap: Record<string, any> = {
      red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-400", dark: "bg-red-500" },
      rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-400", dark: "bg-rose-500" },
      pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-400", dark: "bg-pink-500" },
      fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-400", dark: "bg-fuchsia-500" },
      purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-400", dark: "bg-purple-500" },
      violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-400", dark: "bg-violet-500" },
      blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-400", dark: "bg-blue-500" },
      indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-400", dark: "bg-indigo-500" },
      sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-400", dark: "bg-sky-500" },
      cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-400", dark: "bg-cyan-500" },
      teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-400", dark: "bg-teal-500" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-400", dark: "bg-emerald-500" },
      green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-400", dark: "bg-green-500" },
      lime: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", dot: "bg-lime-400", dark: "bg-lime-500" },
      yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-400", dark: "bg-yellow-500" },
      amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400", dark: "bg-amber-500" },
      orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400", dark: "bg-orange-500" },
      brown: { bg: "bg-orange-100/50", text: "text-orange-900", border: "border-orange-300", dot: "bg-orange-700", dark: "bg-orange-800" },
      slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", dark: "bg-slate-500" },
      gray: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400", dark: "bg-gray-500" },
      zinc: { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200", dot: "bg-zinc-400", dark: "bg-zinc-500" },
      stone: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200", dot: "bg-stone-400", dark: "bg-stone-500" },
      neutral: { bg: "bg-neutral-100", text: "text-neutral-700", border: "border-neutral-200", dot: "bg-neutral-400", dark: "bg-neutral-500" },
      "d-blue": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-600", dark: "bg-blue-700" },
      "d-red": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", dot: "bg-red-600", dark: "bg-red-700" },
      "d-green": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-600", dark: "bg-emerald-700" },
      "d-purple": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", dot: "bg-purple-600", dark: "bg-purple-700" },
      "d-orange": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-600", dark: "bg-orange-700" },
      gold: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", dot: "bg-yellow-600", dark: "bg-yellow-700" },
      royal: { bg: "bg-black", text: "text-white", border: "border-black", dot: "bg-white", dark: "bg-zinc-900" },
    };
    if (colorId && colorMap[colorId]) return colorMap[colorId];
    switch (category) {
      case "휴무": return colorMap.gray;
      case "직방": return colorMap.orange;
      case "다방": return colorMap.blue;
      case "네이버": return colorMap.green;
      default: return colorMap.purple;
    }
  };

  const getUserColor = (userId: string) => {
    const colors = ["bg-rose-400", "bg-amber-400", "bg-lime-400", "bg-cyan-400", "bg-indigo-400", "bg-fuchsia-400"];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden w-full">
      {/* 프리미엄 헤더 */}
      <div className="flex items-center justify-between px-2 sm:px-6 py-2 sm:py-3 border-b bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all active:scale-95 group"
            title="홈으로 이동"
          >
            <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </button>

          <div className="flex items-center gap-0.5 sm:gap-2 bg-white p-1 sm:p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-emerald-600 transition-all"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <div className="flex items-center">
              <Select
                value={format(currentMonth, "yyyy")}
                onValueChange={(val) => {
                  const newDate = new Date(currentMonth);
                  newDate.setFullYear(parseInt(val));
                  setCurrentMonth(newDate);
                }}
              >
                <SelectTrigger className="h-8 sm:h-10 border-none bg-transparent hover:bg-gray-50 rounded-xl px-0.5 sm:px-1 font-black text-xs sm:text-lg focus:ring-0 w-auto">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                  {Array.from({ length: 21 }, (_, i) => {
                    const year = new Date().getFullYear() - 10 + i;
                    return (
                      <SelectItem key={year} value={String(year)} className="rounded-xl font-bold">
                        {String(year).slice(-2)}년
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select
                value={format(currentMonth, "M")}
                onValueChange={(val) => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(parseInt(val) - 1);
                  setCurrentMonth(newDate);
                }}
              >
                <SelectTrigger className="h-8 sm:h-10 border-none bg-transparent hover:bg-gray-50 rounded-xl px-0.5 sm:px-1 font-black text-xs sm:text-lg focus:ring-0 w-auto">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="rounded-xl font-bold">
                      {i + 1}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-emerald-600 transition-all"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          {/* 검색창 추가 */}
          <div className="relative hidden md:block">
            <div className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-xl border transition-all bg-white/50",
              isSearchFocused ? "border-emerald-500 w-64 shadow-lg shadow-emerald-50" : "border-gray-200 w-48"
            )}>
              <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isSearchFocused && "rotate-90 text-emerald-500")} />
              <input
                type="text"
                placeholder="일정 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="bg-transparent border-none outline-none text-xs font-bold w-full placeholder:text-gray-300"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-300 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-gray-100 shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-[300px] overflow-y-auto premium-scrollbar">
                  {searchResults.map((result: any) => (
                    <div
                      key={result.id}
                      onClick={() => {
                        const date = new Date(result.startDate);
                        setCurrentMonth(date);
                        setSelectedDate(date);
                        setIsAgendaOpen(true);
                        setSearchQuery("");
                      }}
                      className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-none group/res"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          {format(new Date(result.startDate), "MM/dd")}
                        </span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase">
                          {result.eventType === "contract" ? "잔금일" : result.category}
                        </span>
                      </div>
                      <div className="text-xs font-black text-gray-700 truncate group-hover/res:text-emerald-700">
                        {result.title}
                      </div>
                      {result.location && (
                        <div className="text-[10px] font-bold text-gray-400 truncate mt-0.5">
                          {result.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTrashOpen(true)}
            className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl text-gray-500 hover:bg-gray-100 font-bold"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm ml-2">삭제 내역</span>
          </Button>

          {isPowerful && (
              <div className="hidden md:block">
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl border-gray-200 bg-white/50 text-xs font-bold">
                    <SelectValue placeholder="직원 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 직원</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.accountId} value={emp.accountId}>
                        {emp.name || "이름없음"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          {isPowerful && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextValue = !onlyFinalPayments;
                setOnlyFinalPayments(nextValue);
                if (nextValue) setOnlyHolidays(false);
              }}
              className={cn(
                "h-8 sm:h-9 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all",
                onlyFinalPayments ? "bg-black text-white border-none shadow-gray-200 hover:bg-zinc-800" : "border-gray-200 bg-white/50 text-gray-600"
              )}
            >
              잔금일만
            </Button>
          )}

          <Button
            variant={onlyHolidays ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const nextValue = !onlyHolidays;
              setOnlyHolidays(nextValue);
              if (nextValue) {
                setOnlyFinalPayments(false);
              }
            }}
            className={cn(
              "h-8 sm:h-9 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all",
              onlyHolidays ? "bg-amber-500 hover:bg-amber-600 border-none shadow-amber-100" : "border-gray-200 bg-white/50 text-gray-600"
            )}
          >
            휴무일만
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto premium-scrollbar relative group/calendar bg-gray-50/30 w-full">
        <div className="grid grid-cols-7 border-b bg-gray-50/80 backdrop-blur-sm sticky top-0 z-20 w-full">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
            <div key={day} className={cn(
              "py-3 text-center text-[10px] sm:text-xs font-black tracking-widest uppercase",
              i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-gray-400"
            )}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr min-h-full bg-white divide-x divide-y divide-gray-100/80 w-full">
          {days.map((day, i) => {
            const daySchedules = getDaySchedules(day);
            const holiday = getKoreanHoliday(day);
            const isCurrMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[100px] sm:min-h-[180px] pt-1 sm:pt-2 px-0 transition-all hover:bg-emerald-50/20 group/day cursor-pointer flex flex-col relative w-full overflow-hidden",
                  !isCurrMonth && "bg-gray-50/50 opacity-40 grayscale-[0.5]"
                )}
              >
                <div className="flex justify-between items-start mb-0.5 sm:mb-3 px-0.5 sm:px-2 w-full">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[10px] sm:text-[15px] font-black w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-all group-hover/day:bg-white group-hover/day:shadow-sm",
                      isToday(day) ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" :
                        holiday ? "text-rose-500" :
                          i % 7 === 0 ? "text-rose-500" :
                            i % 7 === 6 ? "text-blue-500" : "text-gray-900"
                    )}>
                      {format(day, "d")}
                    </span>
                    {holiday && (
                      <span className="text-[8px] sm:text-[10px] font-black text-rose-500 mt-0.5 ml-1 leading-none tracking-tighter">
                        {holiday}
                      </span>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(day);
                      setSelectedSchedule(null);
                      setIsModalOpen(true);
                    }}
                    className="opacity-0 group-hover/day:opacity-100 transition-all w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 w-full">
                  <div className="hidden sm:flex flex-col gap-0.5 w-full pb-2">
                    {daySchedules.map((s) => {
                      const isMultiDay = new Date(s.startDate).toDateString() !== new Date(s.endDate).toDateString();
                      const isStart = isSameDay(day, new Date(s.startDate));
                      const isEnd = isSameDay(day, new Date(s.endDate));

                      return (
                        <div
                          key={s.id}
                          onClick={(e) => handleScheduleClick(e, s)}
                          onMouseEnter={() => {
                            const cId = s.eventType === "contract" ? s.originalData.id : s.contractId;
                            if (cId) setHoveredContractId(Number(cId));
                          }}
                          onMouseLeave={() => setHoveredContractId(null)}
                          className={cn(
                            "relative flex items-center transition-all text-[12px] font-bold select-none h-[22px] mb-[1px] shrink-0 cursor-pointer group/label",
                            (isMultiDay || s.category === "휴무") ? (
                              cn(
                                "text-white shadow-sm border-t border-b border-white/10 z-10",
                                getScheduleColor(s.category, s.color).dark,
                                isStart ? "rounded-l-md ml-1" : "-ml-[1px] pl-[1px]",
                                isEnd ? "rounded-r-md mr-1" : "-mr-[1px] pr-[1px]",
                                !isStart && !isEnd && "rounded-none",
                                "hover:brightness-110 hover:shadow-lg hover:z-20 hover:scale-[1.01]"
                              )
                            ) : (
                              cn(
                                "rounded-md mx-1 font-bold flex items-center shadow-sm border border-black/[0.03]",
                                getScheduleColor(s.category, s.color).bg,
                                getScheduleColor(s.category, s.color).text,
                                s.color === "royal" ? "hover:bg-zinc-800" : "hover:bg-white",
                                "hover:border-emerald-300 hover:shadow-md hover:z-20 hover:scale-[1.01]"
                              )
                            ),
                            hoveredContractId !== null && hoveredContractId === (s.eventType === "contract" ? s.originalData.id : s.contractId) && "animate-label-pop border-blue-400 ring-2 ring-blue-100 z-30"
                          )}
                        >
                          {isStart && (
                            <div className={cn("absolute left-0 top-0 bottom-0 w-[2px] z-20", getUserColor(s.creator?.id || ""))} />
                          )}
                          {(isStart || (i % 7 === 0 && !isStart)) && (
                            <div className={cn("flex items-center justify-between gap-1 w-full min-w-0", isStart || !isMultiDay ? "pl-1.5 pr-1" : "pl-1 pr-1")}>
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                {!isMultiDay && !(s.eventType === "contract" && s.status === "done") && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", getScheduleColor(s.category, s.color).dot)} />}
                                <span className={cn(
                                  "truncate",
                                  (s.status === "canceled" || s.status === "rejected") && "line-through decoration-red-500 decoration-2 opacity-60"
                                )}>
                                  {s.eventType === "contract" ? (
                                    <span className="flex items-center gap-1">
                                      {s.status === "done" ? (
                                        <Check className="w-3.5 h-3.5 text-green-500 stroke-[3px] shrink-0" />
                                      ) : (
                                        <Banknote className="w-3 h-3 shrink-0" />
                                      )}
                                      {s.title}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      {s.contractId && <FileText className="w-3 h-3 text-blue-500 shrink-0" />}
                                      {`[${s.category === "휴무" ? "휴무" : `${s.category}/${s.platform || "기타"}`}] ${s.location || ""} ${s.customerPhone ? s.customerPhone.slice(-4) : ""}`}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className="shrink-0 text-[11px] font-black opacity-90 ml-1">
                                {s.creator?.name || "유저"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex sm:hidden flex-col gap-0.5 w-full pb-1 mt-1">
                    {daySchedules.slice(0, 3).map((s) => {
                      const isMultiDay = new Date(s.startDate).toDateString() !== new Date(s.endDate).toDateString();
                      const isStart = isSameDay(day, new Date(s.startDate));
                      const isEnd = isSameDay(day, new Date(s.endDate));

                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "relative flex items-center justify-center overflow-hidden transition-all text-[10px] font-black h-[18px] leading-none select-none",
                            (isMultiDay || s.category === "휴무") ? (
                              cn(
                                "text-white z-10",
                                getScheduleColor(s.category, s.color).dark,
                                isStart ? "rounded-l-sm ml-0.5" : "-ml-[1px]",
                                isEnd ? "rounded-r-sm mr-0.5" : "-mr-[1px]",
                                !isStart && !isEnd && "rounded-none",
                              )
                            ) : (
                              cn(
                                "rounded-sm mx-0",
                                getScheduleColor(s.category, s.color).bg,
                                getScheduleColor(s.category, s.color).text,
                                "border border-black/[0.03]"
                              )
                            )
                          )}
                        >
                          {/* 중앙 정렬 크롭을 위한 절대 위치 래퍼 */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="whitespace-nowrap px-0.5 shrink-0 min-w-0 text-center">
                              {(isStart || (i % 7 === 0 && !isStart) || !isMultiDay) && (
                                `${s.creator?.name || "유저"}: ${s.eventType === "contract" ? s.title : (s.location || s.title)}`
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Sheet open={isAgendaOpen} onOpenChange={setIsAgendaOpen}>
        <SheetContent
          side={sheetSide}
          className={cn(
            "p-0 flex flex-col bg-white border-none shadow-2xl overflow-hidden",
            sheetSide === "bottom" ? "rounded-t-[40px] h-[85vh]" : "w-[400px]"
          )}
          style={{
            transform: `translate(${dragX}px, ${dragY}px)`,
            transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)"
          }}
        >
          {/* 가로 스와이프 힌트 UI */}
          {Math.abs(dragX) > 20 && (
            <div className={cn(
              "absolute inset-y-0 flex items-center px-6 pointer-events-none z-50 transition-opacity duration-300",
              dragX > 0 ? "left-0 bg-gradient-to-r from-emerald-500/20 to-transparent" : "right-0 bg-gradient-to-l from-emerald-500/20 to-transparent",
              Math.abs(dragX) > 50 ? "opacity-100 scale-110" : "opacity-0 scale-90"
            )}>
              <div className="flex flex-col items-center gap-2">
                {dragX > 0 ? (
                  <>
                    <ChevronLeft className="w-8 h-8 text-emerald-600 animate-bounce-x-reverse" />
                    <span className="text-xs font-black text-emerald-700 whitespace-nowrap bg-white/80 px-2 py-1 rounded-full shadow-sm">이전 날짜</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-8 h-8 text-emerald-600 animate-bounce-x" />
                    <span className="text-xs font-black text-emerald-700 whitespace-nowrap bg-white/80 px-2 py-1 rounded-full shadow-sm">다음 날짜</span>
                  </>
                )}
              </div>
            </div>
          )}

          {sheetSide === "bottom" && (
            <div
              className="w-full flex justify-center py-4 shrink-0 bg-white cursor-row-resize touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <SheetHeader
              className={cn(
                "px-5 py-3 flex flex-row items-center justify-between text-left space-y-0 border-b bg-white/50 backdrop-blur-sm",
                sheetSide === "right" && "pt-6",
              )}
            >
              <div className="flex flex-col">
                <SheetTitle className="text-xl font-black text-gray-900 leading-none">
                  {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
                </SheetTitle>
                <SheetDescription className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">
                  Today's Schedule Agenda
                </SheetDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsAgendaOpen(false);
                    setSelectedSchedule(null);
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center transition-transform active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAgendaOpen(false);
                    setContractDefaultData({
                      contractDate: format(selectedDate, "yyyy-MM-dd"),
                    });
                    setIsContractModalOpen(true);
                  }}
                  className="w-10 h-10 rounded-xl border-gray-200 text-blue-600 shadow-sm flex items-center justify-center transition-transform active:scale-95"
                >
                  <FileText className="w-5 h-5" />
                </Button>
              </div>
            </SheetHeader>

            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 premium-scrollbar pb-10"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {getDaySchedules(selectedDate).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 opacity-30 grayscale">
                  <div className="w-16 h-16 rounded-[24px] bg-gray-100 flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-black text-gray-400">등록된 일정이 없습니다.</p>
                </div>
              ) : (
                getDaySchedules(selectedDate).map((s) => (
                  <div
                    key={s.id}
                    onClick={(e) => handleScheduleClick(e, s)}
                    onMouseEnter={() => {
                      const cId = s.eventType === "contract" ? s.originalData.id : s.contractId;
                      if (cId) setHoveredContractId(Number(cId));
                    }}
                    onMouseLeave={() => setHoveredContractId(null)}
                    className={cn(
                      "p-4 rounded-3xl border bg-white shadow-sm hover:shadow-md transition-all active:scale-[0.98] group/item cursor-pointer",
                      getScheduleColor(s.category, s.color).border,
                      hoveredContractId !== null && hoveredContractId === (s.eventType === "contract" ? s.originalData.id : s.contractId) && "animate-label-pop ring-4 ring-blue-100 border-blue-400 z-10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider", getScheduleColor(s.category, s.color).bg, getScheduleColor(s.category, s.color).text)}>
                          {s.category}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", getScheduleColor(s.category, s.color).dot)} />
                          <span className="text-[10px] font-black text-gray-400 tracking-tight">
                            {s.eventType === "contract" ? "계약 잔금 예정일" : (s.isAllDay ? "종일" : `${format(new Date(s.startDate), "HH:mm")} - ${format(new Date(s.endDate), "HH:mm")}`)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-300 group-hover/item:text-emerald-600 transition-colors">
                          {s.creator?.name}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "text-sm sm:text-base font-black text-gray-900 group-hover/item:text-emerald-700 transition-colors",
                      (s.status === "canceled" || s.status === "rejected") && "line-through decoration-red-500 opacity-60"
                    )}>
                      {(s.eventType === "contract" || s.contractId) && (
                        <FileText className="w-4 h-4 inline mr-1 text-blue-500" />
                      )}
                      {s.eventType === "contract" ? (
                        s.title
                      ) : (
                        `[${s.category === "휴무" ? "휴무" : `${s.category}/${s.platform || "기타"}`}] ${s.location || ""} ${s.customerPhone ? s.customerPhone.slice(-4) : ""}`
                      )}
                    </div>
                    {s.location && (
                      <div className="mt-2 text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                        <HomeIcon className="w-3 h-3" />
                        {s.location}
                      </div>
                    )}
                    {s.salesTeamPhone && (
                      <div className="mt-1 text-[11px] font-bold text-blue-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        분양팀: {s.salesTeamPhone}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden sm:flex fixed bottom-10 right-10 flex-col gap-3 z-40">
        <button
          onClick={() => {
            setContractDefaultData({
              contractDate: format(new Date(), "yyyy-MM-dd"),
            });
            setIsContractModalOpen(true);
          }}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-200 flex flex-col items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group"
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[8px] sm:text-[9px] font-black mt-0.5">계약</span>
        </button>

        <button
          onClick={() => {
            handleDayClick(new Date(), false);
            setSelectedSchedule(null);
            setIsModalOpen(true);
          }}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-200 flex flex-col items-center justify-center text-white hover:scale-110 hover:-rotate-3 active:scale-95 transition-all group"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[9px] sm:text-[10px] font-black">일정</span>
        </button>
      </div>

      <div className="flex items-center justify-around py-3 bg-white border-t sm:hidden z-40 px-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="flex flex-col gap-1 text-gray-400 hover:text-emerald-600">
          <HomeIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-tight">홈</span>
        </Button>
        <Button variant="ghost" className="flex flex-col gap-1 text-emerald-600">
          <CalIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-tight text-emerald-600">달력</span>
        </Button>
      </div>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        schedule={selectedSchedule}
        onDataChange={refetchCalendar}
        userProfile={profile}
        onCreateContract={handleCreateContract}
      />

      <ScheduleTrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestored={refetchCalendar}
      />

      <SalesContractRecordsModal
        isOpen={isContractModalOpen}
        onClose={() => {
          setIsContractModalOpen(false);
          setContractDefaultData(null);
        }}
        onDataChange={() => refetchCalendar()}
        data={contractDefaultData as any}
      />
    </div>
  );
}
