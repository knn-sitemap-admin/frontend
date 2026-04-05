import { api } from "@/shared/api/api";
import type { AxiosRequestConfig } from "axios";
import type {
  IdLike,
  PinPhoto,
  CreatePinPhotoDto,
} from "@/shared/api/photos/types";
import { assertArray, toKey } from "./utils";

/* =========================
 * /photos
 * ========================= */

/** GET /photos/:groupId */
export async function listGroupPhotos(
  groupId: IdLike,
  config?: AxiosRequestConfig
): Promise<PinPhoto[]> {
  const { data } = await api.get<{ data?: PinPhoto[]; message?: string }>(
    `/photos/${encodeURIComponent(String(toKey(groupId)))}`,
    { withCredentials: true, ...(config ?? {}) }
  );
  return assertArray<PinPhoto>(
    data?.data,
    data?.message || "사진 목록 조회 실패"
  );
}

/* In-flight dedupe for create photos in group */
type InflightPhotoKey = string;
type InflightPhotoEntry = Promise<PinPhoto[]>;
const inflightCreatePhotos = new Map<InflightPhotoKey, InflightPhotoEntry>();
const createKey = (groupId: IdLike, body: CreatePinPhotoDto): string => {
  const gid = String(groupId);
  const urlsSig = Array.isArray(body.urls) ? body.urls.join(",") : "";
  const soSig = Array.isArray(body.sortOrders) ? body.sortOrders.join(",") : "";
  const cover = body.isCover ? "1" : "0";
  return `${gid}::${urlsSig}::${soSig}::${cover}`;
};

/** POST /photos/:groupId */
export async function createPhotosInGroup(
  groupId: IdLike,
  body: CreatePinPhotoDto,
  config?: AxiosRequestConfig
): Promise<PinPhoto[]> {
  if (!body?.urls?.length)
    throw new Error("사진 등록 실패: urls가 비어 있습니다.");

  const key = createKey(groupId, body);
  const existed = inflightCreatePhotos.get(key);
  if (existed) return existed;

  const work = (async () => {
    const { data } = await api.post<{ data?: PinPhoto[]; message?: string }>(
      `/photos/${encodeURIComponent(String(toKey(groupId)))}`,
      body,
      { withCredentials: true, ...(config ?? {}) }
    );
    return assertArray<PinPhoto>(data?.data, data?.message || "사진 등록 실패");
  })();

  inflightCreatePhotos.set(key, work);
  try {
    return await work;
  } finally {
    inflightCreatePhotos.delete(key);
  }
}

/** (기존) PATCH /photos — 다건 수정(커버/정렬/이동) */
export async function updatePhotos(
  body: {
    photoIds: IdLike[];
    isCover?: boolean;
    sortOrder?: number;
    moveGroupId?: IdLike | null;
  },
  config?: AxiosRequestConfig
): Promise<PinPhoto[]> {
  const normalized = {
    ...body,
    moveGroupId:
      body.moveGroupId === null || body.moveGroupId === undefined
        ? body.moveGroupId ?? null
        : toKey(body.moveGroupId),
  };
  const { data } = await api.patch<{ data?: PinPhoto[]; message?: string }>(
    `/photos`,
    normalized,
    { withCredentials: true, ...(config ?? {}) }
  );
  return assertArray<PinPhoto>(data?.data, data?.message || "사진 수정 실패");
}

/** ✅ PATCH /photos/:id  (단건 사진 수정 — groupId 절대 전송 X) */
export async function patchPhotoById(
  photoId: IdLike,
  dto: Partial<{
    caption: string | null;
    sortOrder: number | null;
    isCover: boolean | null;
    name?: string | null;
  }>,
  config?: AxiosRequestConfig
): Promise<PinPhoto> {
  const payload: any = {};

  if ("caption" in dto) payload.caption = dto.caption;
  if ("name" in dto) payload.name = dto.name;
  if ("isCover" in dto) payload.isCover = dto.isCover;
  if ("sortOrder" in dto) payload.sortOrder = dto.sortOrder;

  const { data } = await api.patch<{ data?: PinPhoto; message?: string }>(
    `/photos/${encodeURIComponent(String(toKey(photoId)))}`,
    payload,
    { withCredentials: true, ...(config ?? {}) }
  );

  if (!data?.data) throw new Error(data?.message || "사진 수정 실패");
  return data.data;
}

/** DELETE /photos */
export async function deletePhotos(
  photoIds: IdLike[],
  config?: AxiosRequestConfig
): Promise<{ affected: number }> {
  const { data } = await api.delete<{
    data?: { affected: number };
    message?: string;
  }>(`/photos`, {
    data: { photoIds }, // axios delete 본문은 data 키
    withCredentials: true,
    ...(config ?? {}),
  });
  const result = data?.data;
  if (!result || typeof result.affected !== "number") {
    throw new Error(data?.message || "사진 삭제 실패");
  }
  return result;
}

/* =========================
 * 벌크 헬퍼 (사진 배치 수정)
 * ========================= */

export async function batchPatchPhotos(
  changes: Array<{
    id: IdLike;
    dto: Partial<{
      caption: string | null;
      groupId: IdLike | null;
      sortOrder: number | null;
      isCover: boolean | null;
      name?: string | null;
    }>;
  }>
): Promise<PinPhoto[]> {
  if (!changes?.length) return [];
  
  // ✅ 개별 호출(Promise.all) 대신, 백엔드의 진짜 일괄 수정 엔드포인트(/photos/batch) 호출
  const { data } = await api.patch<{ data?: PinPhoto[]; message?: string }>(
    `/photos/batch`,
    changes,
    { withCredentials: true }
  );
  
  return assertArray<PinPhoto>(
    data?.data,
    data?.message || "사진 일괄 수정 실패"
  );
}
