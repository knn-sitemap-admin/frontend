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
import { getEmployeesList } from "@/features/users/api/account";
import { CalendarIcon, Trash2, Clock, User, FileText, Ban } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
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
  onCreateContract?: (schedule: Schedule) => void;
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
  { id: "blue", label: "파랑", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-400", dark: "bg-blue-500" },
  { id: "indigo", label: "인디고", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400", dark: "bg-indigo-500" },
  { id: "sky", label: "스카이", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-400", dark: "bg-sky-500" },
  { id: "cyan", label: "청록", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-400", dark: "bg-cyan-500" },
  { id: "teal", label: "틸", bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-400", dark: "bg-teal-500" },
  { id: "emerald", label: "에메랄드", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400", dark: "bg-emerald-500" },
  { id: "green", label: "초록", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-400", dark: "bg-green-500" },
  { id: "lime", label: "라임", bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", dot: "bg-lime-400", dark: "bg-lime-500" },
  { id: "yellow", label: "노랑", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400", dark: "bg-yellow-500" },
  { id: "amber", label: "호박", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400", dark: "bg-amber-500" },
  { id: "orange", label: "주황", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400", dark: "bg-orange-500" },
  { id: "brown", label: "갈색", bg: "bg-orange-100/50", border: "border-orange-300", text: "text-orange-900", dot: "bg-orange-700", dark: "bg-orange-800" },
  { id: "slate", label: "슬레이트", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400", dark: "bg-slate-500" },
  { id: "gray", label: "회색", bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-600", dot: "bg-gray-400", dark: "bg-gray-500" },
];

export function ScheduleModal({
  isOpen,
  onClose,
  selectedDate,
  schedule,
  onDataChange,
  userProfile,
  onCreateContract,
}: ScheduleModalProps) {
  const [category, setCategory] = useState("신규");
  const [customCategory, setCustomCategory] = useState("");
  const [platform, setPlatform] = useState("직방");
  const [customPlatform, setCustomPlatform] = useState("");
  const [location, setLocation] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState("blue");
  const [status, setStatus] = useState<"normal" | "canceled">("normal");
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

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployeesList({ onlyActive: true }),
    enabled: !!isPowerful && isOpen,
  });

  const formatPhoneNumber = (value: string) => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  useEffect(() => {
    if (schedule && isOpen) {
      // category 매핑 (휴무, 신규, 재미팅 외에는 기타로 취급)
      const validCats = ["휴무", "신규", "재미팅"];
      if (validCats.includes(schedule.category)) {
        setCategory(schedule.category);
        setCustomCategory("");
      } else {
        setCategory("기타");
        setCustomCategory(schedule.category || "");
      }
      
      const knownPlatforms = ["직방", "다방", "네이버"];
      if (schedule.platform && knownPlatforms.includes(schedule.platform)) {
        setPlatform(schedule.platform);
        setCustomPlatform("");
      } else if (schedule.platform) {
        setPlatform("기타");
        setCustomPlatform(schedule.platform);
      } else {
        setPlatform("직방");
        setCustomPlatform("");
      }

      setLocation(schedule.location || "");
      setCustomerPhone(formatPhoneNumber(schedule.customerPhone || ""));
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
      setStatus(schedule.status || "normal");
    } else if (isOpen) {
      setCategory("신규");
      setCustomCategory("");
      setPlatform("직방");
      setCustomPlatform("");
      setLocation("");
      setCustomerPhone("");
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
      setStatus("normal");
    }
  }, [schedule, selectedDate, isOpen, userProfile]);

  // 시작 시간이 변경될 때 종료 시간을 자동으로 +1시간으로 설정
  useEffect(() => {
    if (!isOpen || isAllDay || !!schedule) return; // 수정 모드거나 종일 일정이면 자동 조정 안함

    try {
      const [h, m] = startTime.split(":").map(Number);
      const endH = (h + 1) % 24;
      const endTimeStr = `${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      setEndTime(endTimeStr);
      
      // 만약 종료 시간이 다음날로 넘어간다면 종료 날짜도 +1 (간단하게 같은 날로 유지하는 것이 일반적)
      // 여기서는 시간만 자연스럽게 변경되도록 함
    } catch (e) {
      console.error("End time auto adjustment failed", e);
    }
  }, [startTime]);

  const handleSave = async () => {
    const finalCategory = category === "기타" ? customCategory : category;
    const isMeeting = category === "신규" || category === "재미팅";
    const finalPlatform = (isMeeting && platform === "기타") ? customPlatform.replace(/\s/g, "") : (isMeeting ? platform : "");
    
    if (!finalCategory.trim()) {
      toast({ title: "입력 오류", description: "일정구분을 선택하거나 입력해주세요.", variant: "destructive" });
      return;
    }

    if (isMeeting) {
      if (!customerPhone.trim()) {
        toast({ title: "입력 오류", description: "고객 연락처를 입력해주세요.", variant: "destructive" });
        return;
      }
      // 010-000-0000 (12자) 또는 010-0000-0000 (13자) 체크
      if (customerPhone.length < 12) {
        toast({ title: "입력 오류", description: "전화번호를 올바르게 입력해주세요. (예: 010-0000-0000)", variant: "destructive" });
        return;
      }
    }

    const parseSafeDate = (dateStr: string, timeStr: string) => {
      try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const [hh, mm] = timeStr.split(":").map(Number);
        // 사파리 호환성을 위해 숫자로 직접 주입
        const date = new Date(y, m - 1, d, hh, mm, 0);
        return date.toISOString();
      } catch (e) {
        console.error("Date parsing error:", e);
        return new Date().toISOString();
      }
    };

    const fullStartDate = isAllDay
      ? parseSafeDate(startDate, "00:00")
      : parseSafeDate(startDate, startTime);

    const fullEndDate = isAllDay
      ? parseSafeDate(endDate, "23:59")
      : parseSafeDate(endDate, endTime);

    setIsLoading(true);
    try {
      const payload: any = {
        title: title || (category === "휴무" ? `[휴무] ${location}` : `${category}(${finalPlatform})${location}${customerPhone ? "-" + customerPhone : ""}`).trim(),
        content,
        category: finalCategory,
        location: isMeeting ? location : "",
        customerPhone: isMeeting ? customerPhone : "",
        platform: finalPlatform,
        meetingType: (category === "신규" || category === "재미팅") ? category : "신규",
        startDate: fullStartDate,
        endDate: fullEndDate,
        isAllDay,
        color,
      };

      if (isPowerful && assignedAccountId) {
        payload.createdByAccountId = assignedAccountId;
      }

      if (schedule) {
        payload.status = status; // 수정 시에만 status 포함
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

    // 계약 기록과 연결된 일정은 삭제 불가
    if (schedule.contractId) {
      toast({
        title: "삭제 불가",
        description: "작성된 계약 기록이 있는 건이므로 삭제할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

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
          className="flex flex-col max-h-[250px] overflow-y-auto premium-scrollbar w-[85px] bg-white overscroll-contain touch-pan-y pointer-events-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="text-[10px] font-black text-gray-300 text-center sticky top-0 bg-white py-2 z-10 border-b border-gray-50 uppercase tracking-widest">Hour</div>
          <div className="flex flex-col px-1.5 pb-2">
            {HOURS.map(hour => (
              <button
                key={hour} type="button"
                onClick={() => onChange(`${hour}:${m}`)}
                className={cn(
                  "py-3 text-sm font-bold transition-all rounded-lg shrink-0",
                  h === hour ? "bg-emerald-500 text-white shadow-md scale-[1.05]" : "text-gray-400 hover:bg-gray-50"
                )}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>
        <div 
          className="flex flex-col max-h-[250px] overflow-y-auto premium-scrollbar w-[85px] bg-white overscroll-contain touch-pan-y pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="text-[10px] font-black text-gray-300 text-center sticky top-0 bg-white py-2 z-10 border-b border-gray-50 uppercase tracking-widest">Min</div>
          <div className="flex flex-col px-1.5 pb-2">
            {MINUTES.map(minute => (
              <button
                key={minute} type="button"
                onClick={() => onChange(`${h}:${minute}`)}
                className={cn(
                  "py-3 text-sm font-bold transition-all rounded-lg",
                  m === minute ? "bg-emerald-500 text-white shadow-md scale-[1.05]" : "text-gray-400 hover:bg-gray-50"
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl focus:outline-none">
          <div className="bg-white p-5 sm:p-8 space-y-6 sm:space-y-8 max-h-[90dvh] overflow-y-auto premium-scrollbar overscroll-contain">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-3xl font-black tracking-tighter text-gray-900">
                {schedule ? "일정 수정" : "새 일정 등록"}
              </DialogTitle>
              <DialogDescription className="text-gray-400 font-medium">
                미팅 정보를 정확하게 입력해주세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {isPowerful && (
                <div className="space-y-3 bg-emerald-50/50 p-5 rounded-[28px] border border-emerald-100/50">
                  <Label className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    일정 대상자 설정
                  </Label>
                  <Select value={assignedAccountId} onValueChange={setAssignedAccountId}>
                    <SelectTrigger className="h-14 sm:h-12 border-none bg-white shadow-sm rounded-2xl font-bold text-gray-700">
                      <SelectValue placeholder="사원을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {employees?.filter(emp => !emp.isDisabled).map((emp) => (
                        <SelectItem key={emp.accountId} value={emp.accountId} className="rounded-xl font-bold text-sm py-3">
                          {emp.name} ({emp.teamName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  일정 구분
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {["휴무", "신규", "재미팅", "기타"].map((cat) => {
                    const isRestricted = !!schedule?.contractId && (cat === "휴무" || cat === "기타");
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (isRestricted) {
                            toast({
                              title: "변경 불가",
                              description: "계약 기록이 있는 일정은 휴무나 기타로 변경할 수 없습니다.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setCategory(cat);
                          if (cat === "휴무") {
                            setColor("gray");
                            setStatus("normal");
                          } else if (cat === "신규") setColor("emerald");
                          else if (cat === "재미팅") setColor("blue");
                        }}
                        disabled={!canEdit}
                        className={cn(
                          "h-11 sm:h-10 text-[11px] sm:text-xs font-bold rounded-xl border transition-all",
                          category === cat
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.05]"
                            : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-emerald-200",
                          isRestricted && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {(category === "신규" || category === "재미팅") && (
                  <button
                    type="button"
                    onClick={() => setStatus(status === "canceled" ? "normal" : "canceled")}
                    disabled={!canEdit}
                    className={cn(
                      "w-full h-11 sm:h-10 mt-2 text-[11px] sm:text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-200",
                      status === "canceled"
                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200"
                        : "bg-white border-red-100 text-red-500 hover:bg-red-50"
                    )}
                  >
                    <Ban className="w-4 h-4" />
                    {status === "canceled" ? "이 일정은 취소되었습니다" : "이 일정을 취소로 표시하기"}
                  </button>
                )}
                {category === "기타" && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="기타 일정을 입력하세요"
                    className="h-12 border-gray-100 focus:border-emerald-500 rounded-xl font-bold"
                    disabled={!canEdit}
                  />
                )}
              </div>

              {(category === "신규" || category === "재미팅") && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    유입 플랫폼 (통계용)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["직방", "다방", "네이버", "기타"].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={platform === p ? "default" : "outline"}
                        className={cn(
                          "rounded-xl h-12 sm:h-10 font-bold transition-all text-xs sm:text-sm",
                          platform === p ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100" : "text-gray-400 border-gray-100 bg-gray-50/30"
                        )}
                        onClick={() => setPlatform(p)}
                        disabled={!canEdit}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  {platform === "기타" && (
                    <Input
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value.replace(/\s/g, ""))}
                      placeholder="플랫폼 직접 입력 (공백 제외)"
                      className="mt-2 border-gray-100 focus:border-purple-500 rounded-xl h-11 font-bold text-sm"
                      disabled={!canEdit}
                    />
                  )}
                </div>
              )}

              {(category === "신규" || category === "재미팅") && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      미팅 장소
                    </Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="장소 입력"
                      className="h-12 border-gray-100 focus:border-emerald-500 rounded-xl font-bold"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      고객 연락처
                    </Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                      maxLength={13}
                      placeholder="010-0000-0000"
                      className="h-12 border-gray-100 focus:border-emerald-500 rounded-xl font-bold"
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
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="w-10 h-5 appearance-none bg-gray-200 rounded-full cursor-pointer relative checked:bg-emerald-500 transition-colors duration-300 after:content-[''] after:absolute after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:top-[3px] after:left-[3px] checked:after:left-[23px] after:transition-all after:duration-300"
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
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!canEdit}
                              className="w-full sm:flex-1 h-12 justify-start text-left font-bold rounded-2xl border-white shadow-sm bg-white text-xs sm:text-sm"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                              {startDate ? format(parse(startDate, "yyyy-MM-dd", new Date()), "PPP", { locale: ko }) : <span>날짜 선택</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                            <Calendar
                              mode="single"
                              locale={ko}
                              selected={startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={(date) => date && setStartDate(format(date, "yyyy-MM-dd"))}
                            />
                          </PopoverContent>
                        </Popover>

                        {!isAllDay && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={!canEdit}
                                className="w-full sm:w-[110px] h-12 border-white shadow-sm rounded-2xl font-black text-emerald-700 bg-white text-xs sm:text-sm"
                              >
                                <Clock className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                {startTime}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 border-none bg-transparent shadow-none">
                              <TimePickerContent current={startTime} onChange={setStartTime} />
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
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!canEdit}
                              className="w-full sm:flex-1 h-12 justify-start text-left font-bold rounded-2xl border-white shadow-sm bg-white text-xs sm:text-sm"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 mr-2 text-rose-400" />
                              {endDate ? format(parse(endDate, "yyyy-MM-dd", new Date()), "PPP", { locale: ko }) : <span>날짜 선택</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                            <Calendar
                              mode="single"
                              locale={ko}
                              selected={endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={(date) => date && setEndDate(format(date, "yyyy-MM-dd"))}
                            />
                          </PopoverContent>
                        </Popover>

                        {!isAllDay && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={!canEdit}
                                className="w-full sm:w-[110px] h-12 border-white shadow-sm rounded-2xl font-black text-rose-700 bg-white text-xs sm:text-sm"
                              >
                                <Clock className="w-3.5 h-3.5 mr-2 text-rose-400" />
                                {endTime}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 border-none bg-transparent shadow-none">
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
                <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50/50 rounded-[28px] border border-gray-100">
                  {SCHEDULE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      disabled={!canEdit}
                      className={cn(
                        "group relative w-full aspect-square rounded-xl transition-all duration-300",
                        color === c.id
                          ? "ring-4 ring-emerald-500/20 border-2 border-emerald-500 scale-110 z-10"
                          : "opacity-40 hover:opacity-100"
                      )}
                    >
                      <div className={cn("absolute inset-0 rounded-xl", c.bg)} />
                      <div className={cn("absolute inset-1.5 rounded-lg shadow-inner", c.dot)} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">상세 메모</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="추가 전달사항이나 메모를 입력하세요."
                  className="min-h-[100px] border-gray-100 focus:border-emerald-500 rounded-2xl resize-none font-medium text-sm"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 flex flex-row items-center justify-between border-t border-gray-100">
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
              <Button variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl px-4 h-11 border-gray-300 font-semibold">
                닫기
              </Button>
              {schedule && !schedule.contractId && (category === "신규" || category === "재미팅") && onCreateContract && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onCreateContract(schedule);
                  }}
                  className="rounded-xl px-4 h-11 border-blue-200 text-blue-600 font-bold hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  계약서 작성
                </Button>
              )}
              {canEdit && (
                <Button onClick={handleSave} disabled={isLoading} className="rounded-xl px-8 h-11 bg-emerald-600 hover:bg-emerald-700 font-bold text-white">
                  {isLoading ? "처리 중..." : (schedule ? "수정" : "등록")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="일정 삭제"
        description="이 일정을 정말로 삭제하시겠습니까?"
        onConfirm={confirmDelete}
        confirmText="삭제하기"
        cancelText="취소"
        variant="destructive"
        isLoading={isLoading}
      />
    </>
  );
}
