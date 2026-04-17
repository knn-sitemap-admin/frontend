"use client";

import { Button } from "@/components/atoms/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/atoms/Dialog/Dialog";

type NoResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetFilters?: () => void; // 선택: 필터 초기화 버튼 넣고 싶으면
};

export function NoResultDialog({
  open,
  onOpenChange,
  onResetFilters,
}: NoResultDialogProps) {
  const handleConfirm = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onOpenChange(false);
    onResetFilters?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>조건에 맞는 매물이 없습니다</DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-sm text-muted-foreground mt-2">
          필터 조건을 조금 완화해서 다시 검색해 보세요.
        </DialogDescription>

        <DialogFooter className="mt-4 flex gap-2 justify-end">
          {onResetFilters && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleReset}
            >
              필터 초기화
            </Button>
          )}
          <Button size="sm" type="button" onClick={handleConfirm}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
