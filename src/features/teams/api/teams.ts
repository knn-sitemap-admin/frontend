import { api, getOnce } from "@/shared/api/api";

export type CreateTeamRequest = {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateTeamResponse = {
  id: number | string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  teamLeaderName?: string | null;
  memberCount: number;
};

// 팀 생성 API
export async function createTeam(
  data: CreateTeamRequest
): Promise<CreateTeamResponse> {
  try {
    const requestData = {
      ...data,
      code: data.code || data.name.replace(/\s+/g, "").toLowerCase(),
      isActive: data.isActive ?? true,
    };

    const response = await api.post<{
      message: string;
      data: CreateTeamResponse;
    }>("/dashboard/accounts/teams", requestData);

    return response.data.data;
  } catch (error: any) {
    console.error("팀 생성 API 호출 실패:", error);
    throw error;
  }
}

// DB에서 팀 목록 조회 API
export async function getTeams(): Promise<CreateTeamResponse[]> {
  try {
    const response = await getOnce<{
      message: string;
      data: CreateTeamResponse[];
    }>("/dashboard/accounts/teams");

    return response.data.data;
  } catch (error: any) {
    console.error("팀 목록 조회 API 호출 실패:", error);
    throw error;
  }
}

export type TeamMemberDetail = {
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
};

export type TeamDetailResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  members: TeamMemberDetail[];
};

// DB에서 특정 팀 상세 조회 API
export async function getTeam(id: string): Promise<TeamDetailResponse> {
  try {
    const response = await api.get<{
      message: string;
      data: TeamDetailResponse;
    }>(`/dashboard/accounts/teams/${id}`);

    return response.data.data;
  } catch (error: any) {
    console.error("팀 상세 조회 API 호출 실패:", error);
    throw error;
  }
}

// 팀 멤버 삭제 API (개편: teamId와 accountId 조합 사용)
export async function removeTeamMember({ teamId, accountId }: { teamId: string, accountId: string }): Promise<void> {
  try {
    // 백엔드 새 엔드포인트: DELETE /dashboard/accounts/teams/:id/members/:accountId
    await api.delete(`/dashboard/accounts/teams/${teamId}/members/${accountId}`);
  } catch (error: any) {
    console.error("팀 멤버 삭제 API 호출 실패:", error);
    throw error;
  }
}

export type AssignTeamMemberRequest = {
  teamId: string;
  accountId: string;
  isPrimary?: boolean;
  joinedAt?: string;
};

// 팀 멤버 배정 API (개편: 팀 전속 엔드포인트 사용)
export async function assignTeamMember(
  data: AssignTeamMemberRequest
): Promise<void> {
  try {
    // 백엔드 새 엔드포인트: POST /dashboard/accounts/teams/:id/members
    await api.post(`/dashboard/accounts/teams/${data.teamId}/members`, {
      accountId: data.accountId,
      role: 'staff' // 수동 추가는 기본이 사원으로
    });
  } catch (error: any) {
    console.error("팀 멤버 배정 API 호출 실패:", error);
    throw error;
  }
}

export type ReplaceManagerRequest = {
  newCredentialId: string;
};

export type ReplaceManagerResponse = {
  teamId: string;
  prevManager: {
    memberId: string;
    newRole?: string;
    unchanged?: boolean;
  } | null;
  newManager: {
    memberId: string;
    newRole: string;
    unchanged?: boolean;
  };
};

// 팀장 임명 API (Manual Set Leader)
export async function setTeamLeader(
  teamId: string,
  accountId: string
): Promise<void> {
  try {
    await api.patch(`/dashboard/accounts/teams/${teamId}/leader`, { accountId });
  } catch (error: any) {
    console.error("팀장 임명 API 호출 실패:", error);
    throw error;
  }
}

// 팀장 교체 API
export async function replaceTeamManager(
  teamId: string,
  data: ReplaceManagerRequest
): Promise<ReplaceManagerResponse> {
  try {
    const response = await api.post<{
      message: string;
      data: ReplaceManagerResponse;
    }>(`/dashboard/accounts/teams/${teamId}/replace-manager`, data);
    return response.data.data;
  } catch (error: any) {
    console.error("팀장 교체 API 호출 실패:", error);
    throw error;
  }
}

// 팀 삭제 API
export async function deleteTeam(teamId: string): Promise<{ id: string }> {
  try {
    const response = await api.delete<{
      success: boolean;
      path: string;
      message: string;
      data: { id: string };
    }>(`/dashboard/accounts/teams/${teamId}`);
    return response.data.data;
  } catch (error: any) {
    console.error("팀 삭제 API 호출 실패:", error);
    throw error;
  }
}
