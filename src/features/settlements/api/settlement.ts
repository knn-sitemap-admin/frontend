import { apiFetch } from "@/shared/api/fetch";

export const getSettlements = async (year: number, month: number) => {
  const response = await apiFetch.get<{ data: any[] }>("/settlements", { year, month });
  return (response.data || []).map(item => ({
    ...item,
    id: item.accountId,
    calculatedAmount: Number(item.calculatedAmount || 0),
    adjustmentAmount: Number(item.adjustmentAmount || 0),
    finalAmount: Number(item.finalAmount || 0),
  }));
};

export const saveSettlement = async (data: {
  accountId: string;
  year: number;
  month: number;
  adjustmentAmount: number;
  memo?: string;
  status?: "pending" | "paid";
}) => {
  const response = await apiFetch.post<{ data: any }>("/settlements", data);
  return response.data;
};

export const updateSettlementStatus = async (id: number, status: "pending" | "paid") => {
  const response = await apiFetch.patch<{ data: any }>(`/settlements/${id}/status`, { status });
  return response.data;
};
