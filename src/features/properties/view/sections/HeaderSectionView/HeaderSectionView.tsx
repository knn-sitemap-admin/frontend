"use client";

import { useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import StarsRating from "@/components/molecules/StarsRating";
import { HeaderSectionViewProps } from "./types";
import { getPinUrl } from "@/features/pins/lib/assets";
import StarMeter from "../../ui/parts/StarMeter";
import { getAgeLabel } from "@/features/properties/lib/ageLabel";
import { useMemoViewMode } from "@/features/properties/view/store/useMemoViewMode"; // ✅ 추가

export default function HeaderSectionView({
  title,
  parkingGrade,
  pinKind = "1room",
  onClose,
  closeButtonRef,
  headingId,
  descId,
  ageType,
  completionDate,
  newYearsThreshold = 5,
  rebateText,
}: HeaderSectionViewProps) {
  const pinSrc = useMemo(() => getPinUrl(pinKind), [pinKind]);

  const rating = useMemo(() => {
    const n =
      typeof parkingGrade === "number"
        ? parkingGrade
        : Number.parseInt(String(parkingGrade ?? "0"), 10);
    return Math.max(0, Math.min(5, Number.isFinite(n) ? n : 0));
  }, [parkingGrade]);

  const displayTitle = useMemo(() => {
    const s = typeof title === "string" ? title.trim() : "";
    return s.length ? s : "-";
  }, [title]);

  const ageLabel = useMemo<"신축" | "구옥" | "-">(() => {
    const isNewFlag =
      ageType === "NEW" ? true : ageType === "OLD" ? false : null;
    const isOldFlag =
      ageType === "OLD" ? true : ageType === "NEW" ? false : null;

    return getAgeLabel({
      isNew: isNewFlag,
      isOld: isOldFlag,
      completionDate: completionDate ?? null,
      newYearsThreshold,
    });
  }, [ageType, completionDate, newYearsThreshold]);

  const ageClass =
    ageLabel === "신축"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : ageLabel === "구옥"
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-gray-50 border-gray-200 text-gray-500";

  const rebateDisplay = useMemo(() => {
    if (rebateText === null || rebateText === undefined) return null;
    const raw = String(rebateText).trim();
    if (!raw) return null;

    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;

    return n.toLocaleString("ko-KR");
  }, [rebateText]);

  // ✅ 전역 메모 보기 모드 (K&N / R)
  const { mode: memoMode } = useMemoViewMode();

  return (
    <header className="sticky top-0 z-10 bg-white border-b">
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-3 md:py-5 overflow-hidden">
        {/* 1️⃣ 신축 / 핀 / 매물평점 / 매물명 */}
        <div className="order-1 flex flex-wrap md:flex-nowrap items-center gap-2 flex-1 min-w-0">
          {/* 연식 배지 (신축 / 구옥 / -) */}
          <span
            className={cn(
              "inline-flex h-8 md:h-9 items-center rounded-md border px-2 md:px-3 text-xs md:text-sm font-bold shrink-0",
              ageClass
            )}
          >
            {ageLabel}
          </span>

          {/* 핀 + 매물평점 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 핀 아이콘 */}
            <div className="shrink-0 w-7 h-7 md:w-9 md:h-9 grid place-items-center">
              <Image src={pinSrc} alt="pin" width={24} height={32} priority />
            </div>

            {/* 평점 라벨 (PC에서만) */}
            <span className="hidden md:flex shrink-0 text-[20px] font-semibold text-gray-800">
              매물평점
            </span>

            {/* 별점 */}
            <div className="shrink-0 w-[48px] md:w-[160px] leading-none">
              <StarsRating value={rating} className="hidden md:flex" />
              <div className="flex md:hidden">
                <StarMeter value={rating} showValue />
              </div>
            </div>
          </div>

          {/* 매물명 (좌측 정렬, 남는 공간 전부 차지) */}
          <div className="flex-1 min-w-0 w-full md:w-auto">
            <div className="h-8 md:h-10 flex items-center pl-0 pr-0.5 md:px-2 rounded-md bg-white">
              <span className="truncate text-base md:text-lg font-medium text-left">
                {displayTitle}
              </span>
            </div>
          </div>
        </div>

        {/* 2️⃣ 구분선 (PC에서만) */}
        {memoMode === "secret" && (
          <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1 shrink-0 md:order-2" />
        )}

        {/* 3️⃣ 리베이트 영역 (비밀글 모드 + 값 있을 때만 표시) */}
        {memoMode === "secret" && rebateDisplay && (
          <div className="order-2 md:order-3 shrink-0 flex items-center md:gap-1 mt-1 md:mt-0">
            <span className="flex items-center h-9 text-[20px] md:text-[22px] font-extrabold text-red-500">
              R
            </span>
            <div
              className={cn(
                "min-w-[2rem] h-9 px-2 text-right",
                "flex items-center justify-end",
                "text-[20px] md:text-[22px] font-extrabold",
                "text-gray-400 bg-white"
              )}
            >
              {rebateDisplay}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
