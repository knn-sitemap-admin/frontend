import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PerformanceData {
  employeeName: string;
  team: string;
  contractCount: number;
  finalAllowance: number;
  period: string;
}

interface EmployeeChartsProps {
  selectedTeamMembers: PerformanceData[];
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
}

export function EmployeeAllowanceChart({
  selectedTeamMembers,
  chartConfig,
}: EmployeeChartsProps) {
  const chartWidth = Math.max(400, selectedTeamMembers.length * 60);
  const needsRotation = selectedTeamMembers.length > 5;

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">직원별 최종수당</h4>
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <ChartContainer 
          config={chartConfig} 
          className="h-[250px] min-w-[400px]"
          style={{ width: `${chartWidth}px` }}
        >
        <BarChart
          data={selectedTeamMembers}
          margin={{ 
            top: 20, 
            right: 30, 
            left: 20, 
            bottom: needsRotation ? 60 : 5 
          }}
          width={chartWidth}
          height={250}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            vertical={false}
          />
          <XAxis
            dataKey="employeeName"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -45 : 0}
            textAnchor={needsRotation ? "end" : "middle"}
            height={needsRotation ? 60 : 30}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${(value / 10000).toFixed(0)}만`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="finalAllowance"
            fill="hsl(var(--primary))"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
          >
            <LabelList
              dataKey="finalAllowance"
              position="top"
              offset={8}
              formatter={(value: number) =>
                `${(Number(value) / 10000).toFixed(1)}만원`
              }
              style={{
                fontSize: "10px",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      </div>
    </div>
  );
}

export function EmployeeContractChart({
  selectedTeamMembers,
  chartConfig,
}: EmployeeChartsProps) {
  const chartWidth = Math.max(400, selectedTeamMembers.length * 60);
  const needsRotation = selectedTeamMembers.length > 5;

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">직원별 계약 건수</h4>
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <ChartContainer 
          config={chartConfig} 
          className="h-[250px] min-w-[400px]"
          style={{ width: `${chartWidth}px` }}
        >
        <BarChart
          data={selectedTeamMembers}
          margin={{ 
            top: 20, 
            right: 30, 
            left: 20, 
            bottom: needsRotation ? 60 : 5 
          }}
          width={chartWidth}
          height={250}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            vertical={false}
          />
          <XAxis
            dataKey="employeeName"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -45 : 0}
            textAnchor={needsRotation ? "end" : "middle"}
            height={needsRotation ? 60 : 30}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="contractCount"
            fill="hsl(var(--secondary))"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
          >
            <LabelList
              dataKey="contractCount"
              position="top"
              offset={8}
              formatter={(value: number) => `${value}건`}
              style={{
                fontSize: "10px",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      </div>
    </div>
  );
}
