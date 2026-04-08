"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/api";
import UserSettingsPage from "@/features/users/pages/UserSettingsPage";

const MyTeamPage = () => {
  // 현재 로그인한 계정의 프로필과 팀 정보 가져오기
  const {
    data: myTeamData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      // 내 프로필 정보 가져오기
      const profileResponse = await api.get<{
        message: string;
        data: {
          account: {
            id: string;
            name: string | null;
            phone: string | null;
          } | null;
        };
      }>("/dashboard/accounts/me/profile");

      if (!profileResponse.data.data?.account?.id) {
        return null;
      }

      const accountId = String(profileResponse.data.data.account.id);

      // 모든 팀 목록 가져오기
      let teamsResponse;
      try {
        teamsResponse = await api.get<{
          message: string;
          data: Array<{ id: string; name: string; code: string }>;
        }>("/dashboard/accounts/teams");
      } catch (error: any) {
        console.error("팀 목록 조회 실패:", error);
        if (error?.response?.status === 403) {
          console.error("권한이 없습니다. ADMIN 권한이 필요합니다.");
        }
        return null;
      }

      if (teamsResponse.data.data.length === 0) {
        return null;
      }

      // 각 팀의 상세 조회를 통해 내가 속한 팀 찾기
      // 백엔드의 teams 상세조회 API 사용
      for (const team of teamsResponse.data.data) {
        try {
          const teamDetailResponse = await api.get<{
            message: string;
            data: {
              id: string;
              name: string;
              code: string;
              description: string | null;
              isActive: boolean;
              members: Array<{
                teamMemberId: string;
                accountId: string;
                credentialId: string;
                name: string | null;
                phone: string | null;
                positionRank: string | null;
                photoUrl: string | null;
                teamRole: "manager" | "staff";
                isPrimary: boolean;
                joinedAt: string | null;
              }>;
            };
          }>(`/dashboard/accounts/teams/${team.id}`);


          // 팀 멤버 목록에서 내 accountId가 있는지 확인 (타입 안전하게 비교)
          const isMyTeam = teamDetailResponse.data.data.members.some(
            (member) => String(member.accountId) === accountId
          );


          // 내가 속한 팀을 찾으면 해당 팀 상세 정보 반환
          if (isMyTeam) {
            return teamDetailResponse.data.data;
          }
        } catch (error: any) {
          // 팀 상세 조회 실패 시 다음 팀으로 진행
          console.error(`팀 ${team.id} (${team.name}) 조회 실패:`, error);
          if (error?.response?.status === 403) {
            console.error(`권한이 없어 팀 ${team.name}을 조회할 수 없습니다.`);
          }
          continue;
        }
      }

      // 내가 속한 팀을 찾지 못함
      return null;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              팀 정보를 불러오는 중...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!myTeamData) {
    // 403 에러인 경우 권한 문제 안내
    const is403Error = error && (error as any)?.response?.status === 403;

    return (
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        <div className="text-center py-12">
          {is403Error ? (
            <>
              <p className="text-lg font-semibold mb-2 text-red-600">
                권한이 없습니다
              </p>
              <p className="text-muted-foreground mb-4">
                팀 정보를 조회할 수 없습니다.
              </p>
              <p className="text-sm text-gray-600">
                현재 백엔드의 팀 조회 API(`/dashboard/accounts/teams`)는{" "}
                <strong>ADMIN</strong> 권한만 허용합니다.
                <br />
                일반 사용자(MANAGER, STAFF)가 자신의 팀을 조회하려면 백엔드에서
                권한 설정을 변경해야 합니다.
                <br />
                <br />
                백엔드 수정 사항:
                <br />- <code>TeamController</code>의{" "}
                <code>@Roles(SystemRole.ADMIN)</code>를
                <br />-{" "}
                <code>
                  @Roles(SystemRole.ADMIN, SystemRole.MANAGER, SystemRole.STAFF)
                </code>
                로 변경
                <br />
                또는
                <br />- <code>GET /dashboard/accounts/me/team</code> 같은 전용
                API 추가
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold mb-2">
                팀에 소속되지 않았습니다
              </p>
              <p className="text-muted-foreground">
                관리자에게 문의하여 팀에 배정받아주세요.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {myTeamData.name} 관리
          </h1>
          <p className="text-sm text-muted-foreground pt-2">
            {myTeamData.name} 팀원 계정을 조회하고 관리합니다.
          </p>
        </div>
      </div>

      <div className="p-1 pb-8">
        <UserSettingsPage teamId={myTeamData.id} members={myTeamData.members} />
      </div>
    </div>
  );
};

export default MyTeamPage;

