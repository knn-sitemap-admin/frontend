"use client";

import type React from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import { useEffect, useId, useRef, useState } from "react";
import type { ImageItem } from "@/features/properties/types/media";
import type { ImageCarouselUploadProps } from "./types";

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
  const [imgError, setImgError] = useState(false);

  // ✅ 폴더 제목 로컬 상태 (부모에서 안 넘겨줘도 입력 가능하게)
  const [folderTitleLocal, setFolderTitleLocal] = useState(folderTitle ?? "");

  // props로 넘어오는 folderTitle이 바뀌면 로컬 상태 동기화
  useEffect(() => {
    setFolderTitleLocal(folderTitle ?? "");
  }, [folderTitle]);

  // 로컬 캡션 폴백(사진별 캡션 모드에서만 사용)
  const [localCaptions, setLocalCaptions] = useState<string[]>(() =>
    items.map((it) => (typeof it?.caption === "string" ? it.caption! : ""))
  );

  useEffect(() => {
    // 순서 조정 등으로 items 자체가 변경되면 (정렬 포함)
    // 사용자에게 바뀐 순서의 처음부터 보여주기 위해 0번으로 리셋
    setCurrent(0);
    setImgError(false);

    // 캡션 동기화 보장
    setLocalCaptions(
      items.map((it) => (typeof it?.caption === "string" ? it.caption! : ""))
    );
  }, [items]);

  useEffect(() => {
    if (count === 0) {
      setCurrent(0);
    } else if (current >= count) {
      setCurrent(count - 1);
    }
    setImgError(false);
  }, [count]);

  const goPrev = () => count > 0 && setCurrent((c) => (c - 1 + count) % count);
  const goNext = () => count > 0 && setCurrent((c) => (c + 1) % count);

  // 드래그/스와이프
  const dragX = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current == null) return;
    const dx = e.clientX - dragX.current;
    if (dx > 40) goPrev();
    if (dx < -40) goNext();
    dragX.current = null;
  };
  const onPointerCancel = () => (dragX.current = null);

  // 키보드
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const cur = count > 0 ? items[current] : null;
  const fit = objectFit ?? (layout === "wide" ? "cover" : "contain");

  // ✅ 미리보기용 objectURL 캐시 (file용)
  type UrlMap = Record<string, string>;
  const [fileUrls, setFileUrls] = useState<UrlMap>({});
  const fileUrlsRef = useRef<UrlMap>({});

  // 각 아이템을 구분할 키 (서버 id 우선, 없으면 name+size+index)
  const makeKey = (it: ImageItem, idx: number) => {
    const anyIt: any = it;
    return (
      anyIt.id ??
      anyIt.photoId ??
      anyIt.serverId ??
      anyIt.idbKey ??
      `${anyIt.name ?? "file"}_${
        (anyIt.file as File | undefined)?.size ?? ""
      }_${idx}`
    ).toString();
  };

  // items가 바뀔 때마다 file → objectURL 생성 & 이전 URL 정리
  useEffect(() => {
    const nextMap: UrlMap = {};

    items.forEach((it, idx) => {
      const anyIt: any = it;
      const f: File | undefined =
        anyIt.file instanceof File ? anyIt.file : undefined;
      if (!f) return;
      const key = makeKey(it, idx);
      const url = URL.createObjectURL(f);
      nextMap[key] = url;
    });

    Object.entries(fileUrlsRef.current).forEach(([key, url]) => {
      if (!nextMap[key] && url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    });

    fileUrlsRef.current = nextMap;
    setFileUrls(nextMap);
  }, [items]);

  // 언마운트 시 전체 정리
  useEffect(
    () => () => {
      Object.values(fileUrlsRef.current).forEach((url) => {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      });
      fileUrlsRef.current = {};
    },
    []
  );

  // ✅ 인풋 값 결정: 폴더제목 모드면 로컬 상태 사용
  const currentCaption = captionAsFolderTitle
    ? folderTitleLocal
    : cur?.caption ??
      (useLocalCaptionFallback ? localCaptions[current] : "") ??
      "";

  const handleCaptionChange = (text: string) => {
    if (captionAsFolderTitle) {
      // 폴더 제목 모드: 로컬 상태 업데이트 + 필요하면 부모 콜백 호출
      setFolderTitleLocal(text);
      onChangeFolderTitle?.(text);
      return;
    }

    // 사진별 캡션 모드
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

  // 파일 선택 후 value 초기화(같은 파일 재선택 허용)
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
    setCurrent((c) => Math.max(0, Math.min(c, count - 2)));
    setImgError(false);
    onRemoveImage(current);
  };

  // 안전한 src (file → objectURL, 없으면 dataUrl/url)
  const toSafeSrc = (raw?: string | null) => {
    const s = (raw ?? "").trim();
    return s.length > 0 ? s : undefined;
  };

  let safeSrc: string | undefined;
  if (cur) {
    const key = makeKey(cur, current);
    const fromFile = fileUrls[key];
    safeSrc = toSafeSrc(fromFile ?? cur.dataUrl ?? cur.url);
  }

  const showFallback = count === 0 || !safeSrc || imgError;

  return (
    <div
      ref={containerRef}
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
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {count === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            이미지를 업로드하세요
            {typeof maxCount === "number" ? ` (최대 ${maxCount}장)` : ""}
          </div>
        ) : showFallback ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-xs text-gray-500">
            이미지 로드 실패
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`img-${current}`}
              src={safeSrc}
              alt={cur?.name ?? `image-${current + 1}`}
              className={cn(
                "w-full h-full",
                fit === "cover" ? "object-cover" : "object-contain"
              )}
              draggable={false}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />

            {count > 0 && onRemoveImage && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                {/* 삭제 버튼 */}
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
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
                  aria-label="이전"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
                  aria-label="다음"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 right-2 rounded-md bg-black/55 text-white text-xs px-2 py-0.5">
              {current + 1} / {count}
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCurrent(i);
                    setImgError(false);
                  }}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === current ? "bg-white" : "bg-white/50 hover:bg-white/80"
                  )}
                  aria-label={`슬라이드 ${i + 1}`}
                />
              ))}
            </div>

            {cur?.name && (
              <div className="absolute top-2 left-2 max-w-[75%] rounded bg-black/40 text-white text-[11px] px-2 py-0.5 truncate">
                {cur.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 입력: 폴더제목 모드면 folderTitleLocal 사용 */}
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
