"use client";

/**
 * DataTableSection - 섹션 블록
 * 제목 + 내용 (팀 실적, 그래프 등)
 */

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DataTableSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DataTableSection({
  title,
  description,
  children,
  className,
}: DataTableSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
