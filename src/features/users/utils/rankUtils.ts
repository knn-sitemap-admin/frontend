export const getPositionRankLabel = (rank?: string) => {
  const rankMap: Record<string, string> = {
    ASSISTANT_MANAGER: "대리",
    MANAGER: "과장",
    DEPUTY_GENERAL: "차장",
    GENERAL_MANAGER: "부장",
    TEAM_LEADER: "팀장",
    DIRECTOR: "실장",
    CEO: "대표이사",
  };
  return rank ? rankMap[rank] || rank : "";
};
