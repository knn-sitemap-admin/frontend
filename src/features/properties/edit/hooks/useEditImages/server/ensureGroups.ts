import type { Dispatch, SetStateAction } from "react";
import type { IdLike, PinPhotoGroup } from "@/shared/api/photos/types";
import { createPhotoGroup as apiCreatePhotoGroup } from "@/shared/api/photos/photoGroups";
import type { PendingGroupChange } from "../queue/groupQueue";
import {
  getQueuedFolderTitle,
  consumeQueuedFolderTitle,
  getQueuedVerticalTitle,
  consumeQueuedVerticalTitle,
} from "../queue/groupQueue";

type EnsureDeps = {
  groupsRef: { current: PinPhotoGroup[] | null };
  setGroups: Dispatch<SetStateAction<PinPhotoGroup[] | null>>;
  pendingGroupMap: { current: Map<string, PendingGroupChange> };
};

const getHorizGroupsSorted = (list: PinPhotoGroup[]) =>
  list
    .filter((g) => g.isDocument !== true)
    .slice()
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.title ?? "").localeCompare(String(b.title ?? ""))
    );

export async function ensureFolderGroupImpl(
  deps: EnsureDeps,
  pinId: IdLike,
  folderIdx: number,
  preferredTitle?: string | null,
  folderGroupId?: string | number | null,
  isNewFolder?: boolean
): Promise<PinPhotoGroup> {
  const { groupsRef, setGroups, pendingGroupMap } = deps;
  const list = (groupsRef.current ?? []) as PinPhotoGroup[];

  if (!isNewFolder) {
    if (folderGroupId != null) {
      const existing = list.find((g) => String(g.id) === String(folderGroupId));
      if (existing) return existing;
    }

    const horiz = getHorizGroupsSorted(list);
    const existing = horiz[folderIdx];
    if (existing) return existing;
  }

  const fallback = `사진 폴더 ${folderIdx + 1}`;

  const queued = getQueuedFolderTitle(pendingGroupMap.current, folderIdx);
  const fromPreferred =
    (preferredTitle ?? "").toString().trim().length > 0
      ? (preferredTitle as string).trim()
      : null;

  const title = queued ?? fromPreferred ?? fallback;
  const sortOrder = folderIdx;

  const group = await apiCreatePhotoGroup({
    pinId,
    title,
    sortOrder,
  });

  consumeQueuedFolderTitle(pendingGroupMap.current, folderIdx);

  setGroups((prev) => {
    const base = prev ?? [];
    const next = [...base, group];
    deps.groupsRef.current = next;
    return next;
  });

  return group;
}

export async function ensureVerticalGroupImpl(
  deps: EnsureDeps,
  pinId: IdLike,
  preferredTitle?: string | null
): Promise<PinPhotoGroup> {
  const { groupsRef, setGroups, pendingGroupMap } = deps;
  const list = (groupsRef.current ?? []) as PinPhotoGroup[];
  const vertical = list.find((g) => g.isDocument === true);
  if (vertical) return vertical;

  const fallback = "파일 폴더";

  const queued = getQueuedVerticalTitle(pendingGroupMap.current);
  const fromPreferred =
    (preferredTitle ?? "").toString().trim().length > 0
      ? (preferredTitle as string).trim()
      : null;

  const title = queued ?? fromPreferred ?? fallback;

  const group = await apiCreatePhotoGroup({
    pinId,
    title,
    sortOrder: 9999,
    isDocument: true,
  });

  consumeQueuedVerticalTitle(pendingGroupMap.current);

  setGroups((prev) => {
    const base = prev ?? [];
    const next = [...base, group];
    deps.groupsRef.current = next;
    return next;
  });

  return group;
}
