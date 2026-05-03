import type { SalesContractData } from "@/features/contract-records/types/contract-records";
import type { ContractData } from "../types";

// SalesContractData를 ContractData로 변환
export const transformSalesContractToContract = (
  salesData: SalesContractData,
  id?: string,
  status: ContractData["status"] = "done"
): ContractData => {
  // 필수 데이터 검증
  if (!salesData.customerInfo?.name || !salesData.salesPerson?.name) {
    throw new Error("고객명과 담당자는 필수 입력 항목입니다.");
  }

  // 백엔드에서 생성된 ID 사용 (없으면 에러)
  if (!salesData.id && !id) {
    throw new Error("계약 ID가 필요합니다. 백엔드에서 생성되어야 합니다.");
  }

  const contractId = salesData.id || id!;

  // 상태 값 정규화 (completed -> done, cancelled -> canceled)
  const rawStatus = salesData.status || status;
  let normalizedStatus: ContractData["status"] = "ongoing";

  if (rawStatus === "done") {
    normalizedStatus = "done";
  } else if (rawStatus === "canceled") {
    normalizedStatus = "canceled";
  } else if (rawStatus === "rejected") {
    normalizedStatus = "rejected";
  } else {
    normalizedStatus = "ongoing";
  }

  return {
    id: contractId,
    contractNumber: salesData.contractNumber || contractId,
    customerName: salesData.customerInfo.name,
    customerContact: salesData.customerInfo.contact || "", // 고객 연락처만 사용
    salesPerson: salesData.salesPerson.name, // 담당자 이름
    totalCalculation: salesData.totalCalculation || 0,
    salesPersonSalary: 0, // 담당자 급여 (별도 계산 필요)
    contractDate:
      salesData.contractDate || new Date().toISOString().split("T")[0],
    status: normalizedStatus,
  };
};

// 계약 상태 업데이트 함수
export const updateContractStatus = (
  contract: ContractData,
  newStatus: ContractData["status"]
): ContractData => {
  return {
    ...contract,
    status: newStatus,
  };
};

// 계약 데이터 검증 함수
export const validateContractData = (data: ContractData): boolean => {
  return !!(
    data.contractNumber &&
    data.customerName &&
    data.customerContact &&
    data.salesPerson &&
    data.totalCalculation > 0 &&
    data.contractDate
  );
};
