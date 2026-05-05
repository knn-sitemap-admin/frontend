"use client";

import { cn } from "@/lib/cn";
import { X, Check, GripVertical } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { ImageItem } from "@/features/properties/types/media";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/atoms/Dialog/Dialog";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  open: boolean;
  onClose: () => void;
  items: ImageItem[];
  title: string;
  onApply: (newItems: ImageItem[]) => void;
};

import { ProtectedImage } from "@/shared/components/ProtectedImage";

// 정렬 가능한 개별 아이템 컴포넌트
function SortableItem({ id, item, index }: { id: string; item: ImageItem; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transition,
    zIndex: isDragging ? 50 : 1,
    touchAction: "none" as const,
    backfaceVisibility: "hidden" as const,
    transform: CSS.Transform.toString(transform) || "translateZ(0)",
  };

  const src = item.url ?? item.dataUrl ?? "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 group cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "opacity-50 z-50 shadow-xl"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="relative w-full aspect-square rounded-2xl border-2 border-white shadow-sm overflow-hidden bg-white group-hover:shadow-md transition-all group-hover:border-blue-200">
        {src ? (
          <ProtectedImage
            src={src}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
            No Image
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/20">
          {index + 1}
        </div>

        {/* 드래그 힌트 오버레이 */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 p-1.5 rounded-full shadow-lg">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-1">
        <div className="text-[9px] font-bold text-gray-400 tracking-tight uppercase">
          {isDragging ? "이동중..." : "드래그하여 순서변경"}
        </div>
      </div>
    </div>
  );
}

export default function ImageReorderModal({
  open,
  onClose,
  items,
  title,
  onApply,
}: Props) {
  // 아이템에 고유 ID 부여 (dnd-kit 필수)
  const [localItems, setLocalItems] = useState<(ImageItem & { dndId: string })[]>([]);

  useEffect(() => {
    if (open) {
      setLocalItems(
        items.map((it, idx) => ({
          ...it,
          dndId: (it as any).id ?? (it as any).photoId ?? (it as any).serverId ?? `item-${idx}-${Date.now()}`,
        }))
      );
    }
  }, [open, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 모바일에서 스크롤과 드래그를 구분하기 위한 조건
        // 마우스는 즉시(2px), 터치는 약간 길게(250ms) 누를 때 활성화
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalItems((prev) => {
        const oldIndex = prev.findIndex((it) => it.dndId === active.id);
        const newIndex = prev.findIndex((it) => it.dndId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    // dndId 제거하고 원본 타입으로 변환하여 전달
    onApply(localItems.map(({ dndId, ...rest }) => rest as ImageItem));
    setTimeout(() => onClose(), 50);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translate3d(-50%, -50%, 0)",
        }}
      >
        <DialogHeader className="p-5 border-b shrink-0 bg-white flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">
              {title} 순서 조정
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium">
              사진을 길게 누르거나 드래그하여 순서를 변경하세요.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 scrollbar-hide min-h-[400px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localItems.map((it) => it.dndId)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {localItems.map((img, i) => (
                  <SortableItem key={img.dndId} id={img.dndId} item={img} index={i} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="p-6 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1 bg-amber-50 rounded-lg">
              <X className="w-3.5 h-3.5 text-amber-500 rotate-45" />
            </div>
            <p className="text-[13px] text-amber-700 font-bold leading-tight">
              순서 적용 후, 메인 수정창 하단의 <br />
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
