"use client";

import React from "react";
import ScheduleCalendar from "@/features/schedules/components/ScheduleCalendar";

export default function SchedulesPage() {
  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden flex flex-col">
      {/* 반응형 여백 컨트롤 레이어 */}
      <div className="flex-1 p-2 md:p-4 lg:p-5 w-full max-w-[1900px] mx-auto flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-200/60 overflow-hidden flex flex-col">
          <ScheduleCalendar />
        </div>
      </div>
    </div>
  );
}
