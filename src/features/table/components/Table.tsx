"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";
import { Pagination } from "./Pagination";
import type { TableProps, TableData } from "../types/table";

export function Table<T extends TableData>({
  data,
  columns,
  pagination,
  sort,
  loading = false,
  emptyMessage = "데이터가 없습니다.",
  onPageChange,
  onSort,
  onRowClick,
  className,
}: TableProps<T>) {
  return (
    <div
      className={cn(
        "bg-white shadow-sm rounded-lg border border-gray-200",
        className
      )}
    >
      {/* 테이블 */}
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader columns={columns} sort={sort} onSort={onSort} />
          <TableBody
            data={data}
            columns={columns}
            loading={loading}
            emptyMessage={emptyMessage}
            onRowClick={onRowClick}
          />
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination && onPageChange && (
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}
