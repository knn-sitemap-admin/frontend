"use client";

import React from "react";
import { cn } from "@/lib/cn";
import type { TableHeaderProps } from "../types/table";

export function TableHeader<T>({ columns }: TableHeaderProps<T>) {
  return (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={cn(
              "px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap",
              column.align === "center" && "text-center",
              column.align === "right" && "text-right"
            )}
            style={{ width: column.width }}
          >
            <div
              className={cn(
                "flex items-center",
                column.align === "center" && "justify-center",
                column.align === "right" && "justify-end"
              )}
            >
              <span>{column.label}</span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}
