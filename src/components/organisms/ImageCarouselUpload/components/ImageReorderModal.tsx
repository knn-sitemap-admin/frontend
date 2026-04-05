"use client";

import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { ImageItem } from "@/features/properties/types/media";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  items: ImageItem[];
  title: string;
  onApply: (newItems: ImageItem[]) => void;
};

export default function ImageReorderModal({
  open,
  onClose,
  items,
  title,
  onApply,
}: Props) {
  const [localItems, setLocalItems] = useState<ImageItem[]>([]);

  useEffect(() => {
    if (open) {
      setLocalItems([...items]);
    }
  }, [open, items]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= localItems.length) return;
    const next = [...localItems];
    const [target] = next.splice(from, 1);
    next.splice(to, 0, target);
    setLocalItems(next);
  };

  const handleSave = () => {
    // eslint-disable-next-line no-console
    console.log(`[ImageReorderModal] Applying ${localItems.length} items to ${title}`);
    onApply(localItems);
    
    // 약간의 지연 후 닫기 (부모 리렌더링 배려)
    setTimeout(() => {
      onClose();
    }, 50);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="p-5 border-b shrink-0 bg-white flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">
              {title} 순서 조정
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium">
              사진을 정렬한 후 하단의 적용 버튼을 눌러주세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900"
          >
            <X className="h-6 w-6" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 scrollbar-hide min-h-[400px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {localItems.map((img, i) => {
              const src = img.url ?? img.dataUrl;
              return (
                <div key={i} className="flex flex-col gap-2 group animate-in fade-in zoom-in duration-200">
                  <div className="relative w-full aspect-square rounded-2xl border-2 border-white shadow-sm overflow-hidden bg-white group-hover:shadow-md transition-all group-hover:border-blue-100">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/20">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 px-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-[10px] font-black text-gray-300 tracking-widest uppercase">
                      SORT
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      onClick={() => move(i, i + 1)}
                      disabled={i === localItems.length - 1}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1 bg-amber-50 rounded-lg">
              <X className="w-3.5 h-3.5 text-amber-500 rotate-45" />
            </div>
            <p className="text-[13px] text-amber-700 font-bold leading-tight">
              순서 적용 후, 메인 수정창 하단의 <br/>
              <span className="text-amber-800 underline decoration-2 underline-offset-2 font-black">
                [매물정보 수정완료] 또는 [저장]
              </span> 
              버튼을 꼭 눌러야 저장됩니다.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 sm:flex-none h-12 px-6 rounded-2xl border-gray-200 text-gray-600 font-bold"
            >
              취소
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 transition-all border-0 gap-2"
            >
              <Check className="h-5 w-5" />
              순서 적용하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
