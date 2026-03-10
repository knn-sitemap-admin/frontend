"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";
import { ScrollArea } from "@/components/atoms/ScrollArea/ScrollArea";
import type { PinSearchResult } from "@/features/pins/types/pin-search";
import { MapPin, Info } from "lucide-react";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  results: PinSearchResult | null;
  loading: boolean;
  onSelect: (item: any) => void;
};

export function SalePinSearchModal({
  isOpen,
  onOpenChange,
  results,
  loading,
  onSelect,
}: Props) {
  const pins = results?.pins ?? [];
  const drafts = results?.drafts ?? [];

  const allResults = [
    ...pins.map((p) => ({ ...p, isDraft: false })),
    ...drafts.map((d) => ({
      ...d,
      isDraft: true,
      name: d.name || d.title || "이름 없음",
    })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>매물핀 검색 결과</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                검색 중...
              </div>
            ) : allResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Info size={24} />
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              allResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className={`mt-1 ${item.isDraft ? "text-orange-500" : "text-primary"}`}>
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      {item.isDraft && (
                        <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                          임시
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.addressLine}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
