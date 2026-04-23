import { api } from "@/shared/api/api";

export type ContractFileResponse = {
  id: number;
  contractId: number;
  url: string;
  filename: string | null;
  createdAt: string;
};

export async function getContractFiles(
  contractId: number
): Promise<ContractFileResponse[]> {
  try {
    const response = await api.get<{ data: ContractFileResponse[] }>(
      `/contracts/${contractId}/files`
    );
    const files = response.data.data || [];
    return files;
  } catch (error: any) {
    console.error(`[getContractFiles] 에러 발생:`, error);
    console.error(`[getContractFiles] 에러 응답:`, error?.response?.data);
    // 에러가 발생해도 빈 배열 반환 (에러로 인해 전체 조회가 실패하지 않도록)
    return [];
  }
}


