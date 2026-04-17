"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  getYear,
  getMonth,
  setYear,
  setMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Bell, Calendar as CalIcon, Trash2, Home } from "lucide-react";
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
import { getProfile } from "@/features/users/api/account";
import { useQuery } from "@tanstack/react-query";
import { ScheduleTrashModal } from "./ScheduleTrashModal";
import { getKoreanHoliday } from "../utils/holiday";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/atoms/Sheet/Sheet";

export default function ScheduleCalendar() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragYRef = React.useRef(0);
  const startYRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.targetTouches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const currentY = e.targetTouches[0].clientY;
    const delta = currentY - startYRef.current;
    if (delta > 0) {
      setDragY(delta);
      dragYRef.current = delta;
    }
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
    setIsDragging(false);
    if (dragYRef.current > 100) {
      setIsAgendaOpen(false);
    }
    setDragY(0);
    dragYRef.current = 0;
  };

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);

      const data = await getSchedules(
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      setSchedules(data);
    } catch (error) {
      console.error("Failed to load schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [currentMonth]);

  const getDaySchedules = (day: Date) => {
    const d = startOfDay(day);
    return schedules
      .filter(s => {
        const start = startOfDay(new Date(s.startDate));
        const end = endOfDay(new Date(s.endDate));
        const isInRange = d >= start && d <= end;
        if (!isInRange) return false;

        if (filterMode === "mine") {
          return String(s.creator?.id) === String(profile?.account?.id);
        }
        return true;
      })
      .sort((a, b) => {
        const durA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
        const durB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
        return durB - durA;
      });
  };

  // slim logic removed as per user request to always show full labels and expand row height

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

  const handleScheduleClick = (e: React.MouseEvent, schedule: Schedule) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
    setSelectedDate(new Date(schedule.startDate));
    setIsModalOpen(true);
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // 일정 컬러 매핑 (카테고리 기본값 또는 수동 지정값)
  const getScheduleColor = (category: string, colorId?: string) => {
    const colorMap: Record<string, any> = {
      // Red & Pink
      red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-400", dark: "bg-red-500" },
      rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-400", dark: "bg-rose-500" },
      pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-400", dark: "bg-pink-500" },
      fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-400", dark: "bg-fuchsia-500" },
      purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-400", dark: "bg-purple-500" },
      violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-400", dark: "bg-violet-500" },

      // Blue & Cyan
      blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-400", dark: "bg-blue-500" },
      indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-400", dark: "bg-indigo-500" },
      sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-400", dark: "bg-sky-500" },
      cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-400", dark: "bg-cyan-500" },
      teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-400", dark: "bg-teal-500" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-400", dark: "bg-emerald-500" },

      // Green & Yellow
      green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-400", dark: "bg-green-500" },
      lime: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", dot: "bg-lime-400", dark: "bg-lime-500" },
      yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-400", dark: "bg-yellow-500" },
      amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400", dark: "bg-amber-500" },
      orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400", dark: "bg-orange-500" },
      brown: { bg: "bg-orange-100/50", text: "text-orange-900", border: "border-orange-300", dot: "bg-orange-700", dark: "bg-orange-800" },

      // Gray & Earth
      slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", dark: "bg-slate-500" },
      gray: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400", dark: "bg-gray-500" },
      zinc: { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200", dot: "bg-zinc-400", dark: "bg-zinc-500" },
      stone: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200", dot: "bg-stone-400", dark: "bg-stone-500" },
      neutral: { bg: "bg-neutral-100", text: "text-neutral-700", border: "border-neutral-200", dot: "bg-neutral-400", dark: "bg-neutral-500" },

      // Darker / Saturated Variations
      "d-blue": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-600", dark: "bg-blue-700" },
      "d-red": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", dot: "bg-red-600", dark: "bg-red-700" },
      "d-green": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-600", dark: "bg-emerald-700" },
      "d-purple": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", dot: "bg-purple-600", dark: "bg-purple-700" },
      "d-orange": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-600", dark: "bg-orange-700" },
      gold: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", dot: "bg-yellow-600", dark: "bg-yellow-700" },
      royal: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300", dot: "bg-indigo-600", dark: "bg-indigo-700" },
    };

    // 1. 수동 지정 컬러가 있는 경우
    if (colorId && colorMap[colorId]) return colorMap[colorId];

    // 2. 카테고리별 기본 컬러 매핑
    switch (category) {
      case "휴무": return colorMap.gray;
      case "직방": return colorMap.orange;
      case "다방": return colorMap.blue;
      case "네이버": return colorMap.green;
      default: return colorMap.purple;
    }
  };

  // 유저별 고유 포인트 색상 생성 (해시 기반)
  const getUserColor = (userId: string) => {
    const colors = ["bg-rose-400", "bg-amber-400", "bg-lime-400", "bg-cyan-400", "bg-indigo-400", "bg-fuchsia-400"];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* 프리미엄 헤더 */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center justify-center p-2 text-gray-400 hover:text-emerald-600 rounded-full h-9 w-9 shrink-0"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex items-center min-w-0 overflow-hidden">
            {/* 년도 선택 */}
            <Select
              value={String(getYear(currentMonth))}
              onValueChange={(v) => setCurrentMonth(setYear(currentMonth, Number(v)))}
            >
              <SelectTrigger className="w-fit h-11 sm:h-9 border-none bg-transparent font-black text-xl sm:text-2xl p-0 px-1 focus:ring-0 gap-0.5 hover:bg-gray-50 rounded-lg transition-colors shrink-0">
                <SelectValue />
                <span className="text-gray-400 font-medium text-xs sm:text-base ml-1">년</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => getYear(new Date()) - 5 + i).map(y => (
                  <SelectItem key={y} value={String(y)} className="font-bold text-sm">{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 월 선택 */}
            <Select
              value={String(getMonth(currentMonth))}
              onValueChange={(v) => setCurrentMonth(setMonth(currentMonth, Number(v)))}
            >
              <SelectTrigger className="w-fit h-11 sm:h-9 border-none bg-transparent font-black text-xl sm:text-2xl p-0 px-1 focus:ring-0 gap-0.5 hover:bg-gray-50 rounded-lg transition-colors ml-1 shrink-0">
                <SelectValue />
                <span className="text-gray-400 font-medium text-xs sm:text-base ml-1">월</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i).map(m => (
                  <SelectItem key={m} value={String(m)} className="font-bold text-sm">{m + 1}월</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center ml-1 border-l pl-1 border-gray-100 shrink-0">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 transition-transform active:scale-90">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 transition-transform active:scale-90">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTrashOpen(true)}
            className="flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold h-9 w-9 sm:w-auto sm:px-3"
          >
            <Trash2 className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm ml-2">삭제 내역</span>
          </Button>
        </div>
      </div>

      {/* 필터 탭 (모바일 대응) */}
      <div className="flex gap-2 px-4 sm:px-6 py-3 bg-gray-50/50 border-b overflow-x-auto premium-scrollbar">
        <button
          onClick={() => setFilterMode("all")}
          className={cn(
            "flex items-center px-5 py-2.5 rounded-full bg-white border text-xs sm:text-sm font-bold gap-2 transition-all shadow-sm whitespace-nowrap shrink-0",
            filterMode === "all" ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-700" : "border-gray-200 text-gray-400"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", filterMode === "all" ? "bg-emerald-500" : "bg-gray-300")} />
          공유 캘린더
        </button>
        <button
          onClick={() => setFilterMode("mine")}
          className={cn(
            "flex items-center px-5 py-2.5 rounded-full bg-white border text-xs sm:text-sm font-bold gap-2 transition-all shadow-sm whitespace-nowrap shrink-0",
            filterMode === "mine" ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-700" : "border-gray-200 text-gray-400"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", filterMode === "mine" ? "bg-blue-500" : "bg-gray-300")} />
          내 일정만 보기
        </button>
      </div>

      <div className="grid grid-cols-7 border-b text-center py-2 bg-white sticky top-[113px] sm:top-[73px] z-20">
        {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
          <div key={day} className={cn("text-[10px] sm:text-[11px] font-bold py-1", i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-400 uppercase tracking-widest")}>
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto premium-scrollbar">
        {/* 달력 그리드 영역 */}
        <div className={cn(
          "grid grid-cols-7 auto-rows-min min-h-0",
          "h-auto sm:h-auto" // 고정 높이 제거하여 모든 일정 노출
        )}>
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const daySchedules = getDaySchedules(day);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[100px] sm:min-h-[150px] border-r border-b border-gray-100 flex flex-col hover:bg-gray-50/60 transition-all cursor-pointer group relative",
                  !isCurrentMonth && "bg-gray-50/20 opacity-30",
                  isSelected && "bg-emerald-50/50 ring-1 ring-inset ring-emerald-500/20"
                )}
              >
                <div className="flex items-center justify-between px-1 sm:px-2 pt-1 sm:pt-2 mb-0.5 sm:mb-1">
                  <span className={cn(
                    "text-[10px] sm:text-[11px] font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-all",
                    isToday(day)
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                      : (i % 7 === 0 || !!getKoreanHoliday(day))
                        ? "text-red-500"
                        : i % 7 === 6
                          ? "text-blue-500"
                          : "text-gray-700",
                    !isCurrentMonth && "opacity-50",
                    isSelected && !isToday(day) && "bg-emerald-100 text-emerald-700"
                  )}>
                    {format(day, "d")}
                  </span>

                  {getKoreanHoliday(day) && (
                    <span className="absolute top-1 left-7 sm:left-9 text-[9px] font-bold text-red-400 whitespace-nowrap hidden sm:block">
                      {getKoreanHoliday(day)}
                    </span>
                  )}

                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-lg bg-gray-50 text-gray-400 transition-all hover:bg-emerald-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100",
                      "active:scale-95"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(day, false);
                      setSelectedSchedule(null);
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 w-full">
                  {/* PC 버전: 모든 일정 상세 바(Detailed Bar)로 렌더링 */}
                  <div className="hidden sm:flex flex-col gap-0.5 w-full pb-2">
                    {daySchedules.map((s) => {
                      const isStart = isSameDay(new Date(s.startDate), day);
                      const isEnd = isSameDay(new Date(s.endDate), day);
                      const isMultiDay = !isSameDay(new Date(s.startDate), new Date(s.endDate));

                      return (
                        <div
                          key={s.id}
                          onClick={(e) => handleScheduleClick(e, s)}
                          className={cn(
                            "relative flex items-center transition-all text-[12px] font-bold select-none h-[22px] mb-[1px] shrink-0",
                            isMultiDay ? (
                              cn(
                                "text-white shadow-sm border-t border-b border-white/10 z-10",
                                getScheduleColor(s.category, s.color).dark,
                                isStart ? "rounded-l-md ml-1" : "-ml-[1px]",
                                isEnd ? "rounded-r-md mr-1" : "-mr-[1px]",
                                !isStart && !isEnd && "rounded-none",
                              )
                            ) : (
                              cn(
                                "rounded-md mx-1 font-bold flex items-center shadow-sm border border-black/[0.03]",
                                getScheduleColor(s.category, s.color).bg,
                                getScheduleColor(s.category, s.color).text
                              )
                            )
                          )}
                        >
                          {isStart && (
                            <div className={cn("absolute left-0 top-0 bottom-0 w-[2px] z-20", getUserColor(s.creator?.id || ""))} />
                          )}
                            {(isStart || (i % 7 === 0 && !isStart)) && (
                              <div className={cn("flex items-center justify-between gap-1 w-full min-w-0", isStart || !isMultiDay ? "pl-1.5 pr-1" : "pl-1 pr-1")}>
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  {!isMultiDay && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", getScheduleColor(s.category, s.color).dot)} />}
                                  <span className="truncate">
                                    [{s.category === "휴무" ? "휴무" : `${s.meetingType || "신규"}/${s.category || "기타"}`}] {s.location || ""} {s.customerPhoneLast4 || ""}
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

                  {/* 모바일 버전: 컬러 도트로 간결하게 표시 */}
                  <div className="flex sm:hidden flex-wrap gap-1 px-1 justify-center mt-auto pb-1.5">
                    {daySchedules.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "w-2 h-2 rounded-full shadow-sm",
                          getScheduleColor(s.category, s.color).dot
                        )}
                      />
                    ))}
                    {daySchedules.length > 4 && (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 어댑티브 일정 드로어 (모바일: 바텀 / PC: 사이드) */}
      <Sheet open={isAgendaOpen} onOpenChange={setIsAgendaOpen}>
        <SheetContent
          side={sheetSide}
          className={cn(
            "p-0 border-none shadow-2xl outline-none flex flex-col",
            sheetSide === "bottom"
              ? "h-[100dvh] rounded-t-[24px]"
              : "h-screen w-[400px] sm:max-w-md bg-white/95 backdrop-blur-xl border-l border-gray-100"
          )}
          style={{
            transform: sheetSide === "bottom" && dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0, 0, 0.2, 1)",
          }}
        >
          {/* 드래그 핸들 (모바일 전용) - 터치 이벤트 연결 */}
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
                sheetSide === "bottom" && "touch-none" // 모바일 헤더 영역에서 드래그 시 닫기 위해
              )}
              onTouchStart={sheetSide === "bottom" ? handleTouchStart : undefined}
              onTouchMove={sheetSide === "bottom" ? handleTouchMove : undefined}
              onTouchEnd={sheetSide === "bottom" ? handleTouchEnd : undefined}
            >

              <div className="flex flex-col">
                <SheetTitle className="text-xl font-black text-gray-900 leading-tight">
                  {format(selectedDate, "M월 d일 E요일", { locale: ko })}
                </SheetTitle>
                <SheetDescription className="hidden">
                  선택한 날짜의 상세 일정 목록입니다.
                </SheetDescription>
                {getKoreanHoliday(selectedDate) && (
                  <span className="text-[11px] font-bold text-red-500 mt-0.5">{getKoreanHoliday(selectedDate)}</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setIsAgendaOpen(false);
                  setSelectedSchedule(null);
                  setIsModalOpen(true);
                }}
                className="w-10 h-10 rounded-xl bg-gray-900 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 premium-scrollbar pb-10">
              {getDaySchedules(selectedDate).length > 0 ? (
                getDaySchedules(selectedDate).map((s) => {
                  const color = getScheduleColor(s.category, s.color);
                  return (
                    <div
                      key={s.id}
                      onClick={(e) => {
                        setIsAgendaOpen(false);
                        handleScheduleClick(e, s);
                      }}
                      className="flex items-center gap-3 bg-white/80 p-3.5 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                    >
                      <div className="w-12 shrink-0 flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400">
                          {s.isAllDay ? "종일" : format(new Date(s.startDate), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className={cn("w-1 h-8 rounded-full", color.dark)} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900 truncate">
                              <span className="text-blue-600 mr-1">
                                [{s.category === "휴무" ? "휴무" : `${s.meetingType}/${s.category}`}]
                              </span>
                              {s.location}
                              {s.customerPhoneLast4 && (
                                <span className="text-gray-400 ml-1.5 font-medium">({s.customerPhoneLast4})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm shrink-0",
                        getUserColor(s.creator?.id || "")
                      )}>
                        {s.creator?.name ? s.creator.name.substring(1, 4) : "유저"}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-300 space-y-2">
                  <div className="p-4 bg-gray-50 rounded-full">
                    <CalIcon className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-bold opacity-40">등록된 일정이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB: 신규 일정 */}
      <button
        onClick={() => {
          handleDayClick(new Date(), false);
          setSelectedSchedule(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-200 flex items-center justify-center text-white hover:scale-110 hover:-rotate-3 active:scale-95 transition-all z-40 group"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* 하단 탭바 (모바일 전용 최적화) */}
      <div className="flex items-center justify-around py-4 bg-white/90 backdrop-blur-md border-t sm:hidden fixed bottom-0 left-0 right-0 z-40 px-6 pb-8">
        <div className="flex flex-col items-center gap-1 text-emerald-600">
          <CalIcon className="w-6 h-6 " />
          <span className="text-[10px] font-bold">캘린더</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push("/")}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">지도</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400" onClick={() => setIsTrashOpen(true)}>
          <Trash2 className="w-6 h-6" />
          <span className="text-[10px] font-bold">휴지통</span>
        </div>
      </div>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSchedule(null);
        }}
        selectedDate={selectedDate}
        schedule={selectedSchedule}
        userProfile={profile}
        onDataChange={fetchSchedules}
      />

      <ScheduleTrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestored={fetchSchedules}
      />
    </div>
  );
}



