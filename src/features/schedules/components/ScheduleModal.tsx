"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/atoms/Dialog/Dialog";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { Textarea } from "@/components/atoms/Textarea/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { useToast } from "@/hooks/use-toast";
import {
  Schedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/schedules";
import { getEmployeesList, EmployeeListItem } from "@/features/users/api/account";
import { CalendarIcon, Trash2, Clock, User } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  schedule?: Schedule | null;
  onDataChange: () => void;
  userProfile?: any;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

export const SCHEDULE_COLORS = [
  { id: "red", label: "빨강", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-400", dark: "bg-red-500" },
  { id: "rose", label: "로즈", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-400", dark: "bg-rose-500" },
  { id: "pink", label: "분홍", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", dot: "bg-pink-400", dark: "bg-pink-500" },
  { id: "fuchsia", label: "푸시아", bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700", dot: "bg-fuchsia-400", dark: "bg-fuchsia-500" },
  { id: "purple", label: "보라", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-400", dark: "bg-purple-500" },
  { id: "violet", label: "바이올렛", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-400", dark: "bg-violet-500" },

  // Blue & Cyan
  { id: "blue", label: "파랑", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-400", dark: "bg-blue-500" },
  { id: "indigo", label: "인디고", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400", dark: "bg-indigo-500" },
  { id: "sky", label: "스카이", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-400", dark: "bg-sky-500" },
  { id: "cyan", label: "청록", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-400", dark: "bg-cyan-500" },
  { id: "teal", label: "틸", bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-400", dark: "bg-teal-500" },
  { id: "emerald", label: "에메랄드", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400", dark: "bg-emerald-500" },

  // Green & Yellow
  { id: "green", label: "초록", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-400", dark: "bg-green-500" },
  { id: "lime", label: "라임", bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", dot: "bg-lime-400", dark: "bg-lime-500" },
  { id: "yellow", label: "노랑", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400", dark: "bg-yellow-500" },
  { id: "amber", label: "호박", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400", dark: "bg-amber-500" },
  { id: "orange", label: "주황", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400", dark: "bg-orange-500" },
  { id: "brown", label: "갈색", bg: "bg-orange-100/50", border: "border-orange-300", text: "text-orange-900", dot: "bg-orange-700", dark: "bg-orange-800" },

  // Gray & Earth
  { id: "slate", label: "슬레이트", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400", dark: "bg-slate-500" },
  { id: "gray", label: "회색", bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-600", dot: "bg-gray-400", dark: "bg-gray-500" },
  { id: "zinc", label: "징크", bg: "bg-zinc-100", border: "border-zinc-200", text: "text-zinc-700", dot: "bg-zinc-400", dark: "bg-zinc-500" },
  { id: "stone", label: "스톤", bg: "bg-stone-100", border: "border-stone-200", text: "text-stone-700", dot: "bg-stone-400", dark: "bg-stone-500" },
  { id: "neutral", label: "뉴트럴", bg: "bg-neutral-100", border: "border-neutral-200", text: "text-neutral-700", dot: "bg-neutral-400", dark: "bg-neutral-500" },

  // Darker / Saturated Variations
  { id: "d-blue", label: "진파랑", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-600", dark: "bg-blue-700" },
  { id: "d-red", label: "진빨강", bg: "bg-red-100", border: "border-red-300", text: "text-red-800", dot: "bg-red-600", dark: "bg-red-700" },
  { id: "d-green", label: "진초록", bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-600", dark: "bg-emerald-700" },
  { id: "d-purple", label: "진보라", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800", dot: "bg-purple-600", dark: "bg-purple-700" },
  { id: "d-orange", label: "진주황", bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-600", dark: "bg-orange-700" },
  { id: "gold", label: "골드", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800", dot: "bg-yellow-600", dark: "bg-yellow-700" },
  { id: "royal", label: "로얄블루", bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800", dot: "bg-indigo-600", dark: "bg-indigo-700" },
];

export function ScheduleModal({
  isOpen,
  onClose,
  selectedDate,
  schedule,
  onDataChange,
  userProfile,
}: ScheduleModalProps) {
  const [category, setCategory] = useState("직방");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [customerPhoneLast4, setCustomerPhoneLast4] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState("blue");
  const [meetingType, setMeetingType] = useState("신규");
  const [assignedAccountId, setAssignedAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  const isPowerful = React.useMemo(() => {
    return userProfile?.role === "admin" || userProfile?.role === "manager";
  }, [userProfile]);

  const canEdit = React.useMemo(() => {
    if (!schedule) return true;
    const isOwner = String(schedule.creator?.id) === String(userProfile?.account?.id);
    return isPowerful || isOwner;
  }, [schedule, userProfile, isPowerful]);

  // 직원 목록 조회 (권한 있는 경우에만)
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployeesList(),
    enabled: !!isPowerful && isOpen,
  });

  useEffect(() => {
    if (schedule && isOpen) {
      const cats = ["휴무", "직방", "다방", "네이버"];
      if (cats.includes(schedule.category)) {
        setCategory(schedule.category || "기타");
        setCustomCategory("");
      } else {
        setCategory("기타");
        setCustomCategory(schedule.category || "");
      }
      setLocation(schedule.location || "");
      setCustomerPhoneLast4(schedule.customerPhoneLast4 || "");
      setMeetingType(schedule.meetingType || "신규");
      setTitle(schedule.title || "");
      setContent(schedule.content || "");
      setAssignedAccountId(schedule.creator?.id || "");

      try {
        const s = new Date(schedule.startDate);
        const e = new Date(schedule.endDate);
        setStartDate(format(s, "yyyy-MM-dd"));
        setEndDate(format(e, "yyyy-MM-dd"));
        setStartTime(format(s, "HH:mm"));
        setEndTime(format(e, "HH:mm"));
      } catch (err) {
        console.error("Date parsing failed", err);
      }

      setIsAllDay(!!schedule.isAllDay);
      setColor(schedule.color || "blue");
    } else if (isOpen) {
      setCategory("직방");
      setCustomCategory("");
      setLocation("");
      setCustomerPhoneLast4("");
      setMeetingType("신규");
      setTitle("");
      setContent("");
      setAssignedAccountId(userProfile?.account?.id || "");
      const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime("09:00");
      setEndTime("10:00");
      setIsAllDay(false);
      setColor("blue");
    }
  }, [schedule, selectedDate, isOpen, userProfile]);

  const handleSave = async () => {
    const finalCategory = category === "기타" ? customCategory : category;
    if (!finalCategory.trim()) {
      toast({ title: "입력 오류", description: "일정구분을 선택하거나 입력해주세요.", variant: "destructive" });
      return;
    }

    if (finalCategory !== "휴무") {
      if (!location.trim()) {
        toast({ title: "입력 오류", description: "미팅 장소를 입력해주세요.", variant: "destructive" });
        return;
      }
      if (!customerPhoneLast4.trim() || customerPhoneLast4.length !== 4 || !/^\d{4}$/.test(customerPhoneLast4)) {
        toast({ title: "입력 오류", description: "고객 뒷번호 4자리를 정확히 입력해주세요.", variant: "destructive" });
        return;
      }
    }

    const fullStartDate = isAllDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}:00`).toISOString();

    const fullEndDate = isAllDay
      ? new Date(`${endDate}T23:59:59`).toISOString()
      : new Date(`${endDate}T${endTime}:00`).toISOString();

    setIsLoading(true);
    try {
      const payload: any = {
        title: title || (category === "휴무" ? `[휴무] ${location}` : `${meetingType}(${finalCategory})${location}${customerPhoneLast4 ? "-" + customerPhoneLast4 : ""}`).trim(),
        content,
        category: finalCategory,
        location,
        customerPhoneLast4,
        meetingType,
        startDate: fullStartDate,
        endDate: fullEndDate,
        isAllDay,
        color,
      };

      // 관리자/매니저인 경우 생성/수정할 대상 계정 지정 가능
      if (isPowerful && assignedAccountId) {
        payload.createdByAccountId = assignedAccountId;
      }

      if (schedule) {
        await updateSchedule(schedule.id, payload);
        toast({ title: "일정 수정 완료", description: "일정이 성공적으로 수정되었습니다." });
      } else {
        await createSchedule(payload);
        toast({ title: "일정 생성 완료", description: "새로운 일정이 등록되었습니다." });
      }
      onDataChange();
      onClose();
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error?.response?.data?.message || "일정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!schedule) return;
    setIsLoading(true);
    try {
      await deleteSchedule(schedule.id);
      setIsLoading(false);
      onDataChange();
      onClose();
    } catch (error) {
      setIsLoading(false);
    }
  };

  const TimePickerContent = ({ current, onChange }: { current: string, onChange: (val: string) => void }) => {
    const [h, m] = current.split(":");
    return (
      <div className="flex bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-2xl divide-x divide-gray-50">
        <div
          className="flex flex-col max-h-[250px] overflow-y-auto premium-scrollbar w-[70px] bg-white"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-black text-gray-300 text-center sticky top-0 bg-white py-2 z-10">시</div>
          <div className="flex flex-col px-1 pb-2">
            {HOURS.map(hour => (
              <button
                key={hour} type="button"
                onClick={() => onChange(`${hour}:${m}`)}
                className={cn(
                  "py-2 text-sm font-bold transition-all rounded-lg",
                  h === hour ? "bg-emerald-500 text-white" : "text-gray-400 hover:bg-gray-50"
                )}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex flex-col max-h-[250px] overflow-y-auto premium-scrollbar w-[70px] bg-white"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-black text-gray-300 text-center sticky top-0 bg-white py-2 z-10">분</div>
          <div className="flex flex-col px-1 pb-2">
            {MINUTES.map(minute => (
              <button
                key={minute} type="button"
                onClick={() => onChange(`${h}:${minute}`)}
                className={cn(
                  "py-2 text-sm font-bold transition-all rounded-lg",
                  m === minute ? "bg-emerald-500 text-white" : "text-gray-400 hover:bg-gray-50"
                )}
              >
                {minute}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <div className="bg-white p-8 space-y-8 max-h-[85vh] overflow-y-auto premium-scrollbar">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-3xl font-black tracking-tighter text-gray-900">
              {schedule ? "일정 수정" : "새 일정 등록"}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-medium">
              미팅 정보를 정확하게 입력해주세요. (필수 필드 *)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 관리자/매니저 전용 사원 선택 컴포넌트 */}
            {isPowerful && (
              <div className="space-y-3 bg-emerald-50/50 p-5 rounded-[28px] border border-emerald-100/50 animate-in fade-in slide-in-from-top-4">
                <Label className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  일정 대상자 설정
                </Label>
                <Select value={assignedAccountId} onValueChange={setAssignedAccountId}>
                  <SelectTrigger className="h-12 border-none bg-white shadow-sm rounded-2xl font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20">
                    <SelectValue placeholder="사원을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {employees?.map((emp) => (
                      <SelectItem key={emp.accountId} value={emp.accountId} className="rounded-xl font-bold text-sm py-3">
                        {emp.name} ({emp.teamName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-bold text-emerald-600/60 ml-1">
                  * 관리자 권한으로 다른 사원의 일정을 직접 관리할 수 있습니다.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                일정 구분 *
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {["휴무", "직방", "다방", "네이버", "기타"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      if (cat === "휴무") setColor("gray");
                      else if (cat === "직방") setColor("orange");
                      else if (cat === "다방") setColor("blue");
                      else if (cat === "네이버") setColor("green");
                      else if (cat === "기타") setColor("purple");
                    }}
                    disabled={!canEdit}
                    className={cn(
                      "h-10 text-xs font-bold rounded-xl border transition-all",
                      category === cat
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.05]"
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-emerald-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {category === "기타" && (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="기타 일정을 입력하세요"
                  className="h-11 border-gray-100 focus:border-emerald-500 rounded-xl"
                  disabled={!canEdit}
                />
              )}
            </div>

            {category !== "휴무" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  영업 구분 *
                </Label>
                <div className="flex gap-2">
                  {["신규", "재미팅"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMeetingType(type)}
                      disabled={!canEdit}
                      className={cn(
                        "flex-1 h-11 text-xs font-bold rounded-xl border transition-all",
                        meetingType === type
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-blue-200"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {category !== "휴무" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    미팅 장소 *
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="미팅 장소 입력"
                    className="h-11 border-gray-100 focus:border-emerald-500 rounded-xl"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    고객 뒷번호 *
                  </Label>
                  <Input
                    value={customerPhoneLast4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 4) setCustomerPhoneLast4(val);
                    }}
                    placeholder="번호 4자리"
                    maxLength={4}
                    className="h-11 border-gray-100 focus:border-emerald-500 rounded-xl"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            )}

            <div className="space-y-6 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <Label className="text-base font-black text-gray-900">기간 설정</Label>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                  <span className="text-[10px] font-black text-gray-400">종일</span>
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => {
                      setIsAllDay(e.target.checked);
                      if (!e.target.checked && (!startTime || startTime === "00:00")) {
                        setStartTime("09:00");
                        setEndTime("10:00");
                      }
                    }}
                    className="w-10 h-5 appearance-none bg-gray-200 rounded-full cursor-pointer relative checked:bg-emerald-500 transition-colors duration-300 after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-[3px] after:left-[3px] checked:after:left-[23px] after:transition-all after:duration-300 after:shadow-sm"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="relative pl-6 border-l-2 border-emerald-500/30">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5 rounded">
                      <span>시작</span>
                      {!isAllDay && canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const now = new Date();
                            const newDateStr = format(now, "yyyy-MM-dd");
                            const newTimeStr = format(now, "HH:mm");
                            setStartDate(newDateStr);
                            setStartTime(newTimeStr);

                            // 자동 조정
                            const currentEnd = new Date(`${endDate}T${endTime}`);
                            if (now >= currentEnd) {
                              const adjustedEnd = new Date(now.getTime() + 60 * 60 * 1000);
                              setEndDate(format(adjustedEnd, "yyyy-MM-dd"));
                              setEndTime(format(adjustedEnd, "HH:mm"));
                            }
                          }}
                          className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          현재 시간
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!canEdit}
                            className={cn(
                              "flex-1 h-12 justify-start text-left font-bold rounded-2xl border-white shadow-sm bg-white hover:bg-gray-50 transition-all px-4 gap-3",
                              !startDate && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="w-4 h-4 text-emerald-500" />
                            {startDate ? format(parse(startDate, "yyyy-MM-dd", new Date()), "PPP", { locale: ko }) : <span>시작 날짜</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="start">
                          <Calendar
                            mode="single"
                            locale={ko}
                            selected={startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const newDateStr = format(date, "yyyy-MM-dd");
                                setStartDate(newDateStr);

                                // 종료일 자동 조정 (종료일이 시작일보다 빠르면 시작일로 맞춤)
                                if (new Date(newDateStr) > new Date(endDate)) {
                                  setEndDate(newDateStr);
                                }
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {!isAllDay && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!canEdit}
                              className="w-[110px] h-12 border-white shadow-sm rounded-2xl font-black text-emerald-700 bg-white hover:bg-gray-50 px-3 transition-all focus:ring-0 gap-2"
                            >
                              <Clock className="w-4 h-4 text-emerald-500" />
                              {startTime}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 border-none bg-transparent shadow-none" sideOffset={8}>
                            <TimePickerContent
                              current={startTime}
                              onChange={(val) => {
                                setStartTime(val);
                                // 종료 시간 자동 조정
                                const newStart = new Date(`${startDate}T${val}`);
                                const currentEnd = new Date(`${endDate}T${endTime}`);
                                if (newStart >= currentEnd) {
                                  const adjustedEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
                                  setEndDate(format(adjustedEnd, "yyyy-MM-dd"));
                                  setEndTime(format(adjustedEnd, "HH:mm"));
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      )}

                    </div>
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-rose-500/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white bg-rose-400 shadow-sm" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-rose-500 tracking-widest bg-rose-50 px-2 py-0.5 rounded">종료</span>
                      {!isAllDay && canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const base = new Date(`${startDate}T${startTime}:00`);
                            const end = new Date(base.getTime() + 60 * 60 * 1000);
                            setEndDate(format(end, "yyyy-MM-dd"));
                            setEndTime(format(end, "HH:mm"));
                          }}
                          className="text-[10px] font-bold text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          +1시간 추가
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!canEdit}
                            className={cn(
                              "flex-1 h-12 justify-start text-left font-bold rounded-2xl border-white shadow-sm bg-white hover:bg-gray-50 transition-all px-4 gap-3",
                              !endDate && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="w-4 h-4 text-rose-400" />
                            {endDate ? format(parse(endDate, "yyyy-MM-dd", new Date()), "PPP", { locale: ko }) : <span>종료 날짜</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="start">
                          <Calendar
                            mode="single"
                            locale={ko}
                            selected={endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) setEndDate(format(date, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {!isAllDay && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!canEdit}
                              className="w-[110px] h-12 border-white shadow-sm rounded-2xl font-black text-rose-700 bg-white hover:bg-gray-50 px-3 transition-all focus:ring-0 gap-2"
                            >
                              <Clock className="w-4 h-4 text-rose-400" />
                              {endTime}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 border-none bg-transparent shadow-none" sideOffset={8}>
                            <TimePickerContent current={endTime} onChange={setEndTime} />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                라벨 테마 선택
              </Label>
              <div className="grid grid-cols-6 gap-2 p-4 bg-gray-50/50 rounded-[28px] border border-gray-100">
                {SCHEDULE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    disabled={!canEdit}
                    className={cn(
                      "group relative w-full aspect-square rounded-xl transition-all duration-300",
                      color === c.id
                        ? "ring-4 ring-emerald-500/20 border-2 border-emerald-500 scale-110 z-10 shadow-lg shadow-emerald-100"
                        : "opacity-40 hover:opacity-100 hover:scale-110"
                    )}
                  >
                    <div className={cn("absolute inset-0 rounded-xl", c.bg)} />
                    <div className={cn("absolute inset-1.5 rounded-lg shadow-inner transition-transform group-hover:scale-110", c.dot)} />
                    {color === c.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-50">
                        <div className="w-1.5 h-1 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">상세 메모</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="추가 전달사항이나 메모를 입력하세요."
                  className="min-h-[100px] border-gray-100 focus:border-emerald-500 rounded-2xl resize-none font-medium text-sm leading-relaxed"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 px-6 py-4 flex flex-row items-center justify-between sm:justify-between border-t border-gray-100">
          <div>
            {schedule && canEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isLoading}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl px-6 h-11 border-gray-300 font-semibold">
              닫기
            </Button>
            {canEdit && (
              <Button onClick={handleSave} disabled={isLoading} className="rounded-xl px-8 h-11 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200">
                {isLoading ? "처리 중..." : (schedule ? "일정 수정" : "일정 등록")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="일정 삭제"
        description={`이 일정을 정말로 삭제하시겠습니까?
삭제된 일정은 복구 전까지 달력에서 사라집니다.`}
        onConfirm={confirmDelete}
        confirmText="삭제하기"
        cancelText="취소"
        variant="destructive"
        isLoading={isLoading}
      />
    </Dialog>
  );
}
