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
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface TeamStat {
  team: string;
  totalAllowance: number;
  totalContracts: number;
  memberCount: number;
  avgAllowance: number;
}

interface TeamAllowanceBarChartProps {
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
}

export function TeamAllowanceBarChart({
  teamStats,
  chartConfig,
}: TeamAllowanceBarChartProps) {
  // 상위 3개 팀 정렬
  const top3Teams = [...teamStats]
    .sort((a, b) => b.totalAllowance - a.totalAllowance)
    .slice(0, 3);

  const formatCurrency = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억원`;
    } else if (value >= 10000) {
      return `${Math.round(value / 10000).toLocaleString()}만원`;
    }
    return `${value.toLocaleString()}원`;
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">
          팀별 최종수당 비교
        </CardTitle>
        <p className="text-sm text-muted-foreground">각 팀의 총 최종수당</p>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="flex gap-4">
          {/* 그래프 영역 (80%) */}
          <div className="flex-1 overflow-x-auto">
            <ChartContainer 
              config={chartConfig} 
              className="h-[300px] min-w-[600px]"
              style={{ width: `${Math.max(600, teamStats.length * 80)}px` }}
            >
            <BarChart
              data={teamStats}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              width={Math.max(600, teamStats.length * 80)}
              height={300}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="team"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  `${(value / 10000000).toFixed(0)}천`
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="totalAllowance"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
              <LabelList
                dataKey="totalAllowance"
                position="top"
                offset={10}
                formatter={(value: number) =>
                  `${(Number(value) / 10000).toFixed(1)}만원`
                }
                style={{
                  fontSize: "12px",
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
          </div>

          {/* 상위 3개 팀 리스트 (20%) - 데스크톱에서만 표시 */}
          <div className="hidden lg:block w-[200px] flex-shrink-0 border-l border-gray-200 pl-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">상위 3개 팀</h3>
            <div className="space-y-3">
              {top3Teams.map((team, index) => (
                <div key={team.team} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 w-5">
                      {index + 1}위
                    </span>
                    <span className="text-sm font-semibold text-gray-900 flex-1">
                      {team.team}
                    </span>
                  </div>
                  <div className="pl-7">
                    <p className="text-xs font-bold text-blue-600">
                      {formatCurrency(team.totalAllowance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {team.totalContracts}건
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
