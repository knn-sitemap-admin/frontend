"use client";

import React from "react";
import { cn } from "@/lib/cn";
import type { TableBodyProps, TableData } from "../types/table";

export function TableBody<T extends TableData>({
  data,
  columns,
  loading = false,
  emptyMessage = "데이터가 없습니다.",
  onRowClick,
}: TableBodyProps<T>) {
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length} className="px-4 py-8 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">로딩 중...</span>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={columns.length}
            className="px-4 py-8 text-center text-gray-500"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((row, index) => (
        <tr
          key={row.id}
          className={cn(
            "hover:bg-gray-50 transition-colors",
            onRowClick && "cursor-pointer"
          )}
          onClick={() => onRowClick?.(row, index)}
        >
          {columns.map((column) => {
            const value = row[column.key as keyof T];
            const cellContent = column.render
              ? column.render(value, row, index)
              : value;

            return (
              <td
                key={column.key}
                className={cn(
                  "px-2 py-2 text-sm text-gray-900",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right"
                )}
              >
                {cellContent}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}
