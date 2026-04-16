"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

/**
 * 전역적으로 사용할 수 있는 확인 모달 컴포넌트입니다.
 * window.confirm을 대체하여 더 나은 사용자 경험을 제공합니다.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "확인",
  cancelText = "취소",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-11"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            className={cn(
              "flex-1 rounded-xl h-11 font-bold",
              variant === "default" && "bg-blue-600 hover:bg-blue-700"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
              // ✅ 로딩 중이 아닐 때만 닫기 (로딩 처리는 호출한 곳에서 관리)
              if (!isLoading) onOpenChange(false);
            }}
            disabled={isLoading}
          >
            {isLoading ? "처리 중..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
