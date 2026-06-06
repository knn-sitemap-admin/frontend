"use client";

import type { ImageItem } from "@/features/properties/types/media";
import LightboxModal from "./components/LightboxModal";
import MiniCarousel from "@/components/molecules/MiniCarousel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CaptionSlot from "./components/CaptionSlot";
import { AnyImg, DisplayImagesSectionProps } from "./types";
import { useMeRole } from "@/features/auth/hooks/useMeRole";
import { API_BASE } from "@/shared/api/api";
import { Button } from "@/components/atoms/Button/Button";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";

/* ───────── 로컬 전용 뷰 타입 ───────── */
type DisplayImageItem = ImageItem & {
  caption?: string;
  name?: string;
  dataUrl?: string;
};

/* ───────── 유틸 ───────── */
const isOkUrl = (u: string) => /^https?:|^data:|^blob:/.test(u);
const pickStr = (...xs: any[]) =>
  xs.find((x) => typeof x === "string" && x.trim())?.trim() ?? "";

/** AnyImg → DisplayImageItem 하나로 정규화 */
function normOne(it: AnyImg): DisplayImageItem | null {
  if (!it) return null;

  if (typeof it === "string") {
    const s = it.startsWith("url:") ? it.slice(4) : it;
    return isOkUrl(s)
      ? ({ url: s, name: "", caption: "" } as DisplayImageItem)
      : null;
  }

  const raw = it as any;
  const url = pickStr(
    raw?.url,
    raw?.dataUrl,
    raw?.idbKey?.startsWith?.("url:") ? raw.idbKey.slice(4) : ""
  );
  if (!isOkUrl(url)) return null;

  const name = pickStr(raw?.name);
  const caption = pickStr(raw?.caption, raw?.title);

  const base: DisplayImageItem = {
    ...(raw as ImageItem),
    url,
    name,
    caption,
  };

  if (typeof raw?.dataUrl === "string") {
    base.dataUrl = raw.dataUrl;
  }

  return base;
}

