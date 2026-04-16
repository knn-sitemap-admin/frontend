import React from "react";
import { cn } from "@/lib/cn";
import { Map, Building2, House, CheckCircle2 } from "lucide-react";
import { MapMenuKey } from "./menu/types/mapMenu.types";

const FILTER_ITEMS = [
  { key: "all", label: "전체", icon: Map },
  { key: "new", label: "신축", icon: Building2, color: "text-blue-500" },
  { key: "old", label: "구옥", icon: House, color: "text-amber-600" },
  { key: "completed", label: "입주완료", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "plannedOnly", label: "답사예정", icon: "/pins/question-pin.svg" },
];

interface MapQuickFilterProps {
  active: MapMenuKey;
  onChange: (key: MapMenuKey) => void;
  className?: string;
}

export const MapQuickFilter = ({
  active,
  onChange,
  className,
}: MapQuickFilterProps) => {
  return (
    <div className={cn(
      "flex gap-1 overflow-x-auto py-1.5",
      "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:display-none", // 스크롤바 숨기기
      className
    )}>
      {FILTER_ITEMS.map((item) => {
        const isActive = active === item.key;
        const Icon = typeof item.icon === "string" ? null : item.icon;
        
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key as MapMenuKey)}
            className={cn(
               "flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] font-black transition-all shadow-sm whitespace-nowrap select-none",
               isActive 
                ? "bg-slate-900 border-slate-900 text-white shadow-md ring-1 ring-slate-900/10"
                : "bg-white/95 backdrop-blur-sm border-gray-200 text-gray-500 hover:border-slate-300 hover:text-slate-900 hover:bg-white"
            )}
          >
            {Icon ? (
                <Icon className={cn("w-3 h-3", isActive ? "text-white" : (item as any).color || "text-slate-400")} />
            ) : (
                <img src={item.icon as string} className="w-3 h-3" alt="" />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
