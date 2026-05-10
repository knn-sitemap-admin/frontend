"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Field from "@/components/atoms/Field/Field";
import { Input } from "@/components/atoms/Input/Input";
import PillRadioGroup from "@/components/atoms/PillRadioGroup";
import PillCheckboxGroup from "@/components/atoms/PillCheckboxGroup";
import type {
  Grade,
  BuildingType,
} from "@/features/properties/types/property-domain";
import type { CompletionRegistrySectionProps } from "./types";
import ElevatorSegment from "../HeaderSection/components/ElevatorSegment";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { Button } from "@/components/atoms/Button/Button";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";

/** ───────── 상수/타입 ───────── */
const SLOPE_GRADES = ["좋음", "평범", "복잡"] as const;
const STRUCTURE_GRADES = ["상", "중", "하"] as const;

type SlopeGradeLiteral = (typeof SLOPE_GRADES)[number];
type StructureGradeLiteral = (typeof STRUCTURE_GRADES)[number];

const UI_BUILDING_TYPES = ["주택", "APT", "OP", "도/생", "근/생"] as const;
type UIBuildingType = (typeof UI_BUILDING_TYPES)[number];

/** 라벨 → 백엔드 enum (단일) */
const mapLabelToBackend = (v?: UIBuildingType | null): BuildingType | null => {
  if (!v) return null;
  if (v === "근/생") return "근생";
  if (v === "도/생") return "도생";
  return v as unknown as BuildingType;
};

/** 라벨 배열 → 백엔드 배열 */
const labelsToBackend = (arr: UIBuildingType[]): string[] =>
  arr.map((v) => (v === "근/생" ? "근생" : v === "도/생" ? "도생" : v));

const mapBackendToLabel = (v?: string | null): UIBuildingType | undefined => {
  if (!v) return undefined;
  const raw = String(v).trim();

  // 근생
  if (raw === "근생" || raw === "근/생") return "근/생";

  // 도생
  if (raw === "도생" || raw === "도/생") return "도/생";

  // 주택
  if (raw === "주택") return "주택";

  // 아파트
  if (raw === "APT" || raw === "아파트" || raw.toUpperCase() === "APARTMENT") {
    return "APT";
  }

  // 오피스텔
  if (raw === "OP" || raw === "오피스텔" || raw.toUpperCase() === "OFFICETEL") {
    return "OP";
  }

  return undefined;
};

const backendToLabels = (arr?: (string | null)[] | null): UIBuildingType[] =>
  (Array.isArray(arr) ? arr : [])
    .map(mapBackendToLabel)
    .filter((x): x is UIBuildingType => !!x);

/** ───────── 유틸 ───────── */
const toYmd = (s?: string | null) =>
  typeof s === "string" && s.length >= 10 ? s.slice(0, 10) : (s ?? "") || "";

const softNormalize = (raw: string) => raw.replace(/[^0-9-]/g, "").slice(0, 10);

const finalizeYmd = (raw: string) => {
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
};

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

