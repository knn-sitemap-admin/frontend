"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";
import { Separator } from "@/components/atoms/Separator/Separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ContractSiteSection } from "./ContractSiteSection";
import { FinancialInfoSection } from "./FinancialInfoSection";
import { StaffAllocationSection } from "./StaffAllocationSection";
import { ContractImageSection } from "./ContractImageSection";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { statusConfigMap } from "@/components/contract-management/utils/contractUtils";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Label } from "@/components/atoms/Label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { ChevronDownIcon, X } from "lucide-react";
import { useSalesContractModal, defaultContractData } from "../hooks/useSalesContractModal";
import type { SalesContractViewModalProps } from "../types/contract-records";

export function SalesContractRecordsModal({
  isOpen,
  onClose,
  data: initialData,
  onDataChange,
}: SalesContractViewModalProps) {
  // 모든 복잡한 로직을 커스텀 훅으로 위임
  const {
    data,
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
  } = useSalesContractModal(isOpen, onClose, initialData, onDataChange);

  // 모달이 닫혀 있으면 렌더링하지 않음 (방어 코드)
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-contract-records-modal-root
        className="w-[98vw] sm:w-full sm:max-w-[1240px] h-[98dvh] sm:h-[90vh] sm:max-h-[900px] p-0 flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-none shadow-2xl"
      >
        {/* 고정 헤더 */}
        <DialogHeader className="pb-1 flex-shrink-0 p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              영업 계약기록 관리
            </DialogTitle>
            <DialogDescription className="sr-only">
              계약 상세 정보 확인 및 수정을 위한 모달 창입니다.
            </DialogDescription>
            {data.contractNumber && (
              <div className="text-sm text-muted-foreground mr-8">
                계약번호:{" "}
                <span className="font-medium text-foreground">
                  {data.contractNumber}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4 premium-scrollbar">
          <div className="flex flex-col gap-2">
            {/* 계약 정보 카드 */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-sm">계약 정보</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* 계약일자 */}
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">계약일자</Label>
                    <div className="relative">
                      <Popover open={isContractDateOpen} onOpenChange={setIsContractDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!isEditMode}
                            className={`flex w-full items-center justify-between text-left font-normal h-7 text-xs ${!data.contractDate ? "text-muted-foreground" : ""}`}
                          >
                            {data.contractDate ? format(new Date(data.contractDate), "PPP", { locale: ko }) : <span>계약일자를 선택하세요</span>}
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 !z-[2200]" align="start">
                          <Calendar
                            mode="single"
                            selected={data.contractDate ? new Date(data.contractDate) : undefined}
                            locale={ko}
                            onSelect={(date) => {
                              if (date) {
                                handleDataChange({ ...data, contractDate: format(date, "yyyy-MM-dd") });
                                setIsContractDateOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* 잔금일자 */}
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">잔금일자</Label>
                    <div className="relative">
                      <Popover open={isBalanceDateOpen} onOpenChange={setIsBalanceDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!isEditMode}
                            className={`flex w-full items-center justify-between text-left font-normal h-7 text-xs ${!data.balanceDate ? "text-muted-foreground" : ""}`}
                          >
                            {data.balanceDate ? format(new Date(data.balanceDate), "PPP", { locale: ko }) : <span>잔금일자를 선택하세요</span>}
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 !z-[2200]" align="start">
                          <Calendar
                            mode="single"
                            selected={data.balanceDate ? new Date(data.balanceDate) : undefined}
                            locale={ko}
                            onSelect={(date) => {
                              if (date) {
                                handleDataChange({ ...data, balanceDate: format(date, "yyyy-MM-dd") });
                                setIsBalanceDateOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* 계약 상태 */}
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">계약 상태</Label>
                    <Select
                      value={data.status || "ongoing"}
                      onValueChange={(value) => {
                        const newStatus = value as NonNullable<typeof data.status>;
                        const newTotal = recalculateTotal(data.financialInfo, newStatus);
                        handleDataChange({ ...data, status: newStatus, totalCalculation: newTotal });
                      }}
                      disabled={!isEditMode}
                    >
                      <SelectTrigger className={`h-7 text-xs ${statusConfigMap[(data.status || "ongoing") as keyof typeof statusConfigMap]?.className || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!z-[2200]">
                        <SelectItem value="ongoing" className="text-xs">계약중</SelectItem>
                        <SelectItem value="rejected" className="text-xs">부결</SelectItem>
                        <SelectItem value="cancelled" className="text-xs">해약</SelectItem>
                        <SelectItem value="completed" className="text-xs">계약완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 인적 정보 */}
            <PersonalInfoSection
              customerInfo={data.customerInfo || defaultContractData.customerInfo}
              salesPerson={data.salesPerson || defaultContractData.salesPerson}
              onCustomerInfoChange={(customerInfo) => handleDataChange({ ...data, customerInfo })}
              onSalesPersonChange={(salesPerson) => handleDataChange({ ...data, salesPerson })}
              readOnly={!isEditMode}
            />

            {/* 계약현장 정보 */}
            <ContractSiteSection
              contractSite={data.contractSite || defaultContractData.contractSite!}
              onContractSiteChange={(contractSite) => handleDataChange({ ...data, contractSite })}
              readOnly={!isEditMode}
            />

            {/* 재무 정보 */}
            <FinancialInfoSection
              financialInfo={data.financialInfo || defaultContractData.financialInfo}
              onFinancialInfoChange={handleFinancialInfoChange}
              readOnly={!isEditMode}
            />

            {/* 담당자 분배 */}
            <StaffAllocationSection
              staffAllocations={data.staffAllocations || defaultContractData.staffAllocations}
              onStaffAllocationsChange={handleStaffAllocationsChange}
              totalCalculation={data.totalCalculation || 0}
              totalRebate={data.financialInfo?.totalRebate ?? 0}
              teamMembers={myTeamMembers || []}
              userRole={profile?.role}
              readOnly={!isEditMode}
            />

            {/* 계약 이미지 */}
            <ContractImageSection
              initialImages={data.contractImages || []}
              onImagesChange={(contractImages) => handleDataChange({ ...data, contractImages })}
              readOnly={!isEditMode}
            />
          </div>
        </div>

        {/* 고정 하단 버튼 영역 */}
        <div className="flex-shrink-0 border-t p-4">
          <Separator className="mb-3" />
          <div className="flex justify-end space-x-2">
            {isEditMode ? (
              <>
                <Button onClick={handleCancel} variant="outline" className="h-7 text-xs" disabled={isLoading}>취소</Button>
                <Button onClick={handleSave} className="h-7 text-xs" disabled={isLoading}>{isLoading ? "저장 중..." : "저장"}</Button>
              </>
            ) : (
              <>
                <Button onClick={onClose} variant="outline" className="h-7 text-xs" disabled={isLoading}>닫기</Button>
                {data.id && (
                  <>
                    <Button onClick={() => setIsEditMode(true)} className="h-7 text-xs" disabled={isLoading}>수정</Button>
                    <Button onClick={handleDelete} variant="destructive" className="h-7 text-xs" disabled={isLoading}>{isLoading ? "삭제 중..." : "삭제"}</Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
