"use client";

/**
 * StatCard - 통계 한 칸 카드 (라벨, 값, 아이콘)
 * blue/green/purple/orange/gray/red
 */

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/atoms/Card/Card";
import { cn } from "@/lib/cn";

export type StatCardVariant =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "gray"
  | "red"
  | "indigo";

const variantStyles: Record<StatCardVariant, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600" },
  green: { bg: "bg-green-100", icon: "text-green-600" },
  purple: { bg: "bg-purple-100", icon: "text-purple-600" },
  orange: { bg: "bg-orange-100", icon: "text-orange-600" },
  gray: { bg: "bg-gray-100", icon: "text-gray-600" },
  red: { bg: "bg-red-100", icon: "text-red-600" },
  indigo: { bg: "bg-indigo-100", icon: "text-indigo-600" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** 추가 설명 (작은 글씨) */
  description?: string;
  /** Lucide 아이콘 등 */
  icon?: ReactNode;
  variant?: StatCardVariant;
  /** 값 강조 색 (기본 gray-900, green-600 등 지정 가능) */
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  variant = "gray",
  valueClassName,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  return (
    <Card className={cn("border-gray-200 overflow-hidden", className)}>
      <CardContent className="p-5 md:p-6 flex flex-col h-full justify-between gap-3">
        <div className="flex items-center justify-between w-full">
          <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">{label}</p>
          {icon && (
            <div
              className={cn(
                "h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0",
                styles.bg,
                styles.icon,
              )}
            >
              <div className="scale-75 md:scale-90">{icon}</div>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div
            className={cn(
              "text-lg sm:text-xl lg:text-2xl font-black text-gray-900 leading-none tracking-tighter whitespace-nowrap",
              valueClassName
            )}
          >
            {value}
          </div>
          {description && (
            <p className="text-[10px] md:text-xs text-gray-400 font-medium">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
