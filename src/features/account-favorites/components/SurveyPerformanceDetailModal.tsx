"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/atoms/Dialog/Dialog";

export function SurveyPerformanceDetailModal({ open, onClose, accountId, accountName }: { open: boolean, onClose: () => void, accountId: string | null, accountName: string | null }) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="w-[95vw] sm:w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {accountName ? `${accountName}님의 조사 성과` : "조사 성과 상세"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {
                        <div className="text-center text-gray-500 py-8">
                            답사 성과를 불러오는 중...
                        </div>
                    }

                    {
                        <div className="text-center text-red-500 py-8">
                            답사 성과를 불러오는 중 오류가 발생했습니다.
                        </div>
                    }
                </div>
            </DialogContent>
        </Dialog>
    );
}