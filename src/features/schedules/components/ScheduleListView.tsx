import React from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Schedule } from "../api/schedules";
import { cn } from "@/lib/cn";
import { Clock } from "lucide-react";
import { getKoreanHoliday } from "../utils/holiday";

interface ScheduleListViewProps {
  schedules: Schedule[];
  currentMonth: Date;
  onScheduleClick: (schedule: Schedule) => void;
  getUserColor: (userId: string) => string;
  getScheduleColor: (category: string, colorId?: string) => any;
}

export const ScheduleListView = ({
  schedules,
  currentMonth,
  onScheduleClick,
  getUserColor,
  getScheduleColor,
}: ScheduleListViewProps) => {
  // 현재 월의 일정들을 날짜별로 그룹화
  const groupedSchedules = schedules.reduce((acc, s) => {
    const dateKey = format(new Date(s.startDate), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {} as Record<string, Schedule[]>);

  // 날짜 정렬
  const sortedDates = Object.keys(groupedSchedules).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-bold">이달의 일정이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/30 pb-24 sm:pb-10">
      <div className="max-w-2xl mx-auto p-4 space-y-8 mt-2">
        {sortedDates.map((dateStr) => {
          const date = new Date(dateStr);
          const daySchedules = groupedSchedules[dateStr];
          const holiday = getKoreanHoliday(date);
          const isSun = date.getDay() === 0;

          return (
            <div key={dateStr} className="space-y-3">
              <div className="flex items-baseline gap-2 px-1">
                <h3 className={cn(
                  "text-xl font-black tracking-tight",
                  (isSun || !!holiday) ? "text-red-500" : "text-gray-900"
                )}>
                  {format(date, "M월 d일 E요일", { locale: ko })}
                </h3>
                {holiday && (
                  <span className="text-xs font-bold text-red-400">{holiday}</span>
                )}
              </div>

              <div className="space-y-2">
                {daySchedules.map((s) => {
                  const color = getScheduleColor(s.category, s.color);
                  const isAllDay = !!s.isAllDay;
                  const startTime = format(new Date(s.startDate), "a h:mm", { locale: ko });
                  
                  return (
                    <div
                      key={s.id}
                      onClick={() => onScheduleClick(s)}
                      className="group flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        {isAllDay ? (
                          <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">종일</span>
                        ) : (
                          <span className="text-[10px] font-black text-gray-500 leading-tight text-center">
                            {startTime}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className={cn("w-1 h-8 rounded-full shrink-0", color.dark)} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black text-blue-600 shrink-0">{s.meetingType || "신규"}</span>
                            <span className="text-sm font-bold text-gray-900 truncate">
                              ({s.category || "기타"}) {s.location || ""}
                            </span>
                          </div>
                          {s.customerPhone && (
                            <span className="text-[10px] font-bold text-gray-400">고객번호: {s.customerPhone.slice(-4)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-transform group-hover:scale-110",
                          getUserColor(s.creator?.id || "")
                        )}>
                          {s.creator?.name ? s.creator.name.substring(1, 4) : "유저"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