export default function CompletionRegistrySection({
  completionDate,
  setCompletionDate,
  // (레거시) 최저실입으로 쓰던 필드
  salePrice,
  setSalePrice,
  // (신규) 최저 실입 정수 금액
  minRealMoveInCost,
  setMinRealMoveInCost,
  // ✅ 리베이트 텍스트
  rebateText,
  setRebateText,
  slopeGrade,
  setSlopeGrade,
  structureGrade,
  setStructureGrade,
  buildingType,
  setBuildingType,
  buildingTypes,
  setBuildingTypes,
  elevator,
  setElevator,
  /** ✅ 답사예정 핀 여부 */
  isVisitPlanPin,
  showValidationErrors,
}: CompletionRegistrySectionProps & {
  minRealMoveInCost?: number | string | null;
  setMinRealMoveInCost?: (v: number | string | null) => void;
  rebateText?: string | null;
  setRebateText?: (v: string | null) => void;
  elevator?: "O" | "X" | null;
  setElevator?: (v: "O" | "X" | null) => void;
  isVisitPlanPin?: boolean;
  showValidationErrors?: boolean;
}) {
  /** ── 준공일 ── */
  const [localDate, setLocalDate] = useState<string>(toYmd(completionDate));
  useEffect(() => setLocalDate(toYmd(completionDate)), [completionDate]);

  const commitDate = useCallback(() => {
    const v = finalizeYmd(localDate.trim());
    setCompletionDate(v);
    setLocalDate(toYmd(v));
  }, [localDate, setCompletionDate]);

  /** ── 건물유형 (등기) 다중 선택 ── */
  const arr = buildingTypes ?? (buildingType ? [buildingType] : []);
  const uiSelected = backendToLabels(arr);

  /** ── 최저실입 ── */
  const initialPrice = String(minRealMoveInCost ?? salePrice ?? "");
  const [localPrice, setLocalPrice] = useState<string>(initialPrice);

  useEffect(() => {
    setLocalPrice(initialPrice);
  }, [initialPrice]);

  const onChangePrice = useCallback(
    (raw: string) => {
      const digits = onlyDigits(raw);
      setLocalPrice(digits);

      if (typeof setMinRealMoveInCost === "function") {
        setMinRealMoveInCost(digits === "" ? null : digits);
      } else if (typeof setSalePrice === "function") {
        setSalePrice(digits === "" ? "" : digits);
      }
    },
    [setMinRealMoveInCost, setSalePrice]
  );

  const [localRebate, setLocalRebate] = useState<string>(rebateText ?? "");

  useEffect(() => {
    setLocalRebate(rebateText ?? "");
  }, [rebateText]);

  const onChangeRebate = useCallback(
    (raw: string) => {
      setLocalRebate(raw);
      if (typeof setRebateText === "function") {
        const trimmed = raw.trim();
        setRebateText(trimmed ? trimmed : null);
      }
    },
    [setRebateText]
  );

  /** ── 경사도/구조 ── */
  const onChangeSlope = useCallback(
    (v: SlopeGradeLiteral | undefined) => setSlopeGrade?.(v as Grade | undefined),
    [setSlopeGrade]
  );
  const onChangeStructure = useCallback(
    (v: StructureGradeLiteral | undefined) =>
      setStructureGrade?.(v as Grade | undefined),
    [setStructureGrade]
  );

  /** ✅ 일반핀 → 답사예정 전환 시 초기화 */
  const prevIsVisitRef = useRef<boolean | undefined>(isVisitPlanPin);
  useEffect(() => {
    const prev = prevIsVisitRef.current;

    if (isVisitPlanPin && !prev) {
      setLocalDate("");
      setLocalPrice("");
      setLocalRebate("");

      setCompletionDate("");
      if (typeof setMinRealMoveInCost === "function") {
        setMinRealMoveInCost(null);
      }
      if (typeof setSalePrice === "function") {
        setSalePrice("");
      }

      if (typeof setRebateText === "function") {
        setRebateText(null);
      }

      if (typeof setBuildingType === "function") {
        setBuildingType(null);
      }
      if (typeof setBuildingTypes === "function") {
        setBuildingTypes([]);
      }
    }

    prevIsVisitRef.current = isVisitPlanPin;
  }, [
    isVisitPlanPin,
    setCompletionDate,
    setMinRealMoveInCost,
    setSalePrice,
    setBuildingType,
    setBuildingTypes,
    setRebateText,
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:items-center">
        <Field
          label="진입로/경사도"
          align="center"
          className="min-w-0 sm:col-span-2 md:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <PillRadioGroup
              name="slopeGrade"
              options={SLOPE_GRADES}
              value={
                SLOPE_GRADES.includes(slopeGrade as any)
                  ? (slopeGrade as SlopeGradeLiteral)
                  : undefined
              }
              onChange={onChangeSlope}
            />
            <Input
              className="h-9 w-28"
              placeholder="직접입력"
              value={slopeGrade ?? ""}
              onChange={(e) => setSlopeGrade?.(e.target.value)}
            />
          </div>
        </Field>

        <Field label="구조" align="center" className="min-w-0">
          <PillRadioGroup
            name="structureGrade"
            options={STRUCTURE_GRADES}
            value={structureGrade as StructureGradeLiteral | undefined}
            onChange={onChangeStructure}
          />
        </Field>

        <Field label={<>엘리베이터 <span className="text-red-500 ml-0.5">*</span></>} align="center" className="min-w-0">
          <div className="flex flex-col">
            <ElevatorSegment
              value={elevator ?? null}
              onChange={(next) => {
                if (setElevator) setElevator(next);
              }}
            />
            {showValidationErrors && elevator === null && (
              <p className="text-red-500 text-[11px] mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
                엘리베이터 선택 필수
              </p>
            )}
          </div>
        </Field>

        <Field label="준공일" align="center">
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="numeric"
              value={localDate}
              onChange={(e) => setLocalDate(softNormalize(e.target.value))}
              onBlur={commitDate}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDate();
                }
                if (e.key === "Escape") {
                  setLocalDate(toYmd(completionDate));
                }
              }}
              placeholder="예: 2024-04-14"
              className="h-9 w-32 max-w-full"
              aria-label="준공일 입력(YYYY-MM-DD)"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(1960, 0)}
                  endMonth={new Date(2040, 11)}
                  selected={
                    localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
                      ? parse(localDate, "yyyy-MM-dd", new Date())
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      const formatted = format(date, "yyyy-MM-dd");
                      setLocalDate(formatted);
                      setCompletionDate(formatted);
                    }
                  }}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
        </Field>

        <Field
          label="등기"
          align="center"
          className="min-w-0 sm:col-span-2 md:col-span-1"
        >
          <PillCheckboxGroup
            name="buildingTypes"
            options={UI_BUILDING_TYPES}
            value={uiSelected}
            onChange={(next) => {
              const backend = labelsToBackend(next);
              if (setBuildingTypes) {
                setBuildingTypes(backend);
              } else {
                setBuildingType?.(
                  backend[0] ? (backend[0] as BuildingType) : null
                );
              }
            }}
          />
        </Field>
      </div>

      {/* 최저실입 */}
      <Field label={<>최저실입 <span className="text-red-500 ml-0.5">*</span></>} align="center">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="numeric"
              value={localPrice}
              onChange={(e) => onChangePrice(e.target.value)}
              placeholder="예: 5000"
              className="h-9 w-40"
              aria-label="최저실입(만원)"
            />
            <span className="text-sm text-gray-500">만원</span>
          </div>
          {showValidationErrors && !localPrice.trim() && (
            <p className="text-red-500 text-[11px] mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
              최저실입 금액을 입력해 주세요.
            </p>
          )}
        </div>
      </Field>
    </div>
  );
}
