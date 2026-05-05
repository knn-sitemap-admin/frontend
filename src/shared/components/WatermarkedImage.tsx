"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useMe } from "@/shared/api/auth/auth";

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  /** 워터마크 활성화 여부 (기본 true) */
  enabled?: boolean;
  /** 워터마크 투명도 (기본 0.12, 0~1) */
  opacity?: number;
  style?: React.CSSProperties;
  disablePointerEvents?: boolean;
}

/**
 * 🛡️ 캡처 억제용 워터마크 이미지 컴포넌트
 *
 * - 로그인한 사용자의 이름 + 날짜를 대각선으로 반복 표시
 * - 스크린샷을 찍어도 워터마크가 함께 캡처되어 누가 유출했는지 추적 가능
 * - Canvas API를 사용하므로 서버 부하 없음
 */
export function WatermarkedImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  enabled = true,
  opacity = 0.12,
  style,
  disablePointerEvents = false,
}: WatermarkedImageProps) {
  const { data: me } = useMe();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // 사용자 정보로 워터마크 텍스트 구성
  const watermarkText = useMemo(() => {
    const anyMe = me as any;
    // 우선순위: 실제 이름 → username → role+ID 조합
    const identifier =
      anyMe?.name ||
      anyMe?.username ||
      (anyMe?.role && anyMe?.credentialId
        ? `${anyMe.role} #${anyMe.credentialId}`
        : anyMe?.credentialId
          ? `#${anyMe.credentialId}`
          : anyMe?.email?.split('@')[0] || "NOTEMAP");

    const today = new Date().toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
    return `${identifier}  ${today}`;
  }, [me]);

  // Canvas에 워터마크 패턴 그리기
  const drawWatermark = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !enabled) return;

    const { offsetWidth: w, offsetHeight: h } = img;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // 텍스트 설정
    const fontSize = Math.max(12, Math.min(w, h) * 0.035);
    ctx.font = `bold ${fontSize}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
    ctx.globalAlpha = 1;

    // 대각선 방향으로 반복 타일링
    const angle = -30 * (Math.PI / 180);
    const textWidth = ctx.measureText(watermarkText).width;
    const gapX = textWidth + 40;
    const gapY = fontSize + 36;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);

    const diag = Math.sqrt(w * w + h * h);
    const cols = Math.ceil(diag / gapX) + 2;
    const rows = Math.ceil(diag / gapY) + 2;

    for (let r = -rows; r <= rows; r++) {
      for (let c = -cols; c <= cols; c++) {
        ctx.fillText(watermarkText, c * gapX - textWidth / 2, r * gapY);
      }
    }

    ctx.restore();
  };

  // 이미지 로드 완료 및 리사이즈 시 워터마크 재그리기
  useEffect(() => {
    if (!imgLoaded) return;
    drawWatermark();

    const observer = new ResizeObserver(() => drawWatermark());
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded, watermarkText, enabled, opacity]);

  const protectionStyle: React.CSSProperties = {
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
    [("WebkitUserDrag") as any]: "none",
  };

  return (
    <div
      className={cn("relative inline-block", wrapperClassName)}
      style={{ lineHeight: 0 }}
    >
      {/* 실제 이미지 */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        style={{ ...protectionStyle, display: "block", ...style }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onLoad={() => setImgLoaded(true)}
        onPointerDown={disablePointerEvents ? (e) => e.preventDefault() : undefined}
      />

      {/* 워터마크 Canvas 오버레이 */}
      {enabled && imgLoaded && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            width: "100%",
            height: "100%",
            touchAction: "none",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
