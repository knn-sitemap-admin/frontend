"use client";

import { X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";
import type { SubListItem } from "../types/sidebar";
import { useDragAndDrop } from "../hooks/useDragAndDrop";

interface SubListProps {
  items: SubListItem[];
  onItemsChange: (items: SubListItem[]) => void;
  onDeleteItem: (id: string) => void;

  /** ✅ 각 subItem 클릭 시 호출되는 콜백 (지도 이동 등) */
  onClickItem?: (item: SubListItem) => void;
}

export function SubList({
  items,
  onItemsChange,
  onDeleteItem,
  onClickItem,
}: SubListProps) {
  const { draggedItem, handleDragStart, handleDragOver, handleDrop, moveItem } =
    useDragAndDrop(items, onItemsChange);

  return (
    <div className="ml-3 space-y-0.5">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => {
            // 드롭 허용을 위해 기본 동작 막기
            e.preventDefault();
            handleDragOver(e);
          }}
          onDrop={(e) => handleDrop(e, item.id)}
          className={cn(
            "group flex items-center gap-2 p-1 rounded-md border border-transparent transition-colors",
            "hover:bg-gray-100 hover:border-gray-300 cursor-move",
            draggedItem === item.id && "opacity-50"
          )}
        >
          <div className="w-2 h-px bg-muted-foreground/30" />
          <GripVertical className="h-3 w-3 text-muted-foreground group-hover:text-gray-700" />

          {/* ✅ 제목 영역 클릭 시 상위 콜백 (예: focusMapTo) 호출 */}
          <button
            type="button"
            className="flex-1 text-left text-xs text-gray-600 group-hover:text-gray-900 break-words leading-tight"
            onClick={() => onClickItem?.(item)}
          >
            {item.title}
          </button>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-gray-200"
              onClick={() => moveItem(item.id, "up")}
              disabled={index === 0}
            >
              <ChevronUp className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-gray-200"
              onClick={() => moveItem(item.id, "down")}
              disabled={index === items.length - 1}
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onDeleteItem(item.id)}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
