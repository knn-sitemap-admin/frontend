import { api, getOnce } from "@/shared/api/api";

// 프로필 정보 조회
export type ProfileResponse = {
  credentialId: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  profileCompleted: boolean;
  account: {
    id: string;
    name: string | null;
    phone: string | null;
    emergencyContact: string | null;
    addressLine: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
    photoUrl: string | null;
    positionRank: string;
    docUrlResidentRegistration: string | null;
    docUrlResidentAbstract: string | null;
    docUrlIdCard: string | null;
    docUrlFamilyRelation: string | null;
  } | null;
};

export async function getProfile(): Promise<ProfileResponse> {
  try {
    const response = await api.get<{
      message: string;
      data: ProfileResponse;
    }>("/dashboard/accounts/me/profile");

    // 백엔드 원본 응답 확인 (타입 캐스팅 없이)
    console.log("=== 프로필 조회 API 원본 응답 ===");
    console.log("전체 응답:", response);
    console.log("response.data:", response.data);
    console.log("response.data.data:", response.data.data);
    if (response.data.data?.account) {
      console.log(
        "response.data.data.account (전체):",
        response.data.data.account,
      );
      console.log(
        "account 객체의 모든 키:",
        Object.keys(response.data.data.account),
      );
      // 원본 응답 전체 확인 (JSON 문자열로)
      const accountJson = JSON.stringify(response.data.data.account, null, 2);
      console.log("account 객체 (JSON):", accountJson);

      console.log("서류 필드 값:", {
        docUrlResidentRegistration: (response.data.data.account as any)
          .docUrlResidentRegistration,
        docUrlResidentAbstract: (response.data.data.account as any)
          .docUrlResidentAbstract,
        docUrlIdCard: (response.data.data.account as any).docUrlIdCard,
        docUrlFamilyRelation: (response.data.data.account as any)
          .docUrlFamilyRelation,
      });

      // 모든 필드 값 확인
      const allFields = Object.entries(response.data.data.account).map(
        ([key, value]) => ({
          key,
          value,
          type: typeof value,
        }),
      );
      console.log("account 객체의 모든 필드:", allFields);
    }

    return response.data.data;
  } catch (error: any) {
    console.error("프로필 조회 실패:", error);
    throw error;
  }
}

// 프로필 정보 수정
export type UpdateMyProfileRequest = {
  name?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  addressLine?: string | null;
  salaryBankName?: string | null;
  salaryAccount?: string | null;
  profileUrl?: string | null;
  docUrlResidentRegistration?: string | null;
  docUrlResidentAbstract?: string | null;
  docUrlIdCard?: string | null;
  docUrlFamilyRelation?: string | null;
};

export type UpdateMyProfileResponse = {
  id: string;
  credentialId: string;
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryAccount: string;
  positionRank: string;
  isProfileCompleted: boolean;
};

export async function updateMyProfile(
  data: UpdateMyProfileRequest,
): Promise<UpdateMyProfileResponse> {
  try {
    const response = await api.post<{
      message: string;
      data: UpdateMyProfileResponse;
    }>("/dashboard/accounts/me/info", data);
    return response.data.data;
  } catch (error: any) {
    console.error("프로필 수정 실패:", error);
    throw error;
  }
}

// 새로운 통합 API: 사원 계정 생성 (계정 + 직원 정보 한 번에)
export type CreateTeamAssignRequest = {
  teamId: string;
  isPrimary?: boolean;
  joinedAt?: string; // YYYY-MM-DD
};

export type UpsertEmployeeInfoRequest = {
  name?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  addressLine?: string | null;
  salaryBankName?: string | null;
  salaryAccount?: string | null;
  profileUrl?: string | null;
  positionRank?:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  docUrlResidentRegistration?: string | null;
  docUrlResidentAbstract?: string | null;
  docUrlIdCard?: string | null;
  docUrlFamilyRelation?: string | null;
  team?: {
    teamId: string;
    isPrimary?: boolean;
    joinedAt?: string;
  };
  teamId?: string | null;
};

export type CreateEmployeeRequest = {
  email: string;
  password: string;
  isDisabled?: boolean;
  team?: CreateTeamAssignRequest;
  teamName?: string;
  info?: UpsertEmployeeInfoRequest;
};

export type CreateEmployeeResponse = {
  id: string; // credentialId
  email: string;
  role: "admin" | "manager" | "staff";
  is_disabled: boolean;
  accountId: string;
  positionRank:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | null;
};

// 첫 번째 API: 계정 생성 (credentials) - Deprecated: createEmployee 사용 권장
export type CreateAccountRequest = {
  email: string;
  password: string;
  role: "manager" | "staff";
  team?: {
    teamId: string;
    isPrimary?: boolean;
    joinedAt?: string;
  };
  isDisabled?: boolean;
};

export type CreateAccountResponse = {
  id: number;
  email: string;
  role: "manager" | "staff";
  isDisabled: boolean;
};

// 두 번째 API: 직원 정보 생성 - Deprecated: createEmployee 사용 권장
export type CreateEmployeeInfoRequest = {
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryBankName: string;
  salaryAccount: string;
  positionRank?:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  teamName?: string;
  profileUrl?: string;
  docUrlIdCard?: string;
  docUrlResidentRegistration?: string;
  docUrlResidentAbstract?: string;
  docUrlFamilyRelation?: string;
  team?: {
    teamId: string;
    isPrimary?: boolean;
    joinedAt?: string;
  };
  teamId?: string | null;
};