function normList(list?: Array<AnyImg>): DisplayImageItem[] {
  if (!Array.isArray(list)) return [];
  return list.map(normOne).filter(Boolean) as DisplayImageItem[];
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/* ───────── 입력 정규화 (제목 유지) ───────── */
type Group = { items: DisplayImageItem[]; title?: string | null };

function normalizeCardGroups(cards?: unknown, images?: unknown): Group[] {
  const out: Group[] = [];

  if (Array.isArray(cards)) {
    // [{ title, images }] 형태
    if (
      cards.length > 0 &&
      typeof cards[0] === "object" &&
      !Array.isArray(cards[0])
    ) {
      (cards as any[]).forEach((c) => {
        const items = normList(c?.images);
        const title =
          typeof c?.title === "string" && c.title.trim().length > 0
            ? c.title
            : null;
        out.push({ items, title });
      });
    } else {
      // [[...], [...]] 형태
      (cards as any[]).forEach((arr) => {
        const items = normList(arr);
        out.push({ items });
      });
    }
  }

  // cards가 없고 legacy images만 있는 경우
  if (out.length === 0 && Array.isArray(images)) {
    const legacy = normList(images as AnyImg[]);
    out.push({ items: legacy });
  }

  return out;
}

function normalizeFileGroups(files?: unknown): Group[] {
  const out: Group[] = [];
  if (!Array.isArray(files)) return out;

  const first = files[0];

  // [{ title, images }] 형태
  if (first && typeof first === "object" && !Array.isArray(first)) {
    (files as any[]).forEach((f) => {
      const items = normList(f?.images);
      const title =
        typeof f?.title === "string" && f.title.trim().length > 0
          ? f.title
          : null;
      out.push({ items, title });
    });
  } else if (Array.isArray(first)) {
    // [[...], [...]] 형태
    (files as any[]).forEach((arr) => {
      const items = normList(arr);
      out.push({ items });
    });
  } else {
    // 평면 배열 하나만 온 경우
    const single = normList(files as AnyImg[]);
    out.push({ items: single });
  }

  return out;
}

/* ───────── 컴포넌트 ───────── */
export default function DisplayImagesSection({
  cards,
  images,
  files,
  showNames = false,
}: DisplayImagesSectionProps) {
  /* ---------- 권한 ---------- */
  const { isPrivileged, canDownloadImage } = useMeRole();
  const hasDownloadAccess = isPrivileged || canDownloadImage;

  const { toast } = useToast();

  /* ---------- 일괄 다운로드 로딩 상태 ---------- */
  const [downloadingGroupId, setDownloadingGroupId] = useState<string | null>(null);

  /* ---------- 일괄 다운로드 처리 함수 ---------- */
  const handleGroupDownload = async (items: DisplayImageItem[], groupTitle: string, groupId: string) => {
    if (!items || items.length === 0) return;
    
    setDownloadingGroupId(groupId);
    const zip = new JSZip();
    const folderName = groupTitle ? groupTitle.replace(/[\/\\?%*:|"<>]/g, "_") : "images";

    try {
      const downloadPromises = items.map(async (item, index) => {
        if (!item.url) return;
        
        const proxyUrl = `${API_BASE}/photo/upload/proxy?url=${encodeURIComponent(item.url)}`;
        const token = typeof window !== "undefined" ? localStorage.getItem("notemap_token") : null;
        const headers: Record<string, string> = {};
        if (token && token !== "undefined" && token !== "null") {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(proxyUrl, {
          headers,
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        
        // 파일 이름 결정
        let fileName = item.name;
        if (!fileName) {
          const urlParts = item.url.split('/');
          fileName = urlParts[urlParts.length - 1] || `image_${index + 1}.webp`;
        }
        
        zip.file(fileName, blob);
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: "blob" });
      
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("일괄 다운로드 실패:", error);
      
      let errMsg = "일괄 다운로드 중 알 수 없는 에러가 발생했습니다.";
      if (error?.message?.includes("status: 403")) {
        errMsg = "이미지 접근 권한이 없거나 링크 주소가 만료되었습니다. 페이지를 새로고침 해보세요.";
      } else if (error?.message?.includes("status: 404")) {
        errMsg = "존재하지 않거나 유실된 이미지 파일이 포함되어 있습니다.";
      } else if (error?.message) {
        errMsg = `다운로드 실패: ${error.message}`;
      }

      toast({
        variant: "destructive",
        title: "다운로드 실패",
        description: errMsg,
      });
    } finally {
      setDownloadingGroupId(null);
    }
  };

  const rawCardGroups = useMemo(
    () => normalizeCardGroups(cards, images),
    [cards, images]
  );
  const rawFileGroups = useMemo(() => normalizeFileGroups(files), [files]);

  // 아이템 참조 안정화
  const cacheRef = useRef<Map<string, DisplayImageItem>>(new Map());
  const stabilizeItems = useCallback((items?: DisplayImageItem[]) => {
    const src = Array.isArray(items) ? items : [];
    const next = new Map<string, DisplayImageItem>();
    const out = src.map((it) => {
      const key = `${it?.url ?? ""}|${it?.name ?? ""}|${it?.caption ?? ""}`;
      const prev = cacheRef.current.get(key);
      const stable = prev ?? it;
      next.set(key, stable);
      return stable;
    });
    cacheRef.current = next;
    return out;
  }, []);

  const cardGroups = useMemo<Group[]>(
    () =>
      rawCardGroups.map((g) => ({
        items: stabilizeItems(g?.items),
        title: g?.title ?? null,
      })),
    [rawCardGroups, stabilizeItems]
  );

  const fileGroups = useMemo<Group[]>(
    () =>
      rawFileGroups.map((g) => ({
        items: stabilizeItems(g?.items),
        title: g?.title ?? null,
      })),
    [rawFileGroups, stabilizeItems]
  );

  const hasAny =
    cardGroups.some((g) => (g.items?.length ?? 0) > 0) ||
    fileGroups.some((g) => (g.items?.length ?? 0) > 0);

  // 라이트박스
  const [open, setOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<DisplayImageItem[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  const openLightbox = useCallback((group: DisplayImageItem[], index = 0) => {
    const safeGroup = Array.isArray(group) ? group : [];
    setLightboxImages(safeGroup);
    setStartIndex(clamp(index, 0, Math.max(0, safeGroup.length - 1)));
    setOpen(true);
  }, []);

  // 인덱스 상태
  const [cardIdxs, setCardIdxs] = useState<number[]>([]);

  useEffect(() => {
    const next = [...cardIdxs];
    let changed = false;

    if (next.length !== cardGroups.length) {
      next.length = cardGroups.length;
      for (let i = 0; i < cardGroups.length; i++) next[i] = next[i] ?? 0;
      changed = true;
    }

    for (let i = 0; i < next.length; i++) {
      const len = cardGroups[i]?.items?.length ?? 0;
      const safe = len === 0 ? 0 : clamp(next[i] ?? 0, 0, len - 1);
      if (safe !== next[i]) {
        next[i] = safe;
        changed = true;
      }
    }

    if (changed) setCardIdxs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cardGroups.length,
    cardGroups.map((g) => g.items?.length ?? 0).join(","),
  ]);

  const [fileIdxs, setFileIdxs] = useState<number[]>([]);

  useEffect(() => {
    const next = [...fileIdxs];
    let changed = false;

    if (next.length !== fileGroups.length) {
      next.length = fileGroups.length;
      for (let i = 0; i < fileGroups.length; i++) next[i] = next[i] ?? 0;
      changed = true;
    }

    for (let i = 0; i < next.length; i++) {
      const len = fileGroups[i]?.items?.length ?? 0;
      const safe = len === 0 ? 0 : clamp(next[i] ?? 0, 0, len - 1);
      if (safe !== next[i]) {
        next[i] = safe;
        changed = true;
      }
    }

    if (changed) setFileIdxs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fileGroups.length,
    fileGroups.map((g) => g.items?.length ?? 0).join(","),
  ]);

  if (!hasAny) {
    return (
      <div className="rounded-xl border bg-gray-50/60 p-3">
        <div className="aspect-video rounded-md border bg-white grid place-items-center text-sm text-gray-400">
          등록된 이미지가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 가로형 카드들 */}
      {cardGroups.map((group, gi) => {
        const items = Array.isArray(group.items) ? group.items : [];
        if (!items.length) return null;

        const curIdx = clamp(
          cardIdxs[gi] ?? 0,
          0,
          Math.max(0, items.length - 1)
        );
        const cur = items[curIdx];
        const curCaption = cur?.caption || "";
        const curName = cur?.name?.trim();

        // 제목 우선, 없으면 캡션 사용
        const slotText =
          (group.title && group.title.trim().length > 0
            ? group.title
            : curCaption) || "";

        const id = `card-${gi}`;
        const isDownloading = downloadingGroupId === id;

        return (
          <div
            key={id}
            className="rounded-xl border bg-gray-50/60 p-3 transform-gpu"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            {/* 일괄 저장 헤더 영역 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-black text-gray-500">
                {group.title || `가로형 이미지 세트 ${gi + 1}`}
              </span>
              {hasDownloadAccess && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDownloading}
                  className="h-7 px-2 text-[11px] font-bold flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-all rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGroupDownload(items, group.title || `card_group_${gi + 1}`, id);
                  }}
                >
                  {isDownloading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {isDownloading ? "다운로드 중..." : "일괄 다운로드"}
                </Button>
              )}
            </div>

            <div className="relative aspect-video overflow-hidden rounded-md border bg-white transform-gpu" style={{ transform: "translateZ(0)" }}>
              <MiniCarousel
                images={items}
                aspect="video"
                objectFit="cover"
                showDots
                showIndex
                indexPlacement="top-right"
                onImageClick={(i) => openLightbox(items, i)}
                onIndexChange={(i) => {
                  const want = clamp(i, 0, Math.max(0, items.length - 1));
                  setCardIdxs((prev) => {
                    const cur = prev[gi] ?? 0;
                    if (cur === want) return prev;
                    const next = prev.slice();
                    next[gi] = want;
                    return next;
                  });
                }}
              />
              {showNames && curName ? (
                <div className="absolute bottom-2 left-2 max-w-[75%] rounded bg-black/40 text-white text-[11px] px-2 py-0.5 truncate">
                  {curName}
                </div>
              ) : null}
            </div>

            {/* 🔥 이미지 아래, 가운데 위치 (CaptionSlot) 에 제목/캡션 표시 */}
            <CaptionSlot text={slotText} />
          </div>
        );
      })}

      {/* 세로(파일) 카드들 */}
      {fileGroups.map((group, gi) => {
        const items = Array.isArray(group.items) ? group.items : [];
        if (!items.length) return null;

        const curIdx = clamp(
          fileIdxs[gi] ?? 0,
          0,
          Math.max(0, items.length - 1)
        );
        const cur = items[curIdx];

        // 세로도 그룹 제목이 있으면 우선, 없으면 이미지 캡션
        const slotText =
          (group.title && group.title.trim().length > 0
            ? group.title
            : cur?.caption) || "";

        const id = `file-${gi}`;
        const isDownloading = downloadingGroupId === id;

        return (
          <div
            key={id}
            className="rounded-xl border bg-gray-50/60 p-3 transform-gpu"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            {/* 일괄 저장 헤더 영역 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-black text-gray-500">
                {group.title || `세로형 이미지 세트 ${gi + 1}`}
              </span>
              {hasDownloadAccess && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDownloading}
                  className="h-7 px-2 text-[11px] font-bold flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-all rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGroupDownload(items, group.title || `file_group_${gi + 1}`, id);
                  }}
                >
                  {isDownloading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {isDownloading ? "다운로드 중..." : "일괄 다운로드"}
                </Button>
              )}
            </div>

            <div className="relative aspect-[3/4] overflow-hidden rounded-md border bg-white transform-gpu" style={{ transform: "translateZ(0)" }}>
              <MiniCarousel
                images={items}
                objectFit="contain"
                showDots
                showIndex
                indexPlacement="top-right"
                onImageClick={(i) => openLightbox(items, i)}
                onIndexChange={(i) => {
                  const want = clamp(i, 0, Math.max(0, items.length - 1));
                  setFileIdxs((prev) => {
                    const cur = prev[gi] ?? 0;
                    if (cur === want) return prev;
                    const next = prev.slice();
                    next[gi] = want;
                    return next;
                  });
                }}
                className="w-full h-full"
              />
            </div>

            {/* 🔥 세로 카드도 이미지 아래 캡션 위치에 제목/캡션 */}
            <CaptionSlot text={slotText} />
          </div>
        );
      })}

      {open ? (
        <LightboxModal
          open={open}
          images={lightboxImages}
          initialIndex={startIndex}
          onClose={() => setOpen(false)}
          objectFit="contain"
          withThumbnails
        />
      ) : null}
    </div>
  );
}
