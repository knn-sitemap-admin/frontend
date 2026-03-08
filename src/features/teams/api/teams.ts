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

    console.log("DB 팀 목록 API 응답:", response.data);
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

// 팀 멤버 삭제 API
export async function removeTeamMember(memberId: string): Promise<void> {
  try {
    await api.delete(`/dashboard/accounts/team-members/${memberId}`);
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

// 팀 멤버 배정 API
export async function assignTeamMember(
  data: AssignTeamMemberRequest
): Promise<void> {
  try {
    await api.post(`/dashboard/accounts/team-members`, data);
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
