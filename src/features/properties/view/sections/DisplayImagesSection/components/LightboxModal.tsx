import { X, ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Download } from "lucide-react";
import type { ImageItem } from "@/features/properties/types/media";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedImage } from "@/shared/components/ProtectedImage";
import { useMeRole } from "@/features/auth/hooks/useMeRole";
import { isMobile } from "@/lib/utils";
import { API_BASE } from "@/shared/api/api";

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
  /* ---------- 권한 ---------- */
  const { isPrivileged, canDownloadImage } = useMeRole();
  const hasDownloadAccess = isPrivileged || canDownloadImage;

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentItem = images[index];
    if (!currentItem?.url) return;

    try {
      // 🔒 [CORS 이슈 해결] 백엔드 프록시를 통해 이미지를 다운로드합니다.
      // 외부 도메인(Cloudfront)의 이미지를 직접 fetch할 때 발생하는 CORS 문제를 회피합니다.
      const proxyUrl = `${API_BASE}/photo/upload/proxy?url=${encodeURIComponent(currentItem.url)}`;
      
      const token = typeof window !== "undefined" ? localStorage.getItem("notemap_token") : null;
      const headers: Record<string, string> = {};
      if (token && token !== "undefined" && token !== "null") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(proxyUrl, {
        headers,
        credentials: 'include', // 세션 쿠키 포함
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      
      // 파일명 결정
      let fileName = currentItem.name;
      if (!fileName) {
        const urlParts = currentItem.url.split('/');
        fileName = urlParts[urlParts.length - 1] || `image_${index + 1}.webp`;
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      // 폴백: 최후의 수단으로 새 창에서 열기
      window.open(currentItem.url, "_blank");
    }
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

  // --- 모바일 뒤로가기 제어 (History API) ---
  const isPopStateRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !isMobile()) return;

    // 1. 모달이 열릴 때 히스토리에 가짜 상태 추가
    isPopStateRef.current = false;
    const modalId = Math.random().toString(36).substring(2, 11);
    window.history.pushState({ lightboxOpen: true, modalId }, "");

    // 2. 뒤로가기(popstate) 발생 시 핸들러
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modalId !== modalId) {
        isPopStateRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
      
      // 3. 만약 뒤로가기가 아니라 'X' 버튼이나 배경 클릭으로 수동으로 닫힌 경우라면, 
      //    쌓아두었던 가짜 히스토리를 수동으로 제거해줌 (원복)
      if (!isPopStateRef.current) {
        // 히스토리 상태가 우리가 넣은 것인지 확인 후 뒤로가기 실행
        if (window.history.state?.modalId === modalId) {
          window.history.back();
        }
      }
    };
  }, [open]); // onClose 제거

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

  // 🔄 [성능 최적화] 앞뒤 이미지 미리 로드
  const preloadedIndices = useMemo(() => {
    const indices = [];
    if (len > 1) {
      indices.push((index + 1) % len); // 다음 이미지
      indices.push((index - 1 + len) % len); // 이전 이미지
    }
    return indices;
  }, [index, len]);

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/95 sm:backdrop-blur-md flex flex-col select-none overflow-hidden animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 🔄 프리로딩 레이어 (화면에는 안 보임) */}
      <div className="hidden">
        {preloadedIndices.map(i => (
          <img key={i} src={images[i].dataUrl ?? images[i].url} alt="preload" />
        ))}
      </div>

      {/* 고정 상단 바 */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 z-20 bg-gradient-to-b from-black/90 to-transparent gap-2">
        <div className="flex flex-col min-w-0 pr-10 sm:pr-0">
          <h2 className="text-white text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-md">
            {albumTitle || "이미지 상세보기"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">
              {isImg ? (scale > 1 ? `${scale.toFixed(1)}x Zoom` : 'Standard View') : 'Document File'}
            </span>
            <div className="bg-white/10 px-2 py-0.5 rounded text-white/50 text-[10px] font-bold">
              {index + 1} / {len}
            </div>
          </div>
        </div>

        {/* 컨트롤 버튼 그룹 */}
        <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
          {isImg && (
            <>
              {/* 확대/축소 */}
              <div className="flex items-center bg-white/10 rounded-full p-0.5 border border-white/5 shrink-0">
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white disabled:opacity-20 transition-all active:scale-90"
                >
                  <ZoomOut size={15} />
                </button>
                <div className="hidden sm:block w-9 text-center text-[10px] font-bold text-white tabular-nums">
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white disabled:opacity-20 transition-all active:scale-90"
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              {/* 회전 */}
              <div className="flex items-center bg-white/10 rounded-full p-0.5 border border-white/5 shrink-0">
                <button
                  onClick={rotateLeft}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={rotateRight}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                >
                  <RotateCw size={15} />
                </button>
              </div>

              {/* 다운로드 */}
              {hasDownloadAccess && (
                <button
                  onClick={handleDownload}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-500/80 hover:bg-emerald-500 text-white transition-all active:scale-90 shrink-0"
                >
                  <Download size={16} />
                </button>
              )}

              {/* 초기화 */}
              <button
                onClick={(e) => { e.stopPropagation(); resetAll(); }}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 shrink-0"
              >
                <RefreshCcw size={16} />
              </button>
            </>
          )}
          
          {/* 닫기 (절대 위치로 우측 상단 고정 - 모바일 대응) */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-rose-500/80 hover:bg-rose-500 text-white transition-all active:scale-90 shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 중앙 메인 슬라이더 영역 */}
      <div className="relative flex-1 flex flex-col min-h-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* 좌우 이동 버튼 (데스크톱 전용) */}
        {len > 1 && scale === 1 && !isMobile() && (
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
            className={`flex h-full w-full ${!isSwiping ? 'transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)' : ''}`}
            style={{ 
              transform: `translate3d(calc(-${index * 100}% + ${swipeOffset}px), 0, 0)`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {images.map((img, i) => {
              // 최적화: 현재 인덱스 기준 앞뒤 1개씩만 렌더링
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
                  className={`flex-shrink-0 w-full h-full flex items-center justify-center p-2 sm:p-8 ${i !== index && scale > 1 ? 'hidden' : ''}`}
                  onPointerDown={i === index && isI ? handlePointerDown : undefined}
                  onPointerMove={i === index && isI ? handlePointerMove : undefined}
                  onPointerUp={i === index && isI ? handlePointerUp : undefined}
                  onPointerCancel={i === index && isI ? handlePointerUp : undefined}
                  style={{ cursor: isI && scale > 1 ? 'grab' : 'default' }}
                >
                  <div 
                    className="relative transition-transform duration-300 ease-out transform-gpu"
                    style={{ 
                      transform: isCurrent && isI ? `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)` : 'none',
                      zIndex: isCurrent ? 10 : 0,
                      willChange: isCurrent && (scale > 1 || rotation !== 0) ? 'transform' : 'auto'
                    }}
                  >
                    {!isI ? (
                      /* 📄 문서 파일 전용 UI */
                      <div className="flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl w-[280px] sm:w-[450px] shadow-2xl">
                        <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-white shadow-xl">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                            <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex flex-col gap-2 text-center max-w-full px-4">
                          <h3 className="text-lg sm:text-xl font-bold text-white truncate block w-full">{img.name || "문서 파일"}</h3>
                          <p className="text-[10px] sm:text-sm text-emerald-400 font-bold uppercase tracking-widest">{src?.split(".").pop()} DOCUMENT</p>
                        </div>
                        <a
                          href={src}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          열기 / 다운로드
                        </a>
                      </div>
                    ) : (
                      <div className="relative group">
                        <ProtectedImage
                          src={src!}
                          alt={`Image ${i + 1}`}
                          className={`block max-h-[70vh] sm:max-h-[85vh] w-auto ${fitClass} rounded-lg shadow-2xl transition-all duration-500 transform-gpu ${
                            isCurrent 
                              ? 'opacity-100 scale-100' 
                              : `opacity-40 scale-95 ${!isSwiping ? 'blur-sm' : ''}`
                          }`}
                          disablePointerEvents={false}
                        />
                        <div 
                          className="absolute inset-0 z-10 touch-none select-none"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        
                        {i === index && scale === 1 && (img.caption || img.name) && (
                          <div className="absolute -bottom-10 left-0 right-0 text-center animate-in slide-in-from-bottom-2 duration-500 z-20">
                            <p className="text-white text-[10px] sm:text-sm font-medium bg-black/40 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-white/10 max-w-[90vw] truncate">
                              {img.caption || img.name}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 중앙 하단 진행 바 (모바일에서 더 슬림하게) */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-0.5 sm:px-4 sm:py-1 rounded-full text-white text-[10px] sm:text-[11px] font-bold tracking-widest shadow-xl">
            <span className="text-emerald-400">{index + 1}</span>
            <span className="mx-1.5 sm:mx-2 opacity-30">/</span>
            <span>{len}</span>
          </div>
          
          {len > 1 && scale === 1 && (
            <div className="w-32 sm:w-48 h-0.5 sm:h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${((index + 1) / len) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 썸네일 바 (모바일에서는 생략하거나 높이 축소 가능) */}
      {withThumbnails && len > 1 && scale === 1 && (
        <div className="h-20 sm:h-24 bg-black/40 backdrop-blur-xl border-t border-white/5 p-2 sm:p-3 z-20 animate-in slide-in-from-bottom-full duration-300 overflow-hidden">
          <div 
            ref={thumbContainerRef}
            className="flex gap-2 h-full overflow-x-auto no-scrollbar items-center justify-start px-2 sm:px-10"
          >
            {images.map((im, i) => {
              const s = im.dataUrl ?? im.url;
              const isI = isImage(s);

              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                  className={`relative flex-shrink-0 h-12 w-12 sm:h-16 sm:w-16 rounded-md overflow-hidden border-2 transition-all duration-300 ${
                    i === index 
                      ? "border-emerald-400 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.3)] z-10" 
                      : "border-transparent opacity-40 hover:opacity-70"
                  }`}
                >
                  {!isI ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/40">
                        <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      <ProtectedImage
                        src={s!}
                        alt={`Thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 z-10" onContextMenu={(e) => e.preventDefault()} />
                    </div>
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
