"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/shared/api/api";
import { getProfile, getEmployeesList } from "@/features/users/api/account";
import {
  createContract,
  updateContract,
  deleteContract
} from "../api/contracts";
import {
  transformSalesContractToCreateRequest,
  transformSalesContractToUpdateRequest
} from "../utils/contractTransformers";
import { calculateVAT } from "../utils/utils";
import type { SalesContractData } from "../types/contract-records";

// 기본 데이터 상수
export const defaultContractData: SalesContractData = {
  customerInfo: { name: "", contact: "" },
  salesManager: { name: "", contact: "" },
  salesPerson: { name: "", contact: "" },
  contractSite: { address: "", siteName: "", teamContact: "" },
  financialInfo: {
    brokerageFee: 0,
    vat: 0,
    vatStatus: "vat-included",
    totalBrokerageFee: 0,
    totalRebate: 0,
    taxStatus: "tax-free",
    totalSupportAmount: 0,
    supportCashAmount: 0,
    customerAccountNumber: "",
    customerBank: "",
    supportContent: "",
  },
  staffAllocations: [
    { id: "company", name: "회사", type: "company", percentage: 100, isDirectInput: false, rebateAllowance: 0, finalAllowance: 0 },
    { id: "employee1", name: "영업담당자", type: "employee", percentage: 0, isDirectInput: false, rebateAllowance: 0, finalAllowance: 0 },
  ],
  contractImages: [],
  totalCalculation: 0,
};

