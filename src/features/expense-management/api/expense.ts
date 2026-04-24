import { apiFetch } from "@/shared/api/fetch";
import type { ExpenseFilterQuery } from "../utils/expenseUtils";

export interface ExpenseSummary {
  previousMonthAmount: number; // 전월 지출액
  currentMonthAmount: number; // 당월 지출액
}

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  itemName: string;
  amount: number;
  memo: string;
}

/**
 * 지출 요약 조회 (전월/당월/전분기/당분기 등 필터 선택 기준)
 */
export async function getExpenseSummary(
  filterQuery: ExpenseFilterQuery
): Promise<ExpenseSummary> {
  const response = await apiFetch.get<{ data: any[] }>("/ledgers");
  const ledgers = response.data || [];

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split(/[-/.]/);
    if (parts.length < 2) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return { y, m, q: Math.floor((m - 1) / 3) + 1 };
  };

  const isMatch = (itemDate: string, target: { y: number; m?: number; q?: number; period: string }) => {
    const p = parseDate(itemDate);
    if (!p) return false;
    
    switch (target.period) {
      case "all": return true;
      case "month":
      case "monthly":
        return p.y === target.y && p.m === target.m;
      case "quarter":
        return p.y === target.y && p.q === target.q;
      case "yearly":
        return p.y === target.y;
      default:
        return false;
    }
  };

  // 현재 선택된 기간의 타겟 설정
  let currentTarget: { y: number; m?: number; q?: number; period: string };
  const now = new Date();

  if (filterQuery.period === "all") {
    currentTarget = { y: 0, period: "all" };
  } else if (filterQuery.period === "yearly") {
    currentTarget = { y: filterQuery.year || now.getFullYear(), period: "yearly" };
  } else if (filterQuery.period === "quarter") {
    currentTarget = { 
      y: filterQuery.year || now.getFullYear(), 
      q: filterQuery.quarter || (Math.floor(now.getMonth() / 3) + 1),
      period: "quarter" 
    };
  } else {
    // month or monthly
    currentTarget = { 
      y: filterQuery.year || now.getFullYear(), 
      m: filterQuery.month || (now.getMonth() + 1),
      period: "monthly" 
    };
  }

  // 이전 기간 타겟 설정
  let prevTarget: { y: number; m?: number; q?: number; period: string } | null = null;
  if (currentTarget.period === "monthly") {
    const d = new Date(currentTarget.y, (currentTarget.m || 1) - 2, 1);
    prevTarget = { y: d.getFullYear(), m: d.getMonth() + 1, period: "monthly" };
  } else if (currentTarget.period === "quarter") {
    let py = currentTarget.y;
    let pq = (currentTarget.q || 1) - 1;
    if (pq < 1) { pq = 4; py--; }
    prevTarget = { y: py, q: pq, period: "quarter" };
  } else if (currentTarget.period === "yearly") {
    prevTarget = { y: currentTarget.y - 1, period: "yearly" };
  }

  const currentMonthAmount = ledgers
    .filter((l) => isMatch(l.entryDate, currentTarget))
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const previousMonthAmount = prevTarget 
    ? ledgers
        .filter((l) => isMatch(l.entryDate, prevTarget!))
        .reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
    : 0;

  return {
    previousMonthAmount,
    currentMonthAmount,
  };
}

/**
 * 지출 목록 조회
 */
export async function getExpenseList(
  _filterQuery: ExpenseFilterQuery
): Promise<ExpenseItem[]> {
  const response = await apiFetch.get<{ data: any[] }>("/ledgers");
  return (response.data || []).map((l) => ({
    id: String(l.id),
    date: l.entryDate,
    itemName: l.mainLabel,
    amount: Number(l.amount),
    memo: l.memo || "",
  }));
}

export async function createExpense(dto: {
  date: string;
  itemName: string;
  amount: number;
  memo?: string;
}): Promise<ExpenseItem> {
  const response = await apiFetch.post<{ data: any }>("/ledgers", {
    entryDate: dto.date,
    mainLabel: dto.itemName,
    amount: dto.amount,
    memo: dto.memo,
  });
  const l = response.data;
  return {
    id: String(l.id),
    date: l.entryDate,
    itemName: l.mainLabel,
    amount: Number(l.amount),
    memo: l.memo || "",
  };
}

export async function updateExpense(
  id: string,
  dto: {
    date: string;
    itemName: string;
    amount: number;
    memo?: string;
  }
): Promise<ExpenseItem> {
  const response = await apiFetch.patch<{ data: any }>(`/ledgers/${id}`, {
    entryDate: dto.date,
    mainLabel: dto.itemName,
    amount: dto.amount,
    memo: dto.memo,
  });
  const l = response.data;
  return {
    id: String(l.id),
    date: l.entryDate,
    itemName: l.mainLabel,
    amount: Number(l.amount),
    memo: l.memo || "",
  };
}

export async function deleteExpense(id: string): Promise<void> {
  await apiFetch.delete(`/ledgers/${id}`);
}
