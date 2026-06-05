"use client";


import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import { generatePageNumbers } from "../utils/tableUtils";
import type { PaginationProps } from "../types/table";

export function Pagination({
  pagination,
  onPageChange,
  className,
}: PaginationProps) {
  const { currentPage, totalPages, totalLists, listsPerPage } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };



  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200",
        className
      )}
    >
      {/* 페이지네이션 버튼들 */}
      <div className="flex items-center space-x-1">
        {/* 이전 페이지 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 페이지 번호들 */}
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1 text-sm text-gray-500"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isCurrentPage = pageNum === currentPage;

          return (
            <Button
              key={pageNum}
              variant={isCurrentPage ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              className={cn(
                "h-8 w-8 p-0 text-sm",
                isCurrentPage
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "hover:bg-gray-50"
              )}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* 다음 페이지 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
