"use client";

import { X, ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut, RotateCcw, RefreshCcw } from "lucide-react";
import type { ImageItem } from "@/features/properties/types/media";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  images: ImageItem[];
  initialIndex?: number;
  onClose: () => void;
  objectFit?: "contain" | "cover";
  withThumbnails?: boolean;
  title?: string;
};

export default function LightboxModal({
  open,
  images,
  initialIndex = 0,
  onClose,
  objectFit: initialObjectFit = "contain",
  withThumbnails = false,
  title,
}: Props) {
  /* ---------- 상태 ---------- */
  const len = Array.isArray(images) ? images.length : 0;
  const hasImages = len > 0;

  const [index, setIndex] = useState(() => {
    const i = Number.isFinite(initialIndex) ? initialIndex : 0;
    return Math.max(0, Math.min(i, Math.max(0, len - 1)));
  });

  const [objectFit, setObjectFit] = useState<"contain" | "cover">(initialObjectFit);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isSwipingRef = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);

  // 인덱스 초기화
  useEffect(() => {
    if (!open) return;
    const clamped = Math.max(0, Math.min(initialIndex, len - 1));
    setIndex(clamped);
    resetAll();
  }, [open, initialIndex, len]);

  // 모든 상태 초기화 (줌, 위치, 회전)
  const resetAll = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setSwipeOffset(0);
    setIsSwiping(false);
  }, []);

  // 썸네일 자동 스크롤 및 이미지 전환 시 리셋
  useEffect(() => {
    if (thumbContainerRef.current) {
      const activeThumb = thumbContainerRef.current.children[index] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
    resetAll(); 
  }, [index, resetAll]);

  const prev = useCallback(() => {
    if (!hasImages) return;
    setIndex((i) => (i === 0 ? len - 1 : i - 1));
  }, [hasImages, len]);

  const next = useCallback(() => {
    if (!hasImages) return;
    setIndex((i) => (i === len - 1 ? 0 : i + 1));
  }, [hasImages, len]);

  /* ---------- 핸들러 ---------- */
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const rotateLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(r => r - 90); // 누적 방식으로 변경
  };

  const rotateRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(r => r + 90); // 누적 방식으로 변경
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      isDraggingRef.current = true;
      startPosRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      isSwipingRef.current = true;
      setIsSwiping(true);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current && scale > 1) {
      setOffset({
        x: e.clientX - startPosRef.current.x,
        y: e.clientY - startPosRef.current.y
      });
    } else if (isSwipingRef.current && scale === 1) {
      const deltaX = e.clientX - startPosRef.current.x;
      setSwipeOffset(deltaX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
    } else if (isSwipingRef.current) {
      isSwipingRef.current = false;
      setIsSwiping(false);
      const threshold = 50;
      if (swipeOffset > threshold) {
        prev();
      } else if (swipeOffset < -threshold) {
        next();
      }
      setSwipeOffset(0);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, prev, next]);

  const isImage = (url?: string | null) => {
    if (!url) return true;
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext || "");
  };

  if (!open || !hasImages) return null;

  const currentImage = images[index];
  const currentSrc = currentImage?.dataUrl ?? currentImage?.url;
  const isImg = isImage(currentSrc);

  const albumTitle = (title && title.trim()) || currentImage?.caption?.trim?.() || currentImage?.name?.trim?.() || "";
  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col select-none overflow-hidden animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 고정 상단 바 */}
      <div className="flex items-center justify-between p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
          <h2 className="text-white text-sm font-bold truncate max-w-[120px] sm:max-w-md">
            {albumTitle}
          </h2>
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mt-0.5">
            {isImg ? (scale > 1 ? `${scale.toFixed(1)}x Zoom` : 'Standard View') : 'Document File'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {isImg && (
            <>
              {/* 확대/축소 그룹 */}
              <div className="flex items-center bg-white/10 rounded-full p-0.5 border border-white/5 mr-1 sm:mr-2">
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white disabled:opacity-20 transition-all active:scale-90"
                  title="축소"
                >
                  <ZoomOut size={16} />
                </button>
                <div className="w-9 text-center text-[10px] font-bold text-white tabular-nums">
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white disabled:opacity-20 transition-all active:scale-90"
                  title="확대"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              {/* 회전 그룹 */}
              <div className="flex items-center bg-white/10 rounded-full p-0.5 border border-white/5">
                <button
                  onClick={rotateLeft}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                  title="왼쪽 회전"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={rotateRight}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                  title="오른쪽 회전"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {/* 초기화 버튼 */}
              <button
                onClick={(e) => { e.stopPropagation(); resetAll(); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 ml-1"
                title="초기화"
              >
                <RefreshCcw size={18} />
              </button>
            </>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/80 hover:bg-rose-500 text-white transition-all active:scale-90 ml-1 sm:ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 중앙 메인 슬라이더 영역 */}
      <div className="relative flex-1 flex flex-col min-h-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* 좌우 이동 버튼 */}
        {len > 1 && scale === 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 group"
            >
              <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 group"
            >
              <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </>
        )}

        {/* 이미지/문서 컨테이너 */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none">
          <div 
            className={`flex h-full w-full ${scale === 1 && !isSwiping ? 'transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)' : ''}`}
            style={{ 
              transform: scale === 1 ? `translateX(calc(-${index * 100}% + ${swipeOffset}px))` : 'none',
              willChange: isSwiping ? 'transform' : 'auto',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {images.map((img, i) => {
              // 최적화: 현재 인덱스 기준 앞뒤 1개씩만 렌더링 (메모리 및 성능 최적화)
              const isVisible = Math.abs(i - index) <= 1;
              if (!isVisible) {
                return <div key={i} className="flex-shrink-0 w-full h-full" />;
              }

              const src = img.dataUrl ?? img.url;
              const isI = isImage(src);
              const isCurrent = i === index;

              return (
                <div 
                  key={i} 
                  className={`flex-shrink-0 w-full h-full flex items-center justify-center p-4 sm:p-8 ${i !== index && scale > 1 ? 'hidden' : ''}`}
                  onPointerDown={i === index && isI ? handlePointerDown : undefined}
                  onPointerMove={i === index && isI ? handlePointerMove : undefined}
                  onPointerUp={i === index && isI ? handlePointerUp : undefined}
                  onPointerCancel={i === index && isI ? handlePointerUp : undefined}
                  style={{ cursor: isI && scale > 1 ? 'grab' : 'default' }}
                >
                  <div 
                    className="relative transition-transform duration-300 ease-out transform-gpu"
                    style={{ 
                      transform: isCurrent && isI ? `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)` : 'none',
                      zIndex: isCurrent ? 10 : 0,
                      willChange: isCurrent && scale > 1 ? 'transform' : 'auto'
                    }}
                  >
                    {!isI ? (
                      /* 📄 문서 파일 전용 UI */
                      <div className="flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl w-[320px] sm:w-[450px] shadow-2xl">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-xl">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                            <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex flex-col gap-2 text-center max-w-full px-4">
                          <h3 className="text-xl font-bold text-white truncate block w-full">{img.name || "문서 파일"}</h3>
                          <p className="text-sm text-emerald-400 font-bold uppercase tracking-widest">{src?.split(".").pop()} DOCUMENT</p>
                          {img.caption && <p className="text-slate-400 text-sm mt-2 line-clamp-3 leading-relaxed">{img.caption}</p>}
                        </div>
                        <a
                          href={src}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-bold text-black hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          다운로드 하기
                        </a>
                      </div>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Image ${i + 1}`}
                          className={`block max-h-[75vh] sm:max-h-[85vh] w-auto ${fitClass} rounded-lg shadow-2xl transition-all duration-500 transform-gpu ${
                            isCurrent 
                              ? 'opacity-100 scale-100' 
                              : `opacity-40 scale-95 ${!isSwiping ? 'blur-sm' : ''}`
                          }`}
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                        {i === index && scale === 1 && (img.caption || img.name) && (
                          <div className="absolute -bottom-12 left-0 right-0 text-center animate-in slide-in-from-bottom-2 duration-500">
                            <p className="text-white text-xs sm:text-sm font-medium bg-black/40 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-white/10">
                              {img.caption || img.name}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 중앙 하단 인덱스 배지 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-1 rounded-full text-white text-[11px] font-bold tracking-widest shadow-xl">
            <span className="text-emerald-400">{index + 1}</span>
            <span className="mx-2 opacity-30">/</span>
            <span>{len}</span>
          </div>
          
          {len > 1 && scale === 1 && (
            <div className="w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${((index + 1) / len) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 썸네일 바 */}
      {withThumbnails && len > 1 && scale === 1 && (
        <div className="h-24 bg-black/40 backdrop-blur-xl border-t border-white/5 p-3 z-20 animate-in slide-in-from-bottom-full duration-300">
          <div 
            ref={thumbContainerRef}
            className="flex gap-2 h-full overflow-x-auto scrollbar-hide items-center justify-start px-4 sm:px-10"
          >
            {images.map((im, i) => {
              const s = im.dataUrl ?? im.url;
              const isI = isImage(s);

              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                  className={`relative flex-shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 transition-all duration-300 ${
                    i === index 
                      ? "border-emerald-400 scale-110 shadow-[0_0_15px_rgba(52,211,153,0.5)] z-10" 
                      : "border-transparent opacity-40 hover:opacity-70"
                  }`}
                >
                  {!isI ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/40">
                        <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={s}
                      alt={`Thumb ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
