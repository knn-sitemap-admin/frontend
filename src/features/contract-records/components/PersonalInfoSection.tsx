"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { formatPhone } from "@/lib/formatPhone";
import type { PersonInfo } from "../types/contract-records";

interface PersonalInfoSectionProps {
  customerInfo: PersonInfo;
  salesPerson: PersonInfo;
  onCustomerInfoChange: (info: PersonInfo) => void;
  onSalesPersonChange: (info: PersonInfo) => void;
  readOnly?: boolean;
}

export function PersonalInfoSection({
  customerInfo,
  salesPerson,
  onCustomerInfoChange,
  onSalesPersonChange,
  readOnly = false,
}: PersonalInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* 고객 정보 카드 */}
      <Card className="flex-shrink-0 md:col-span-2">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-sm">고객정보</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="customer-name"
                className="text-xs text-muted-foreground font-bold"
              >
                성함
              </Label>
              <Input
                id="customer-name"
                value={customerInfo.name}
                onChange={(e) =>
                  onCustomerInfoChange({
                    ...customerInfo,
                    name: e.target.value,
                  })
                }
                className="h-10 text-sm font-medium"
                placeholder="고객명 입력"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label
                htmlFor="customer-contact"
                className="text-xs text-muted-foreground font-bold"
              >
                연락처
              </Label>
              <Input
                id="customer-contact"
                value={customerInfo.contact}
                onChange={(e) =>
                  onCustomerInfoChange({
                    ...customerInfo,
                    contact: formatPhone(e.target.value),
                  })
                }
                className="h-10 text-sm font-medium"
                placeholder="010-1234-5678"
                readOnly={readOnly}
                disabled={readOnly}
                inputMode="tel"
              />
            </div>
          </div>
        </CardContent>
      </Card>
 
      {/* 담당자 카드 */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-sm">담당자</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-1">
            <Label
              htmlFor="sales-person-name"
              className="text-xs text-muted-foreground font-bold"
            >
              이름
            </Label>
            <Input
              id="sales-person-name"
              value={salesPerson.name}
              readOnly
              className="h-10 text-sm bg-muted font-bold"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
