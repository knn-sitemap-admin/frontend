import React from "react";
import type { TableColumn } from "@/features/table/types/table";
import type { ContractData } from "../types";
import { statusConfigMap, formatCurrency, formatDate } from "./contractUtils";

// 테이블 컬럼 설정
export const contractTableColumns: TableColumn<ContractData>[] = [
  {
    key: "contractNumber",
    label: "계약번호",
    width: "110px",
    align: "center",
    render: (value) => (
      <div className="font-medium text-blue-600 whitespace-nowrap">{value}</div>
    ),
  },
  {
    key: "salesPerson",
    label: "담당자",
    width: "80px",
    align: "center",
    render: (value) => <div className="whitespace-nowrap">{value}</div>,
  },
  {
    key: "customerName",
    label: "고객명",
    width: "80px",
    align: "center",
    render: (value) => <div className="whitespace-nowrap">{value}</div>,
  },
  {
    key: "customerContact",
    label: "연락처",
    width: "135px",
    align: "center",
    render: (value) => <div className="whitespace-nowrap">{value}</div>,
  },
  {
    key: "totalCalculation",
    label: "총수익",
    width: "120px",
    align: "right",
    render: (value, row) => {
      const isZeroStatus = row.status === "rejected" || row.status === "cancelled";
      return (
        <div className="font-semibold text-gray-900 whitespace-nowrap">
          {formatCurrency(isZeroStatus ? 0 : value)}
        </div>
      );
    },
  },
  {
    key: "contractDate",
    label: "계약일",
    width: "105px",
    align: "center",
    render: (value) => (
      <div className="whitespace-nowrap">{value ? formatDate(value) : "-"}</div>
    ),
  },
  {
    key: "balanceDate",
    label: "잔금일",
    width: "105px",
    align: "center",
    render: (value) => (
      <div className="whitespace-nowrap">{value ? formatDate(value) : "-"}</div>
    ),
  },
  {
    key: "companyAmount",
    label: "회사입금액",
    width: "125px",
    align: "right",
    render: (value, row) => {
      const isZeroStatus = row.status === "rejected" || row.status === "cancelled";
      return (
        <div className="font-medium text-blue-600 whitespace-nowrap">
          {formatCurrency(isZeroStatus ? 0 : (value ?? 0))}
        </div>
      );
    },
  },
  {
    key: "teamLeaderAmount",
    label: "팀장급여",
    width: "125px",
    align: "right",
    render: (value, row) => {
      const isZeroStatus = row.status === "rejected" || row.status === "cancelled";
      return (
        <div className="font-medium text-emerald-600 whitespace-nowrap">
          {formatCurrency(isZeroStatus ? 0 : (value ?? 0))}
        </div>
      );
    },
  },
  {
    key: "salesPersonAmount",
    label: "영업자급여",
    width: "125px",
    align: "right",
    render: (value, row) => {
      const isZeroStatus = row.status === "rejected" || row.status === "cancelled";
      return (
        <div className="font-medium text-orange-600 whitespace-nowrap">
          {formatCurrency(isZeroStatus ? 0 : (value ?? 0))}
        </div>
      );
    },
  },
  {
    key: "status",
    label: "상태",
    width: "85px",
    align: "center",
    render: (value) => {
      const config = statusConfigMap[value as keyof typeof statusConfigMap];
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}
        >
          {config.label}
        </span>
      );
    },
  },
];

// 검색 키 설정
export const searchKeys = ["contractNumber", "customerName", "salesPerson"];

// 페이지네이션 설정
export const paginationConfig = {
  listsPerPage: 10,
} as const;
