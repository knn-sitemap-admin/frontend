"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { Textarea } from "@/components/atoms/Textarea/Textarea";
import type { FinancialInfo } from "../types/contract-records";
import {
  formatCurrency,
  formatNumberWithCommas,
  parseNumberFromFormatted,
} from "../utils/utils";

interface FinancialInfoSectionProps {
  financialInfo: FinancialInfo;
  onFinancialInfoChange: (info: FinancialInfo) => void;
  readOnly?: boolean;
}

export function FinancialInfoSection({
  financialInfo,
  onFinancialInfoChange,
  readOnly = false,
}: FinancialInfoSectionProps) {
  const handleInputChange = (
    field: keyof FinancialInfo,
    value: string | number
  ) => {
    const numValue =
      typeof value === "string" ? parseNumberFromFormatted(value) : value;
    onFinancialInfoChange({ ...financialInfo, [field]: numValue });
  };

  // 천단위 구분자가 포함된 숫자 입력 핸들러
  const handleFormattedInputChange = (
    field: keyof FinancialInfo,
    value: string
  ) => {
    const formatted = formatNumberWithCommas(value);
    const numValue = parseNumberFromFormatted(formatted);
    onFinancialInfoChange({ ...financialInfo, [field]: numValue });
  };

  const handleStringInputChange = (
    field: keyof FinancialInfo,
    value: string
  ) => {
    onFinancialInfoChange({ ...financialInfo, [field]: value });
  };

  const handleRebateInputChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // 리베이트 입력값을 실제 금액으로 변환 (1 = 100만원, 0.5 = 50만원)
    const actualAmount = numValue * 1000000;
    onFinancialInfoChange({ ...financialInfo, totalRebate: actualAmount });
  };

  const handleTaxStatusChange = (value: string) => {
    onFinancialInfoChange({
      ...financialInfo,
      taxStatus: value as "taxable" | "tax-free",
    });
  };

  return (
    <Card className="flex-shrink-0">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-sm">금액 정보</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-end gap-3 sm:gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">중개보수금</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={
                  financialInfo.brokerageFee === 0
                    ? ""
                    : formatNumberWithCommas(
                        financialInfo.brokerageFee.toString()
                      )
                }
                onChange={(e) =>
                  handleFormattedInputChange("brokerageFee", e.target.value)
                }
                className="h-10 text-sm w-full lg:w-32"
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
              <span className="text-[11px] font-bold text-gray-400 shrink-0">원</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">부가세</Label>
            <Select
              value={financialInfo.vatStatus || "vat-included"}
              onValueChange={(value) =>
                onFinancialInfoChange({
                  ...financialInfo,
                  vatStatus: value as "vat-included" | "vat-excluded",
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-10 text-sm w-full lg:w-32"
                disabled={readOnly}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                data-contract-records-portal="true"
                className="!z-[100005]"
              >
                <SelectItem value="vat-included" className="text-xs">
                  부가세
                </SelectItem>
                <SelectItem value="vat-excluded" className="text-xs">
                  미부가세
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">
              중개보수금합계
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={
                  financialInfo.totalBrokerageFee === 0
                    ? ""
                    : formatNumberWithCommas(
                        financialInfo.totalBrokerageFee.toString()
                      )
                }
                onChange={(e) =>
                  handleFormattedInputChange(
                    "totalBrokerageFee",
                    e.target.value
                  )
                }
                className="h-10 text-sm w-full lg:w-32"
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
              <span className="text-[11px] font-bold text-gray-400 shrink-0">원</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">
              총리베이트(R)
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                value={
                  financialInfo.totalRebate === 0
                    ? ""
                    : financialInfo.totalRebate / 1000000
                }
                onChange={(e) => handleRebateInputChange(e.target.value)}
                className="h-10 text-sm w-full lg:w-28"
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
              <span className="text-[11px] font-bold text-gray-400 shrink-0">R</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">과세 여부</Label>
            <Select
              value={financialInfo.taxStatus}
              onValueChange={handleTaxStatusChange}
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-10 text-sm w-full lg:w-28"
                disabled={readOnly}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                data-contract-records-portal="true"
                className="!z-[100005]"
              >
                <SelectItem value="taxable" className="text-xs">
                  과세
                </SelectItem>
                <SelectItem value="tax-free" className="text-xs">
                  비과세
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">지원금액</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={
                  financialInfo.totalSupportAmount === 0
                    ? ""
                    : formatNumberWithCommas(
                        financialInfo.totalSupportAmount.toString()
                      )
                }
                onChange={(e) =>
                  handleFormattedInputChange(
                    "totalSupportAmount",
                    e.target.value
                  )
                }
                className="h-10 text-sm w-full lg:w-32"
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
              <span className="text-[11px] font-bold text-gray-400 shrink-0">원</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-bold">현금지원금액</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={
                  financialInfo.supportCashAmount === 0 || !financialInfo.supportCashAmount
                    ? ""
                    : formatNumberWithCommas(
                        financialInfo.supportCashAmount.toString()
                      )
                }
                onChange={(e) =>
                  handleFormattedInputChange(
                    "supportCashAmount",
                    e.target.value
                  )
                }
                className="h-10 text-sm w-full lg:w-32"
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
              <span className="text-[11px] font-bold text-gray-400 shrink-0">원</span>
            </div>
          </div>
        </div>

        {/* 고객 계좌 정보 */}
        <div className="mt-4 space-y-3">
          <div className="text-sm font-bold text-gray-700">고객 계좌</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-3 sm:gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-bold">은행</Label>
              <Input
                value={financialInfo.customerBank || ""}
                onChange={(e) =>
                  handleStringInputChange("customerBank", e.target.value)
                }
                className="h-10 text-sm w-full lg:w-40"
                placeholder="은행명 입력"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1 lg:flex-1">
              <Label className="text-xs text-muted-foreground font-bold">계좌번호</Label>
              <Input
                value={financialInfo.customerAccountNumber || ""}
                onChange={(e) =>
                  handleStringInputChange(
                    "customerAccountNumber",
                    e.target.value
                  )
                }
                className="h-10 text-sm w-full"
                placeholder="계좌번호 입력"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* 지원 내용 */}
        <div className="mt-4 space-y-2">
          <Label className="text-sm font-medium text-gray-700">지원 내용 ( 기타 입력 )</Label>
          <Textarea
            value={financialInfo.supportContent || ""}
            onChange={(e) =>
              handleStringInputChange("supportContent", e.target.value)
            }
            className="min-h-20 text-xs resize-none"
            placeholder="지원 내용을 입력하세요"
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>

        <div className="mt-3 space-y-2">
          {/* 계산 공식들 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>계산 공식:</div>
            <div>
              • (중개수수료 + 부가세) + ((리베이트 - 영수지원금){" "}
              {financialInfo.taxStatus === "taxable" ? "× 0.967" : ""}) - 현금지원금 ={""}
              {(() => {
                // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-영수지원금)×0.967)-현금지원금
                // 비과세시 (중개수수료+부가세)+(리베이트-영수지원금)-현금지원금
                const brokerageAndVat =
                  Number(financialInfo.totalBrokerageFee) || 0;
                const totalRebate = Number(financialInfo.totalRebate) || 0;
                const totalSupportAmount =
                  Number(financialInfo.totalSupportAmount) || 0;
                const supportCashAmount =
                  Number(financialInfo.supportCashAmount) || 0;
                const rebateMinusSupport =
                  totalRebate - totalSupportAmount;
                const multiplier =
                  financialInfo.taxStatus === "taxable" ? 0.967 : 1;
                const finalTotal =
                  brokerageAndVat + rebateMinusSupport * multiplier - supportCashAmount;
                return formatCurrency(finalTotal);
              })()}
              원
            </div>
            <div className="text-xs text-gray-500">
              {financialInfo.taxStatus === "taxable"
                ? "• 과세 적용 (리베이트 - 지원금 총합에 0.967 곱함)"
                : "• 비과세 적용"}
            </div>
          </div>

          {/* 총 합계 */}
          <div className="p-2 bg-primary/10 rounded-lg">
            <div className="text-sm font-medium mb-1">총 금액</div>
            <div className="text-lg font-bold text-primary">
              {(() => {
                // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-영수지원금)×0.967)-현금지원금
                // 비과세시 (중개수수료+부가세)+(리베이트-영수지원금)-현금지원금
                const brokerageAndVat =
                  Number(financialInfo.totalBrokerageFee) || 0;
                const totalRebate = Number(financialInfo.totalRebate) || 0;
                const totalSupportAmount =
                  Number(financialInfo.totalSupportAmount) || 0;
                const supportCashAmount =
                  Number(financialInfo.supportCashAmount) || 0;
                const rebateMinusSupport =
                  totalRebate - totalSupportAmount;
                const multiplier =
                  financialInfo.taxStatus === "taxable" ? 0.967 : 1;
                const finalTotal =
                  brokerageAndVat + rebateMinusSupport * multiplier - supportCashAmount;
                return formatCurrency(finalTotal);
              })()}
              원
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