export function useSalesContractModal(
  isOpen: boolean,
  onClose: () => void,
  initialData?: any,
  onDataChange?: (data: SalesContractData) => void
) {
  const [data, setData] = useState<SalesContractData>(defaultContractData);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [isContractDateOpen, setIsContractDateOpen] = useState(false);
  const [isBalanceDateOpen, setIsBalanceDateOpen] = useState(false);
  const { toast } = useToast();

  // 1. 프로필 정보 조회
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000,
  });

  // 2. 팀 멤버 정보 조회
  const { data: myTeamMembers } = useQuery({
    queryKey: ["my-team-members", profile?.role, profile?.account?.id],
    queryFn: async () => {
      if (!profile) return [];
      if (profile.role === "admin" || profile.role === "manager") {
        try {
          const list = await getEmployeesList({ onlyActive: true });
          return list.map((item) => ({
            accountId: item.accountId,
            name: item.name,
            positionRank: item.positionRank,
            phone: item.phone,
            teamRole: (item.teamRole as any) || "staff",
          }));
        } catch (e) { return []; }
      }
      try {
        const accountId = profile?.account?.id;
        if (!accountId) return [];
        const teamsRes = await api.get("/dashboard/accounts/teams");
        const teams = teamsRes.data.data ?? [];
        for (const team of teams) {
          const teamDetailResponse = await api.get(`/dashboard/accounts/teams/${team.id}`);
          const members = teamDetailResponse.data.data.members;
          if (members.some((m: any) => String(m.accountId) === String(accountId))) {
            return members;
          }
        }
        return [];
      } catch (error) { return []; }
    },
    enabled: !!profile && isOpen,
    staleTime: 10 * 60 * 1000,
  });

  // 3. 재계산 로직
  const recalculateTotal = (
    financialInfo: SalesContractData["financialInfo"],
    currentStatus: SalesContractData["status"]
  ) => {
    if (currentStatus === "rejected" || currentStatus === "cancelled") return 0;
    const brokerageAndVat = Number(financialInfo.totalBrokerageFee) || 0;
    const totalRebate = Number(financialInfo.totalRebate) || 0;
    const totalSupportAmount = Number(financialInfo.totalSupportAmount) || 0;
    const supportCashAmount = Number(financialInfo.supportCashAmount) || 0;
    const rebateMinusSupport = totalRebate - totalSupportAmount;
    const multiplier = financialInfo.taxStatus === "taxable" ? 0.967 : 1;
    return brokerageAndVat + rebateMinusSupport * multiplier - supportCashAmount;
  };

  // 4. 데이터 초기화 및 동기화 (useEffect)
  const initialImagesKey = useMemo(() => {
    if (!initialData?.contractImages) return "";
    return JSON.stringify(initialData.contractImages.map((img: any) => ({ id: img.id, preview: img.preview })));
  }, [initialData?.contractImages]);

  useEffect(() => {
    if (!isOpen) return;

    const enrichAllocations = (base: SalesContractData) => {
      let currentData = { ...base };
      const allocations = currentData.staffAllocations || defaultContractData.staffAllocations;

      if (profile && !initialData?.id) {
        const myId = profile.account?.id;
        const myName = profile.account?.name || "";
        const myIsLeader = profile.role === "manager" || profile.role === "admin";

        currentData = {
          ...currentData,
          salesPerson: {
            name: currentData.salesPerson?.name || myName,
            contact: currentData.salesPerson?.contact || profile.account?.phone || "",
          },
          staffAllocations: allocations.map((staff) => {
            if (staff.id === "employee1" && !staff.accountId) {
              return { ...staff, accountId: myId, name: myName, isTeamLeader: myIsLeader };
            }
            return staff;
          }),
        };
      }

      if (!myTeamMembers || myTeamMembers.length === 0) return currentData;

      return {
        ...currentData,
        staffAllocations: currentData.staffAllocations.map((staff) => {
          if (staff.type !== "employee" || !staff.accountId) return staff;
          const member = myTeamMembers.find((m: any) => String(m.accountId) === String(staff.accountId));
          if (!member) return staff;
          return {
            ...staff,
            positionRank: (member as any).positionRank ?? staff.positionRank,
            isTeamLeader: (member as any).teamRole === "manager" || (member as any).teamRole === "admin",
          };
        }),
      };
    };

    if (initialData) {
      if (initialData.id) {
        setData(enrichAllocations(initialData));
        setIsEditMode(false);
      } else {
        const merged: SalesContractData = {
          ...defaultContractData,
          ...(initialData || {}),
          customerInfo: {
            ...defaultContractData.customerInfo,
            ...(initialData.customerInfo || {}),
            name: initialData.customerInfo?.name || "",
            contact: initialData.customerInfo?.contact || (initialData as any).customerPhone || ""
          },
          contractSite: {
            ...defaultContractData.contractSite,
            ...(initialData.contractSite || {}),
            siteName: (initialData as any).siteName || initialData.contractSite?.siteName || "",
            address: initialData.contractSite?.address || "",
            teamContact: initialData.contractSite?.teamContact || (initialData as any).salesTeamPhone || "",
          },
          contractDate: initialData.contractDate || format(new Date(), "yyyy-MM-dd")
        };
        setData(enrichAllocations(merged));
        setIsEditMode(true);
      }
    } else {
      setData(enrichAllocations(defaultContractData));
      setIsEditMode(true);
    }
  }, [initialData, myTeamMembers, profile, isOpen, initialImagesKey]);

  // 5. 핸들러 함수들
  const handleDataChange = (newData: SalesContractData) => setData(newData);

  const handleFinancialInfoChange = (financialInfo: any) => {
    const vat = calculateVAT(financialInfo.brokerageFee, financialInfo.vatStatus);
    const totalBrokerageFee = financialInfo.brokerageFee + vat;
    const updatedFinancialInfo = { ...financialInfo, vat, totalBrokerageFee };
    const totalCalculation = recalculateTotal(updatedFinancialInfo, data.status);

    handleDataChange({ ...data, financialInfo: updatedFinancialInfo, totalCalculation });
  };

  const handleStaffAllocationsChange = (newAllocations: any[]) => {
    const firstEmployee = newAllocations.find(s => s.type === "employee");
    const member = myTeamMembers?.find((m: any) => String(m.accountId) === String(firstEmployee?.accountId));

    handleDataChange({
      ...data,
      staffAllocations: newAllocations,
      salesPerson: {
        name: firstEmployee?.name || data.salesPerson.name,
        contact: member?.phone || data.salesPerson.contact
      }
    });
  };

  const handleSave = async () => {
    if (!data.customerInfo.name.trim()) return toast({ title: "입력 오류", description: "고객명을 입력해주세요.", variant: "destructive" });
    if (!data.customerInfo.contact.trim()) return toast({ title: "입력 오류", description: "고객 연락처를 입력해주세요.", variant: "destructive" });
    if (!data.contractSite?.siteName.trim()) return toast({ title: "입력 오류", description: "현장명을 입력해주세요.", variant: "destructive" });
    if (!data.contractDate) return toast({ title: "입력 오류", description: "계약일을 선택해주세요.", variant: "destructive" });

    // 날짜 논리 검증 추가
    if (data.balanceDate && data.contractDate) {
      const cDate = new Date(data.contractDate);
      const bDate = new Date(data.balanceDate);
      if (bDate < cDate) {
        return toast({ 
          title: "날짜 오류", 
          description: "잔금일자는 계약일자보다 과거일 수 없습니다.", 
          variant: "destructive" 
        });
      }
    }

    setIsLoading(true);
    try {
      if (data.id) {
        const updateRequest = transformSalesContractToUpdateRequest(data, profile);
        await updateContract(Number(data.id), updateRequest);
        toast({ title: "계약 수정 완료", description: "성공적으로 수정되었습니다." });
        setIsEditMode(false);
      } else {
        const requestData = transformSalesContractToCreateRequest(data, profile);
        const result = await createContract(requestData);
        toast({ title: "계약 생성 완료", description: `계약 ${result.contractNo}이 생성되었습니다.` });
        onClose();
      }
      onDataChange?.(data);
    } catch (error: any) {
      toast({ title: "저장 실패", description: error?.response?.data?.message || "오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!data.id || !confirm("정말 이 계약을 삭제하시겠습니까?")) return;
    setIsLoading(true);
    try {
      await deleteContract(Number(data.id));
      toast({ title: "삭제 완료", description: "계약이 삭제되었습니다." });
      onDataChange?.(data);
      onClose();
    } catch (error) {
      toast({ title: "삭제 실패", description: "오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (initialData && initialData.id) {
      setData(initialData);
      setIsEditMode(false);
    } else {
      onClose();
    }
  };

  return {
    data,
    setData,
    isLoading,
    isEditMode,
    setIsEditMode,
    isContractDateOpen,
    setIsContractDateOpen,
    isBalanceDateOpen,
    setIsBalanceDateOpen,
    profile,
    myTeamMembers,
    handleDataChange,
    handleFinancialInfoChange,
    handleStaffAllocationsChange,
    handleSave,
    handleDelete,
    handleCancel,
    recalculateTotal,
  };
}