export type CreateEmployeeInfoResponse = {
  id: string;
  credentialId: string;
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryAccount: string;
  positionRank: string;
  isProfileCompleted: boolean;
  team?: {
    id: string;
    name: string;
    code: string;
  };
};

// 새로운 통합 API: 사원 계정 생성 (계정 + 직원 정보 한 번에)
export async function createEmployee(
  data: CreateEmployeeRequest,
): Promise<CreateEmployeeResponse> {
  try {
    console.log("사원 계정 생성 API 호출:", data);
    const response = await api.post<{
      message: string;
      data: CreateEmployeeResponse;
    }>("/dashboard/accounts/credentials", data);
    console.log("사원 계정 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("사원 계정 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지:", error?.response?.data?.messages);
    throw error;
  }
}

// 직원 정보 생성
export async function createEmployeeInfo(
  credentialId: string,
  data: CreateEmployeeInfoRequest,
): Promise<CreateEmployeeInfoResponse> {
  try {
    console.log("직원 정보 생성 API 호출:", { credentialId, data });
    const response = await api.post<{
      message: string;
      data: CreateEmployeeInfoResponse;
    }>(`/dashboard/accounts/employees/${credentialId}/info`, data);
    console.log("직원 정보 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("직원 정보 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지:", error?.response?.data?.messages);
    throw error;
  }
}

// 계정 상세 조회 (credentialId로) - 백엔드 기존 API 사용
export type CredentialDetailResponse = {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  account: {
    id: string;
    name: string | null;
    phone: string | null;
    emergencyContact: string | null;
    address: string | null;
    salaryBankName: string | null;
    salaryAccount: string | null;
    profileUrl: string | null;
    isProfileCompleted: boolean;
    isDeleted: boolean;
    deletedAt: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    role: "manager" | "staff" | null;
    isPrimary: boolean;
    joinedAt: string | null;
  } | null;
};

/** 상세 정보 조회 (credentialId) */
export async function getCredentialDetail(
  credentialId: string,
): Promise<CredentialDetailResponse> {
  try {
    const response = await getOnce<{
      message: string;
      data: CredentialDetailResponse;
    }>(`/dashboard/accounts/credentials/${credentialId}`);
    return response.data.data;
  } catch (error: any) {
    console.error("계정 상세 정보 조회 실패:", error);
    throw error;
  }
}

// 계정 목록 조회 (admin only) - 구버전 API (deprecated)
export type AccountListItem = {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  name: string | null;
  phone: string | null;
};

export async function getAccountsList(): Promise<AccountListItem[]> {
  try {
    const response = await api.get<{
      message: string;
      data: AccountListItem[];
    }>("/dashboard/accounts/credentials");
    return response.data.data;
  } catch (error: any) {
    console.error("계정 목록 조회 실패:", error);
    throw error;
  }
}

// 새로운 계정/사원 리스트 조회 API
export type PositionRank =
  | "ASSISTANT_MANAGER"
  | "MANAGER"
  | "DEPUTY_GENERAL"
  | "GENERAL_MANAGER"
  | "TEAM_LEADER"
  | "DIRECTOR"
  | "CEO";

export type EmployeeListQuery = {
  sort?: "name" | "rank";
  name?: string;
};

export type EmployeeListItem = {
  accountId: string;
  credentialId: string;
  role: "admin" | "manager" | "staff";
  profileUrl: string | null;
  name: string | null;
  positionRank: PositionRank | null;
  teamName: string; // "미소속" 포함
  phone: string | null;
  reservedPinDrafts: Array<{
    id: string;
    name: string | null;
    addressLine: string;
    reservedDate: string; // YYYY-MM-DD
  }>;
  favoritePins: Array<{
    id: string;
    name: string | null;
  }>;
  ongoingContracts: Array<{
    id: number;
    contractNo: string;
    customerName: string;
    contractDate: string; // YYYY-MM-DD
  }>;
};

export async function getEmployeesList(
  query?: EmployeeListQuery,
): Promise<EmployeeListItem[]> {
  try {
    const params = new URLSearchParams();
    if (query?.sort) {
      params.append("sort", query.sort);
    }
    if (query?.name) {
      params.append("name", query.name);
    }

    const queryString = params.toString();
    const url = `/dashboard/accounts/employees${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<{
      message: string;
      data: EmployeeListItem[];
    }>(url);
    return response.data.data;
  } catch (error: any) {
    console.error("사원 리스트 조회 실패:", error);
    throw error;
  }
}

// 직급 변경 API (팀장 직급일 때 팀 자동 생성)
export type PatchPositionRankRequest = {
  positionRank:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  teamName?: string; // TEAM_LEADER일 때만 사용
};

export async function patchPositionRank(
  credentialId: string,
  data: PatchPositionRankRequest,
): Promise<void> {
  try {
    await api.patch(
      `/dashboard/accounts/credentials/${credentialId}/position-rank`,
      data,
    );
  } catch (error: any) {
    console.error("직급 변경 API 호출 실패:", error);
    throw error;
  }
}

/** 
 * 아래의 함수들은 목록 조회 API 개선(credentialId, role 포함)으로 인해 더 이상 사용되지 않습니다.
 * 추후 완전히 필요 없을 때 삭제 가능합니다.
 */
// export async function getCredentialIdFromAccountId(...) { ... }
// export async function batchResolveAccountIdToCredentialAndRole(...) { ... }
