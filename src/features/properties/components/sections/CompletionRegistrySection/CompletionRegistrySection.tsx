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

/** ───────── 상수/타입 ───────── */
const GRADES = ["상", "중", "하"] as const;
type GradeLiteral = (typeof GRADES)[number];

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
}: CompletionRegistrySectionProps & {
  minRealMoveInCost?: number | string | null;
  setMinRealMoveInCost?: (v: number | string | null) => void;
  rebateText?: string | null;
  setRebateText?: (v: string | null) => void;
  elevator?: "O" | "X" | null;
  setElevator?: (v: "O" | "X" | null) => void;
  isVisitPlanPin?: boolean;
  // buildingType / setBuildingType 는 props 타입에서 이미 들어있다고 가정
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
    (v: GradeLiteral | undefined) => setSlopeGrade?.(v as Grade | undefined),
    [setSlopeGrade]
  );
  const onChangeStructure = useCallback(
    (v: GradeLiteral | undefined) =>
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:items-center">
        <Field label="경사도" align="center" className="min-w-[120px]">
          <PillRadioGroup
            name="slopeGrade"
            options={GRADES}
            value={slopeGrade as GradeLiteral | undefined}
            onChange={onChangeSlope}
          />
        </Field>

        <Field label="구조" align="center" className="min-w-[120px]">
          <PillRadioGroup
            name="structureGrade"
            options={GRADES}
            value={structureGrade as GradeLiteral | undefined}
            onChange={onChangeStructure}
          />
        </Field>

        <Field label="엘리베이터" align="center" className="min-w-[120px]">
          <ElevatorSegment
            value={elevator ?? null}
            onChange={(next) => {
              if (setElevator) setElevator(next);
            }}
          />
        </Field>

        <Field label="준공일" align="center">
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
            className="h-9 w-36 max-w-full"
            aria-label="준공일 입력(YYYY-MM-DD)"
          />
        </Field>

        <Field label="등기" align="center">
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
      <Field label="최저실입" align="center">
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
      </Field>
    </div>
  );
}
