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
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between w-full">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          {icon && (
            <div
              className={cn(
                "h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center shrink-0",
                styles.bg,
                styles.icon,
              )}
            >
              <div className="scale-[0.7]">{icon}</div>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div
            className={cn(
              "text-lg sm:text-xl font-black text-gray-900 leading-tight",
              valueClassName
            )}
          >
            {value}
          </div>
          {description && (
            <div className="mt-1.5 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50">
              <p className="text-[10px] text-blue-800 font-bold leading-tight flex items-center gap-1">
                <span className="text-blue-500 text-[8px]">ⓘ</span> {description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
