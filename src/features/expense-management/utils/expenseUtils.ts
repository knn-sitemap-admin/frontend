export interface ExpenseFilterQuery {
  period: string;
  year?: number;
  quarter?: number;
  month?: number;
}

export function buildExpenseFilterQuery(
  period: string,
  year: string,
  quarter?: string,
  month?: string
): ExpenseFilterQuery {
  const query: ExpenseFilterQuery = { period };

  if (period === "month" || period === "monthly" || period === "quarter" || period === "yearly") {
    query.year = parseInt(year, 10);
  }
  if ((period === "month" || period === "monthly") && month) {
    query.month = parseInt(month, 10);
  }
  if (period === "quarter" && quarter) {
    query.quarter = parseInt(quarter, 10);
  }

  return query;
}

export function filterExpenseByPeriod<T extends { date: string }>(
  items: T[],
  filterQuery: ExpenseFilterQuery
): T[] {
  return items.filter((item) => {
    if (!item.date) return false;
    
    // Robust parsing: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    const parts = item.date.split(/[-/.]/);
    if (parts.length < 2) return false;
    
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10); // 1-based
    const q = Math.floor((m - 1) / 3) + 1;

    switch (filterQuery.period) {
      case "month": {
        const now = new Date();
        return y === now.getFullYear() && m === now.getMonth() + 1;
      }
      case "monthly":
        return y === filterQuery.year && m === (filterQuery.month ?? 1);
      case "quarter":
        return y === filterQuery.year && q === (filterQuery.quarter ?? 1);
      case "yearly":
        return y === filterQuery.year;
      case "all":
        return true;
      default:
        return true;
    }
  });
}
