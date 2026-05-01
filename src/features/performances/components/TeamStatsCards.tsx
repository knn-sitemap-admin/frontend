import { TeamStat } from "../utils/performanceUtils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";

interface TeamStatsCardsProps {
  teamStats: TeamStat[];
  selectedTeamDetail: string | null;
  onTeamSelect: (team: string | null) => void;
}

export function TeamStatsCards({
  teamStats,
  selectedTeamDetail,
  onTeamSelect,
}: TeamStatsCardsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">팀별 실적 현황</h2>
      
      {/* 팀별 카드 그리드 - 반응형 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamStats.map((stat) => {
          return (
            <Card
              key={stat.team}
              className={`cursor-pointer transition-shadow ${
                selectedTeamDetail === stat.team ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() =>
                onTeamSelect(selectedTeamDetail === stat.team ? null : stat.team)
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">{stat.team}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">총매출:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(stat.totalGrossSales)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">순수익:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(stat.totalNetProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">계약건수:</span>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {stat.totalContracts.toLocaleString()}건
                    </div>
                    <div className="text-[10px] text-gray-500 space-x-1">
                      <span className="text-emerald-600">완료 {stat.completedContracts}</span>
                      <span className="text-red-500">부결 {stat.rejectedContracts}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t text-xs text-gray-500">
                  <span>인원: {stat.memberCount}명</span>
                  <span>평균수당: {formatCurrency(Math.round(stat.avgAllowance))}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
