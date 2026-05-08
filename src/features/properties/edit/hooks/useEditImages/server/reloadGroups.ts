import type { Dispatch, SetStateAction } from "react";
import {
  listGroupPhotos,
  deletePhotos as apiDeletePhotos,
} from "@/shared/api/photos/photos";
import { listPhotoGroupsByPin as apiListPhotoGroupsByPin } from "@/shared/api/photos/photoGroups";
import type {
  IdLike,
  PinPhoto,
  PinPhotoGroup,
} from "@/shared/api/photos/types";
import type { ImageItem } from "@/features/properties/types/media";
import { dropEmptyCards } from "../utils/dropEmptyCards";
import type { PendingGroupChange } from "../queue/groupQueue";
import type { PendingPhotoChange } from "../queue/photoQueue";

type ReloadDeps = {
  pinId: IdLike;
  setGroups: Dispatch<SetStateAction<PinPhotoGroup[] | null>>;
  setPhotosByGroup: Dispatch<SetStateAction<Record<string, PinPhoto[]>>>;
  setMediaLoading: Dispatch<SetStateAction<boolean>>;
  setMediaError: Dispatch<SetStateAction<string | null>>;
  setImageFolders: Dispatch<SetStateAction<ImageItem[][]>>;
  setVerticalImages: Dispatch<SetStateAction<ImageItem[]>>;
  groupsRef: { current: PinPhotoGroup[] | null };
  hasServerHydratedRef: { current: boolean };
  pendingGroupMap: { current: Map<string, PendingGroupChange> };
  pendingPhotoMap: { current: Map<string, PendingPhotoChange> };
  pendingDeleteSet: { current: Set<string> };
  reloadMap: Map<string, Promise<void>>;
};

export async function reloadGroupsImpl({
  pinId,
  setGroups,
  setPhotosByGroup,
  setMediaLoading,
  setMediaError,
  setImageFolders,
  setVerticalImages,
  groupsRef,
  hasServerHydratedRef,
  pendingGroupMap,
  pendingPhotoMap,
  pendingDeleteSet,
  reloadMap,
}: ReloadDeps) {
  const key = String(pinId);
  const existing = reloadMap.get(key);
  if (existing) return existing;

  const work = (async () => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const list = await apiListPhotoGroupsByPin(pinId);
      const mapped: Record<string, PinPhoto[]> = {};

      await Promise.all(
        (list ?? []).map(async (g) => {
          const ps = await listGroupPhotos(g.id);
          mapped[String(g.id)] = ps ?? [];
        })
      );

      setGroups(list ?? []);
      groupsRef.current = list ?? [];
      setPhotosByGroup(mapped);

      hasServerHydratedRef.current = true;

      const isVerticalGroup = (g: PinPhotoGroup) => g.isDocument === true;

      const horizGroups = (list ?? []).filter((g) => !isVerticalGroup(g));
      const vertGroups = (list ?? []).filter(isVerticalGroup);

      const folders: ImageItem[][] = horizGroups
        .slice()
        .sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            String(a.title ?? "").localeCompare(String(b.title ?? ""))
        )
        .map((g) => {
          const arr = (mapped[String(g.id)] ?? [])
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((p) => {
              const caption =
                (p as any).caption ?? (p as any).title ?? (p as any).name ?? "";
              return {
                id: p.id as any,
                url: p.url,
                caption,
                name: (p as any).name ?? "",
                groupId: (p as any).groupId ?? g.id,
              } as ImageItem;
            });
          (arr as any).groupId = g.id;
          return arr;
        });

      const cleaned = dropEmptyCards(folders);

      const verticalFlat: ImageItem[] = vertGroups
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .flatMap((g) =>
          (mapped[String(g.id)] ?? [])
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((p) => {
              const caption =
                (p as any).caption ?? (p as any).title ?? (p as any).name ?? "";
              return {
                id: p.id as any,
                url: p.url,
                caption,
                name: (p as any).name ?? "",
              } as ImageItem;
            })
        );

      const hasPendingLocal =
        pendingGroupMap.current.size > 0 ||
        pendingPhotoMap.current.size > 0 ||
        pendingDeleteSet.current.size > 0;

      if (!hasPendingLocal) {
        setImageFolders(cleaned.length ? cleaned : [[]]);
        setVerticalImages(verticalFlat);
      }
    } catch (e: any) {
      setMediaError(e?.message || "사진 그룹 로딩 실패");
    } finally {
      setMediaLoading(false);
      reloadMap.delete(key);
    }
  })();

  reloadMap.set(key, work);
  return work;
}
