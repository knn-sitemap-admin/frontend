"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/atoms/Card/Card";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";
import { BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface MonthlyData {
  month: number;
  totalAmount: number;
  paidAmount?: number;
}

interface YearlyStatusSectionProps {
  title: string;
  year: number;
  data: MonthlyData[];
  type?: "expense" | "settlement";
}

export function YearlyStatusSection({ title, year, data, type = "expense" }: YearlyStatusSectionProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const dataMap = new Map(data.map(d => [d.month, d]));
  
  const totalYearly = data.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const maxAmount = Math.max(...data.map(d => d.totalAmount), 1);

  return (
    <Card className="rounded-[24px] md:rounded-[32px] border-none shadow-xl bg-white/70 backdrop-blur-md overflow-hidden mt-8">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <CardTitle className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-blue-500" size={24} /> {year}년 {title}
        </CardTitle>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-full w-full sm:w-auto justify-center">
          <TrendingUp size={14} className="text-blue-600" />
          <span className="text-[10px] md:text-xs font-bold text-blue-700">연간 합계: {formatCurrency(totalYearly)}</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 pt-4">
          {months.map((m) => {
            const monthData = dataMap.get(m);
            const amount = monthData?.totalAmount ?? 0;
            const percentage = (amount / maxAmount) * 100;

            return (
              <div 
                key={m} 
                className={cn(
                  "p-3 md:p-4 rounded-2xl border border-gray-100 transition-all hover:shadow-md group",
                  amount > 0 ? "bg-white" : "bg-gray-50/50 opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs md:text-sm font-black text-gray-900">{m}월</span>
                  {amount > 0 && (
                    <div className="h-1 w-6 md:w-8 bg-blue-100 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 md:space-y-1">
                  <div className="text-[10px] font-bold text-gray-400">지출액</div>
                  <div className={cn(
                    "text-xs md:text-sm font-black",
                    amount > 0 ? "text-gray-900" : "text-gray-300"
                  )}>
                    {formatCurrency(amount)}
                  </div>
                  {type === "settlement" && monthData && (
                    <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-[9px] md:text-[10px] text-gray-400 font-bold">지급률</span>
                      <span className="text-[9px] md:text-[10px] font-black text-green-600">
                        {monthData.totalAmount > 0 
                          ? Math.round(((monthData.paidAmount ?? 0) / monthData.totalAmount) * 100) 
                          : 0}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
