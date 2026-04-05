import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeams,
  getTeam,
  createTeam,
  removeTeamMember,
  assignTeamMember,
  replaceTeamManager,
  setTeamLeader,
  deleteTeam,
  CreateTeamRequest,
  CreateTeamResponse,
  AssignTeamMemberRequest,
  ReplaceManagerRequest,
  ReplaceManagerResponse,
} from "../api";

export const teamKeys = {
  all: ["teams"] as const,
  lists: () => [...teamKeys.all, "list"] as const,
  list: () => [...teamKeys.lists()] as const,
  details: () => [...teamKeys.all, "detail"] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
};

// 팀 목록 조회 (캐싱)
export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: getTeams,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (cacheTime 대체)
  });
}

// 특정 팀 상세 조회
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => getTeam(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// 팀 생성 (Mutation)
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamRequest) => createTeam(data),
    onSuccess: () => {
      // 팀 생성 후 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// 팀 멤버 삭제 (Mutation)
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, accountId }: { teamId: string; accountId: string }) =>
      removeTeamMember({ teamId, accountId }),
    onSuccess: () => {
      // 팀 멤버 삭제 후 팀 상세 캐시 무효화 및 팀 목록 새로고침
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// 팀 멤버 배정 (Mutation)
export function useAssignTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignTeamMemberRequest) => assignTeamMember(data),
    onSuccess: () => {
      // 팀 멤버 배정 후 팀 상세 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      // 무소속 직원 목록도 새로고침
      queryClient.invalidateQueries({ queryKey: ["unassigned-employees"] });
    },
  });
}

// 팀장 임명 (Manual Set Leader)
export function useSetTeamLeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      accountId,
    }: {
      teamId: string;
      accountId: string;
    }) => {
      // api/teams.ts에 새로 추가할 setTeamLeader 호출
      return setTeamLeader(teamId, accountId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// 팀장 교체 (Mutation) - 기존 로직 유지용
export function useReplaceTeamManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: ReplaceManagerRequest;
    }) => replaceTeamManager(teamId, data),
    onSuccess: (response, variables) => {
      // 팀장 교체 후 해당 팀 상세 정보와 팀 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// 팀 삭제 (Mutation)
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      // 팀 삭제 후 팀 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
    },
  });
}
