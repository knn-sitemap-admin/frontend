import { api } from "@/shared/api/api";
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
 * 지출 요약 조회 (전월/당월 지출액)
 */
export async function getExpenseSummary(
  _filterQuery: ExpenseFilterQuery
): Promise<ExpenseSummary> {
  const { data } = await api.get<{ data: any[] }>("/ledgers");
  const ledgers = data.data || [];

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();

  const currentMonthAmount = ledgers
    .filter((l) => {
      if (!l.entryDate) return false;
      const [y, m] = l.entryDate.split("-").map(Number);
      return y === currentYear && m - 1 === currentMonth;
    })
    .reduce((sum, l) => sum + Number(l.amount), 0);

  const previousMonthAmount = ledgers
    .filter((l) => {
      if (!l.entryDate) return false;
      const [y, m] = l.entryDate.split("-").map(Number);
      return y === prevMonthYear && m - 1 === prevMonth;
    })
    .reduce((sum, l) => sum + Number(l.amount), 0);

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
  const { data } = await api.get<{ data: any[] }>("/ledgers");
  return data.data.map((l) => ({
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
  const { data } = await api.post("/ledgers", {
    entryDate: dto.date,
    mainLabel: dto.itemName,
    amount: dto.amount,
    memo: dto.memo,
  });
  const l = data.data;
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
  const { data } = await api.patch(`/ledgers/${id}`, {
    entryDate: dto.date,
    mainLabel: dto.itemName,
    amount: dto.amount,
    memo: dto.memo,
  });
  const l = data.data;
  return {
    id: String(l.id),
    date: l.entryDate,
    itemName: l.mainLabel,
    amount: Number(l.amount),
    memo: l.memo || "",
  };
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/ledgers/${id}`);
}
