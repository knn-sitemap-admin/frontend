"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { X, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { FilterState } from "../types/filterSearch.types";
import {
  formatKoreanCurrency,
  convertPriceToWon,
  convertSalePriceToWon,
} from "../utils/formatters";

type FilterActiveChipsProps = {
  activeFilters: FilterState | null;
  onRemoveFilter: (key: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
};

type ChipItem = {
  key: keyof FilterState;
  label: string;
  category: string; // "방", "실입주금" 등 그룹핑용
  value?: string;
};

export default function FilterActiveChips({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}: FilterActiveChipsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 팝오버 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chips = useMemo<ChipItem[]>(() => {
    if (!activeFilters) return [];

    const list: ChipItem[] = [];

    // 1. 방 (rooms)
    if (Array.isArray(activeFilters.rooms) && activeFilters.rooms.length > 0) {
      activeFilters.rooms.forEach((room) => {
        list.push({
          key: "rooms",
          category: "방",
          label: room,
          value: room,
        });
      });
    }

    // 2. 실입주금 (deposit)
    if (activeFilters.deposit && activeFilters.deposit !== "0" && activeFilters.deposit.trim() !== "") {
      const won = convertPriceToWon(activeFilters.deposit);
      const wonLabel = formatKoreanCurrency(won);
      list.push({
        key: "deposit",
        category: "실입주금",
        label: `~ ${wonLabel}`,
      });
    }

    // 3. 면적 (areaMin / areaMax)
    const hasAreaMin = activeFilters.areaMin && activeFilters.areaMin.trim() !== "";
    const hasAreaMax = activeFilters.areaMax && activeFilters.areaMax.trim() !== "";
    if (hasAreaMin || hasAreaMax) {
      let areaLabel = "";
      if (hasAreaMin && hasAreaMax) {
        areaLabel = `${activeFilters.areaMin}평 ~ ${activeFilters.areaMax}평`;
      } else if (hasAreaMin) {
        areaLabel = `${activeFilters.areaMin}평 ~`;
      } else {
        areaLabel = `~ ${activeFilters.areaMax}평`;
      }
      list.push({
        key: "areaMin",
        category: "면적",
        label: areaLabel,
      });
    }

    // 4. 등기/건물유형 (buildingTypes)
    if (
      Array.isArray(activeFilters.buildingTypes) &&
      activeFilters.buildingTypes.length > 0
    ) {
      activeFilters.buildingTypes.forEach((bt) => {
        list.push({
          key: "buildingTypes",
          category: "등기",
          label: bt,
          value: bt,
        });
      });
    }

    // 5. 엘리베이터 (elevator)
    if (activeFilters.elevator && activeFilters.elevator.trim() !== "") {
      list.push({
        key: "elevator",
        category: "엘리베이터",
        label: activeFilters.elevator,
      });
    }

    // 6. 매매가 (priceMin / priceMax)
    const hasPriceMin = activeFilters.priceMin && activeFilters.priceMin !== "0" && activeFilters.priceMin.trim() !== "";
    const hasPriceMax = activeFilters.priceMax && activeFilters.priceMax !== "0" && activeFilters.priceMax.trim() !== "";
    if (hasPriceMin || hasPriceMax) {
      let priceLabel = "";
      const minWon = convertSalePriceToWon(activeFilters.priceMin || "");
      const maxWon = convertSalePriceToWon(activeFilters.priceMax || "");
      const minLabel = minWon !== "0" ? formatKoreanCurrency(minWon) : "0";
      const maxLabel = maxWon !== "0" ? formatKoreanCurrency(maxWon) : "무제한";

      if (hasPriceMin && hasPriceMax) {
        priceLabel = `${minLabel} ~ ${maxLabel}`;
      } else if (hasPriceMin) {
        priceLabel = `${minLabel} ~`;
      } else {
        priceLabel = `~ ${maxLabel}`;
      }

      list.push({
        key: "priceMin",
        category: "매매가",
        label: priceLabel,
      });
    }

    return list;
  }, [activeFilters]);

  if (chips.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative pointer-events-auto"
      style={{ contain: "layout style" }}
    >
      {/* 🔘 메인 요약 버튼 칩 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
          bg-blue-600 hover:bg-blue-700 border-blue-500 hover:border-blue-600
          text-white text-xs font-semibold shadow-md transition-all duration-200
          active:scale-95 focus:outline-none select-none
        "
      >
        <SlidersHorizontal className="h-3 w-3" />
        <span>필터 {chips.length}개 적용 중</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* 📋 한눈에 확인 가능한 수직 팝오버 박스 */}
      {isOpen && (
        <div
          className="
            absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200/60
            bg-white/95 backdrop-blur-md shadow-2xl p-3.5 z-[99]
            flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200
          "
          style={{ contain: "layout" }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">적용된 필터 목록</span>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setIsOpen(false);
              }}
              className="
                flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-500
                transition-colors focus:outline-none
              "
              title="모든 필터 리셋"
            >
              <RotateCcw className="h-3 w-3" />
              <span>전체 해제</span>
            </button>
          </div>

          {/* Popover Content (적용 조건 수직 리스트) */}
          <div className="flex flex-col gap-2 max-h-[32vh] overflow-y-auto pr-1 no-scrollbar">
            {chips.map((chip, idx) => (
              <div
                key={`${chip.key}-${chip.value ?? idx}`}
                className="
                  flex items-center justify-between gap-3 px-3 py-2 rounded-xl
                  bg-slate-50 border border-slate-150/50 hover:bg-slate-100/70
                  transition-all duration-150
                "
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 leading-none">
                    {chip.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {chip.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onRemoveFilter(chip.key, chip.value);
                    // 남은 칩이 없게 될 것이라면 팝오버도 닫음
                    if (chips.length <= 1) {
                      setIsOpen(false);
                    }
                  }}
                  className="
                    p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60
                    transition-all focus:outline-none
                  "
                  title="해당 조건 제거"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
