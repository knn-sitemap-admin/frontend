import type { TableData } from "@/features/table/types/table";

// 계약 데이터 타입
export interface ContractData extends TableData {
  id: string;
  contractNumber: string;
  customerName: string;
  customerContact: string;
  salesPerson: string;
  salesPersonSalary: number;
  totalCalculation: number;
  contractDate: string; // 계약일 (내부 사용)
  balanceDate?: string; // 잔금일자 (표시용)
  status: "ongoing" | "rejected" | "canceled" | "done";
  /** 백엔드 계약 ID (연동용) */
  backendContractId?: string | number;
}

// 계약 상태 타입
export type ContractStatus = ContractData["status"];

// 계약 상태 설정 타입
export interface StatusConfig {
  label: string;
  className: string;
}

// 계약 상태별 설정 맵
export type StatusConfigMap = Record<ContractStatus, StatusConfig>;
