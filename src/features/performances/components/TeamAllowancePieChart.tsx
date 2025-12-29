import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PIE_COLORS } from "../utils/chartConfig";

interface TeamStat {
  team: string;
  totalAllowance: number;
  totalContracts: number;
  memberCount: number;
  avgAllowance: number;
}

interface TeamAllowancePieChartProps {
  teamStats: TeamStat[];
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
  pieColors: string[];
}

export function TeamAllowancePieChart({
  teamStats,
  chartConfig,
  pieColors,
}: TeamAllowancePieChartProps) {
  // 총합 계산
  const total = teamStats.reduce((sum, stat) => sum + stat.totalAllowance, 0);
  
  // 비율과 색상 추가
  const dataWithPercentage = teamStats.map((stat, index) => ({
    ...stat,
    percentage: total > 0 ? ((stat.totalAllowance / total) * 100).toFixed(1) : 0,
    color: pieColors[index % pieColors.length],
  }));

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">
          팀별 최종수당 비율
        </CardTitle>
        <p className="text-sm text-muted-foreground">각 팀의 수당 비중</p>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="overflow-x-auto">
          <ChartContainer 
            config={chartConfig} 
            className="h-[400px] min-w-[400px]"
            style={{ width: `${Math.max(400, teamStats.length * 120)}px` }}
          >
            <BarChart
              data={dataWithPercentage}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
              width={Math.max(400, teamStats.length * 120)}
              height={400}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="team"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string, props: any) => [
                  `${props.payload.percentage}% (${(value / 10000).toFixed(1)}만원)`,
                  "비율",
                ]}
              />
              <Bar
                dataKey="percentage"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                maxBarSize={60}
              >
                {dataWithPercentage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="percentage"
                  position="right"
                  offset={10}
                  formatter={(value: number) => `${value}%`}
                  style={{
                    fontSize: "12px",
                    fill: "hsl(var(--foreground))",
                    fontWeight: 500,
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
