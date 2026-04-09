import type { StatusConfigMap } from "../types";

// 계약 상태별 설정
export const statusConfigMap: StatusConfigMap = {
  ongoing: {
    label: "계약중",
    className: "bg-blue-100 text-blue-800",
  },
  rejected: {
    label: "부결",
    className: "bg-orange-100 text-orange-800",
  },
  cancelled: {
    label: "해약",
    className: "bg-red-100 text-red-800",
  },
  completed: {
    label: "계약완료",
    className: "bg-green-100 text-green-800",
  },
};

// 금액 포맷팅 함수 (반올림 없이 정확한 값 표시)
export const formatCurrency = (amount: number | string): string => {
  // 이미 문자열로 포맷팅된 경우를 대비해 숫자로 변환
  const numAmount =
    typeof amount === "string"
      ? parseFloat(amount.replace(/,/g, "")) || 0
      : Number(amount) || 0;

  // NaN 체크
  if (isNaN(numAmount)) {
    return "0원";
  }

  // 정수인지 확인
  if (numAmount % 1 === 0) {
    return `${numAmount.toLocaleString("ko-KR", { maximumFractionDigits: 0, useGrouping: true })}원`;
  }
  // 소수점이 있으면 모든 자릿수 표시 (반올림 방지)
  return `${numAmount.toLocaleString("ko-KR", { maximumFractionDigits: 20, useGrouping: true })}원`;
};

/**
 * 한국식 금액 표기 (억, 만 단위)
 * 예: 123450000 -> 1억 2,345만
 */
export const formatKoreanAmount = (amount: number | string, includeWon = false): string => {
  const numAmount = 
    typeof amount === "string" 
      ? parseFloat(amount.replace(/,/g, "")) || 0 
      : Number(amount) || 0;

  if (isNaN(numAmount) || numAmount === 0) return "0";

  const eok = Math.floor(numAmount / 100000000);
  const man = Math.floor((numAmount % 100000000) / 10000);
  
  let result = "";
  if (eok > 0) result += `${eok}억 `;
  if (man > 0) result += `${man.toLocaleString()}만`;
  
  if (result === "") {
    // 만원 미만인 경우 원 단위로 표시하거나 0.x만으로 표시할 수 있으나 
    // 여기서는 요청에 따라 0.x만이 아닌 최소 단위를 만으로 맞추거나 0으로 처리
    const rem = numAmount % 10000;
    if (rem > 0) return `${numAmount.toLocaleString()}${includeWon ? "원" : ""}`;
    return "0";
  }

  return result.trim() + (includeWon ? "원" : "");
};

// 날짜 포맷팅 함수
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("ko-KR");
};

// 계약번호 포맷팅 함수
export const formatContractNumber = (contractNumber: string): string => {
  return contractNumber;
};
