import { api } from "@/shared/api/api";

// 즐겨찾기 그룹 타입
export type FavoriteGroup = {
  id: string;
  title: string;
  sortOrder: number;
  itemCount?: number;
  items?: FavoriteItem[];
};

// 즐겨찾기 아이템 타입
export type FavoriteItem = {
  itemId: string;
  pinId: string;
  sortOrder: number;
  createdAt: string;
};

// 즐겨찾기 그룹 목록 조회
export async function getFavoriteGroups(
  includeItems: boolean = false
): Promise<FavoriteGroup[]> {
  try {
    const response = await api.get<{ message: string; data: FavoriteGroup[] }>(
      `/favorite/group?includeItems=${includeItems ? "1" : "0"}`
    );
    return response.data.data;
  } catch (error: any) {
    console.error("즐겨찾기 그룹 목록 조회 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 그룹 제목 수정
export type UpdateGroupTitleRequest = {
  title: string;
};

export async function updateGroupTitle(
  groupId: string,
  data: UpdateGroupTitleRequest
): Promise<FavoriteGroup> {
  try {
    const response = await api.patch<{ message: string; data: FavoriteGroup }>(
      `/favorite/group/${groupId}`,
      data
    );
    return response.data.data;
  } catch (error: any) {
    console.error("즐겨찾기 그룹 제목 수정 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 그룹 순서 변경
export type ReorderGroupsRequest = {
  orders: Array<{
    id: string;
    sortOrder: number;
  }>;
};

export async function reorderGroups(data: ReorderGroupsRequest): Promise<void> {
  try {
    const response = await api.patch<{ message: string }>(
      "/favorite/group/reorder",
      data
    );
  } catch (error: any) {
    console.error("즐겨찾기 그룹 순서 변경 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 그룹 삭제
export async function deleteFavoriteGroup(groupId: string): Promise<void> {
  try {
    const response = await api.delete<{ message: string }>(
      `/favorite/group/${groupId}`
    );
  } catch (error: any) {
    console.error("즐겨찾기 그룹 삭제 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 아이템 삭제
export async function deleteFavoriteItem(
  groupId: string,
  itemId: string
): Promise<void> {
  try {
    const response = await api.delete<{ message: string }>(
      `/favorite-groups/${groupId}/items/${itemId}`
    );
  } catch (error: any) {
    console.error("즐겨찾기 아이템 삭제 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 아이템 순서 변경
export type ReorderItemsRequest = {
  orders: Array<{
    itemId: string;
    sortOrder: number;
  }>;
};

export async function reorderItems(
  groupId: string,
  data: ReorderItemsRequest
): Promise<void> {
  try {
    const response = await api.patch<{ message: string }>(
      `/favorite-groups/${groupId}/items/reorder`,
      data
    );
  } catch (error: any) {
    console.error("즐겨찾기 아이템 순서 변경 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 즐겨찾기 아이템 추가/수정
export type UpsertFavoriteItemRequest = {
  groupId?: string; // 기존 그룹에 추가할 경우
  title?: string; // 새 그룹 만들 때만
  pinId: string;
  sortOrder?: number; // 특정 위치에 끼워넣기
};

export type UpsertFavoriteItemResponse = {
  group: {
    id: string;
    title: string;
    sortOrder: number;
  };
  item: {
    id: string;
    pinId: string;
    sortOrder: number;
  };
  groupItemCount: number;
};

export async function upsertFavoriteItem(
  data: UpsertFavoriteItemRequest
): Promise<UpsertFavoriteItemResponse> {
  try {
    const response = await api.post<{
      message: string;
      data: UpsertFavoriteItemResponse;
    }>("/favorite/upsert-item", data);
    return response.data.data;
  } catch (error: any) {
    console.error("즐겨찾기 아이템 추가/수정 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지:", error?.response?.data?.messages);
    throw error;
  }
}
