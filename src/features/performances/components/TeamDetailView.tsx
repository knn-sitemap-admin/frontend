import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Table } from "@/features/table/components/Table";
import {
  EmployeeAllowanceChart,
  EmployeeContractChart,
} from "./EmployeeCharts";
import { PerformanceFilters } from "./PerformanceFilters";

interface PerformanceData {
  employeeName: string;
  team: string;
  contractCount: number;
  finalAllowance: number;
  period: string;
}

interface TeamDetailViewProps {
  selectedTeamDetail: string | null;
  selectedTeamMembers: PerformanceData[];
  selectedPeriod: string;
  selectedYear: string;
  selectedQuarter?: string;
  selectedMonth?: string;
  yearOptions: string[];
  quarterOptions?: string[];
  monthOptions?: string[];
  chartConfig: {
    totalAllowance: {
      label: string;
      color: string;
    };
    finalAllowance: {
      label: string;
      color: string;
    };
    contractCount: {
      label: string;
      color: string;
    };
  };
  onPeriodChange: (period: string) => void;
  onYearChange: (year: string) => void;
  onQuarterChange?: (quarter: string) => void;
  onMonthChange?: (month: string) => void;
  onClose: () => void;
}

export function TeamDetailView({
  selectedTeamDetail,
  selectedTeamMembers,
  selectedPeriod,
  selectedYear,
  selectedQuarter,
  selectedMonth,
  yearOptions,
  quarterOptions,
  monthOptions,
  chartConfig,
  onPeriodChange,
  onYearChange,
  onQuarterChange,
  onMonthChange,
  onClose,
}: TeamDetailViewProps) {
  if (!selectedTeamDetail) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              {selectedTeamDetail} 직원별 실적
            </CardTitle>
            <PerformanceFilters
              selectedPeriod={selectedPeriod}
              selectedYear={selectedYear}
              selectedQuarter={selectedQuarter}
              selectedMonth={selectedMonth}
              yearOptions={yearOptions}
              quarterOptions={quarterOptions}
              monthOptions={monthOptions}
              onPeriodChange={onPeriodChange}
              onYearChange={onYearChange}
              onQuarterChange={onQuarterChange}
              onMonthChange={onMonthChange}
              onClose={onClose}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmployeeAllowanceChart
              selectedTeamMembers={selectedTeamMembers}
              chartConfig={chartConfig}
            />
            <EmployeeContractChart
              selectedTeamMembers={selectedTeamMembers}
              chartConfig={chartConfig}
            />
          </div>

          {/* 직원별 상세 목록 */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">직원별 상세 정보</h4>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Table
              data={selectedTeamMembers.map((member, index) => ({
                ...member,
                id: `${member.employeeName}-${index}`,
              }))}
              columns={[
                {
                  key: "employeeName",
                  label: "직원명",
                  sortable: true,
                },
                {
                  key: "contractCount",
                  label: "계약 건수",
                  sortable: true,
                  align: "center",
                  render: (value) => `${value}건`,
                },
                {
                  key: "finalAllowance",
                  label: "최종수당",
                  sortable: true,
                  align: "right",
                  render: (value) => (
                    <span className="font-bold text-gray-900">
                      {(value / 10000).toFixed(1)}만원
                    </span>
                  ),
                },
                {
                  key: "period",
                  label: "기간",
                  sortable: true,
                  align: "center",
                },
              ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
