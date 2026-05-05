"use client";

import type React from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import { useEffect, useId, useRef, useState, useMemo, useCallback } from "react";
import type { ImageItem } from "@/features/properties/types/media";
import type { ImageCarouselUploadProps } from "./types";
import { ProtectedImage } from "@/shared/components/ProtectedImage";

export default function ImageCarouselUpload({
  items,
  onChangeCaption,
  onRemoveImage,
  useLocalCaptionFallback = true,
  onOpenPicker,
  inputRef,
  onChangeFiles,
  maxCount,
  layout = "wide",
  wideAspectClass = "aspect-video",
  tallHeightClass = "h-80",
  objectFit,

  // ✅ 폴더 제목 모드 지원
  captionAsFolderTitle = false,
  folderTitle = "",
  onChangeFolderTitle,
  onOpenReorder,
}: ImageCarouselUploadProps & {
  captionAsFolderTitle?: boolean;
  folderTitle?: string;
  onChangeFolderTitle?: (text: string) => void;
}) {
  const id = useId();
  const count = items?.length ?? 0;

  const [current, setCurrent] = useState(0);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  // ✅ 폴더 제목 로컬 상태
  const [folderTitleLocal, setFolderTitleLocal] = useState(folderTitle ?? "");

  useEffect(() => {
    setFolderTitleLocal(folderTitle ?? "");
  }, [folderTitle]);

  // 로컬 캡션 폴백
  const [localCaptions, setLocalCaptions] = useState<string[]>(() =>
    items.map((it) => (typeof it?.caption === "string" ? it.caption! : ""))
  );

  useEffect(() => {
    setLocalCaptions(
      items.map((it) => (typeof it?.caption === "string" ? it.caption! : ""))
    );
  }, [items]);

  // items가 바뀔 때 current 인덱스 보정
  useEffect(() => {
    if (count === 0) {
      setCurrent(0);
    } else if (current >= count) {
      setCurrent(count - 1);
    }
  }, [count, current]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setCurrent((c) => (c - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  // ✅ 최적화된 Object URL 관리
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const fileUrlsRef = useRef<Record<string, string>>({});

  const makeKey = useCallback((it: ImageItem, idx: number) => {
    const anyIt: any = it;
    return (
      anyIt.id ??
      anyIt.photoId ??
      anyIt.serverId ??
      anyIt.idbKey ??
      `${anyIt.name ?? "file"}_${(anyIt.file as File | undefined)?.size ?? ""}_${idx}`
    ).toString();
  }, []);

  useEffect(() => {
    const prevMap = fileUrlsRef.current;
    const nextMap: Record<string, string> = {};
    const keysInUse = new Set<string>();

    items.forEach((it, idx) => {
      const anyIt: any = it;
      const f = anyIt.file instanceof File ? anyIt.file : undefined;
      if (!f) return;

      const key = makeKey(it, idx);
      keysInUse.add(key);

      if (prevMap[key]) {
        nextMap[key] = prevMap[key];
      } else {
        nextMap[key] = URL.createObjectURL(f);
      }
    });

    // 사용되지 않는 URL 정리
    Object.entries(prevMap).forEach(([key, url]) => {
      if (!keysInUse.has(key) && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    fileUrlsRef.current = nextMap;
    setFileUrls(nextMap);
  }, [items, makeKey]);

  useEffect(() => {
    return () => {
      Object.values(fileUrlsRef.current).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // 드래그/스와이프 가시적 피드백을 위한 상태
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (count <= 1) return;
    // 버튼이나 입력창 클릭 시에는 드래그/캡처 방지
    if ((e.target as HTMLElement).closest("button, input")) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    isDragging.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    setDragOffset(delta);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    const threshold = 50;

    if (delta > threshold) {
      goPrev();
    } else if (delta < -threshold) {
      goNext();
    }

    setDragOffset(0);
    dragStartX.current = null;
    isDragging.current = false;
  };

  const onPointerCancel = () => {
    setDragOffset(0);
    dragStartX.current = null;
    isDragging.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  const currentCaption = captionAsFolderTitle
    ? folderTitleLocal
    : items[current]?.caption ??
      (useLocalCaptionFallback ? localCaptions[current] : "") ??
      "";

  const handleCaptionChange = (text: string) => {
    if (captionAsFolderTitle) {
      setFolderTitleLocal(text);
      onChangeFolderTitle?.(text);
      return;
    }
    if (onChangeCaption) {
      onChangeCaption(current, text);
    } else if (useLocalCaptionFallback) {
      setLocalCaptions((prev) => {
        const next = [...prev];
        next[current] = text;
        return next;
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFiles?.(e.target.files);
    e.currentTarget.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemoveImage) return;
    if (!captionAsFolderTitle) {
      setLocalCaptions((prev) => prev.filter((_, i) => i !== current));
    }
    onRemoveImage(current);
  };

  const getSafeSrc = useCallback((it: ImageItem, idx: number) => {
    if (!it) return undefined;
    const key = makeKey(it, idx);
    const fromFile = fileUrls[key];
    const src = (fromFile ?? it.dataUrl ?? it.url ?? "").trim();
    return src.length > 0 ? src : undefined;
  }, [fileUrls, makeKey]);

  const fit = objectFit ?? (layout === "wide" ? "cover" : "contain");

  return (
    <div
      role="group"
      aria-label="이미지 업로드 및 미리보기"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "relative rounded-xl border border-gray-200 bg-gray-50/60 p-3 overflow-hidden",
        "flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
      )}
    >
      <div
        className={cn(
          "relative w-full rounded-md border overflow-hidden select-none bg-white",
          layout === "wide" ? wideAspectClass : tallHeightClass
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {count === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            이미지를 업로드하세요
            {typeof maxCount === "number" ? ` (최대 ${maxCount}장)` : ""}
          </div>
        ) : (
          <>
            {/* 슬라이더 컨테이너 */}
            <div
              className="absolute inset-0 flex transition-transform duration-300 ease-out transform-gpu"
              style={{
                transform: `translateX(calc(-${current * 100}% + ${dragOffset}px))`,
                transition: isDragging.current ? "none" : "transform 0.3s ease-out",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform"
              }}
            >
              {items.map((it, idx) => {
                const key = makeKey(it, idx);
                const src = getSafeSrc(it, idx);
                const isError = imgErrorMap[key];
                const isVisible = Math.abs(idx - current) <= 1; // 현재 및 인접 이미지면 렌더링

                return (
                  <div key={key} className="w-full h-full flex-shrink-0 relative bg-white">
                    {isVisible && src && !isError ? (
                      <ProtectedImage
                        src={src}
                        alt={it.name ?? `image-${idx + 1}`}
                        className={cn(
                          "w-full h-full",
                          fit === "cover" ? "object-cover" : "object-contain"
                        )}
                        disablePointerEvents={false}
                        loading={Math.abs(idx - current) === 0 ? "eager" : "lazy"}
                        onError={() => setImgErrorMap(prev => ({ ...prev, [key]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                        {isError ? "이미지 로드 실패" : "대기 중..."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 컨트롤 오버레이 */}
            {count > 0 && onRemoveImage && (
              <div className="absolute top-2 right-2 z-20">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:text-red-400 hover:bg-black/50 transition-all"
                  title="삭제"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            )}

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
                  aria-label="이전"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
                  aria-label="다음"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 right-2 z-20 rounded-md bg-black/55 text-white text-xs px-2 py-0.5">
              {current + 1} / {count}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === current ? "bg-white" : "bg-white/50 hover:bg-white/80"
                  )}
                  aria-label={`슬라이드 ${i + 1}`}
                />
              ))}
            </div>

            {items[current]?.name && (
              <div className="absolute top-2 left-2 z-20 max-w-[75%] rounded bg-black/40 text-white text-[11px] px-2 py-0.5 truncate">
                {items[current].name}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          type="text"
          value={currentCaption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="제목을 입력하세요"
          className="flex-1 min-w-0 h-9 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />

        <div className="shrink-0 flex items-center gap-2">
          {count > 1 && onOpenReorder && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenReorder}
              className="px-2.5 text-slate-500 hover:text-primary transition-colors"
              title="사진 순서 변경"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}

          <input
            id={id}
            ref={inputRef ?? null}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onOpenPicker}
            className="gap-1"
          >
            <Upload className="h-4 w-4" />
            업로드
          </Button>
        </div>
      </div>
    </div>
  );
}
