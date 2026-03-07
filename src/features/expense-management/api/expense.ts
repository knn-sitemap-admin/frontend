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
  const { data } = await api.get<{ data: ExpenseItem[] }>("/ledgers");
  const ledgers = data.data;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthAmount = ledgers
    .filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, l) => sum + Number(l.amount), 0);

  const previousMonthAmount = ledgers
    .filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
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
