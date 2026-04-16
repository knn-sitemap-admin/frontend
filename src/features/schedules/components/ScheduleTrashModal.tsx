"use client";

import React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { RotateCcw, Trash2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeletedSchedules, restoreSchedule, Schedule } from "@/features/schedules/api/schedules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";
import { useToast } from "@/hooks/use-toast";

interface ScheduleTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function ScheduleTrashModal({ isOpen, onClose, onRestored }: ScheduleTrashModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deletedSchedules = [], isLoading, refetch } = useQuery({
    queryKey: ["deletedSchedules"],
    queryFn: getDeletedSchedules,
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreSchedule(id),
    onSuccess: () => {
      toast({ title: "일정 복원 완료", description: "일정이 달력으로 복원되었습니다." });
      refetch();
      onRestored();
    },
    onError: () => {
      toast({ title: "복원 실패", description: "일정을 복원하는 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <div className="bg-white p-6 space-y-6">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                삭제된 일정 (휴지통)
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">삭제된 일정은 30일 후 영구적으로 삭제됩니다.</p>
            </div>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {isLoading ? (
              <div className="text-center py-10 text-gray-400">불러오는 중...</div>
            ) : deletedSchedules.length === 0 ? (
              <div className="text-center py-10 text-gray-600 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
                비어있는 휴지통입니다.
              </div>
            ) : (
              deletedSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-all group">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 truncate">{s.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(s.startDate), "MM/dd HH:mm")} ~ {format(new Date(s.endDate), "MM/dd HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4 text-emerald-600 hover:text-white hover:bg-emerald-500 rounded-lg gap-1.5 font-bold transition-all"
                    onClick={() => restoreMutation.mutate(s.id)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    복원
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-semibold border-gray-300">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
