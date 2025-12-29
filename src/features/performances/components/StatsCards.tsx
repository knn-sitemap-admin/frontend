import { Card, CardContent } from "@/components/atoms/Card/Card";
import { DollarSign, TrendingUp, Users, FileText } from "lucide-react";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";

interface StatsCardsProps {
  totalContracts: number;
  totalAllowance: number; // 총매출
  netProfit: number; // 순수익
  totalEmployees: number;
}

export function StatsCards({
  totalContracts,
  totalAllowance,
  netProfit,
  totalEmployees,
}: StatsCardsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">회사 총매출</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 총매출 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총매출</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalAllowance)}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 순수익 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">순수익</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(netProfit)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 계약 건수 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  총 계약 건수
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalContracts.toLocaleString()}건
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 인원수 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 인원수</p>
                <div className="text-2xl font-bold text-gray-900">
                  {totalEmployees}명
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
