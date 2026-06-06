"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import PinTypeSelect from "./components/PinTypeSelect";
import BuildingGradeSegment from "./components/BuildingGradeSegment";
import { Button } from "@/components/atoms/Button/Button";
import StarsRating from "@/components/molecules/StarsRating";
import { HeaderSectionProps } from "./types";
import { asControlled } from "@/features/properties/lib/forms/asControlled";
import { BuildingGrade } from "@/features/properties/types/building-grade";

type UiGrade = "" | "new" | "old";

function toUiGrade(grade: BuildingGrade | null | undefined): UiGrade {
  if (grade == null) return "";
  const s = String(grade).toLowerCase();
  if (s === "new") return "new";
  if (s === "old") return "old";
  return "";
}

export default function HeaderSection(
  props: HeaderSectionProps & {
    /** 신축/구옥: "new" | "old" | null (null = 미선택) */
    buildingGrade?: BuildingGrade | null;
    setBuildingGrade?: (v: BuildingGrade | null) => void;
    /** 헤더에서 입력받는 리베이트(만원 단위) */
    rebate?: string | number | null;
    setRebate?: (v: string | number | null) => void;
    /** 답사예정핀일 때 true → 신축/구옥 + 별 + 리베이트 막기 */
    isVisitPlanPin?: boolean;
    showValidationErrors?: boolean;
    /** ✅ manager/admin 전용: true일 때만 '입주완료' 옵션 노출 */
    showCompletedOption?: boolean;
  }
) {
  const {
    title,
    setTitle,
    parkingGrade,
    setParkingGrade,
    placeholderHint,
    pinKind,
    setPinKind,
    buildingGrade: _buildingGrade,
    setBuildingGrade: _setBuildingGrade,
    rebate,
    setRebate,
    isVisitPlanPin,
    showValidationErrors,
    showCompletedOption = false,
  } = props;

  const placeholder = placeholderHint ?? "예: 성수 리버뷰 84A";
  const gradeNum = parkingGrade ? Number(parkingGrade) : 0;

  /** 답사예정일 때 매물평점 비활성화 */
  const ratingDisabled = !!isVisitPlanPin;
  const rebateDisabled = false; // 답사예정지 등록 시에도 리베이트 입력 가능
  const buildingGradeDisabled = !!isVisitPlanPin;

  /** ───────── 신축/구옥: 로컬 상태 + 외부 동기화 ───────── */
  const [uiValue, setUiValue] = React.useState<UiGrade>(() =>
    toUiGrade(_buildingGrade)
  );

  // 외부에서 buildingGrade가 바뀌면 로컬 상태도 맞춰줌
  React.useEffect(() => {
    setUiValue(toUiGrade(_buildingGrade));
  }, [_buildingGrade]);

  const setBuildingGrade =
    typeof _setBuildingGrade === "function"
      ? _setBuildingGrade
      : (_: BuildingGrade | null) => {};

  const handleUiChange = (v: UiGrade) => {
    if (buildingGradeDisabled) return; // 🔹 답사예정 모드에서는 무시

    // 1) 로컬 UI 상태 먼저 갱신 → 바로 파란색 옮겨감
    setUiValue(v);

    // 2) 부모 폼 상태도 함께 동기화
    if (!v) {
      setBuildingGrade(null);
    } else {
      setBuildingGrade(v as BuildingGrade);
    }
  };

  // PinTypeSelect 에 넘길 grade (없으면 null)
  const buildingGradeForPinSelect: BuildingGrade | null =
    uiValue === "" ? null : (uiValue as BuildingGrade);

  /** ───────── 리베이트 입력 (setRebate 없을 때 fallback 상태) ───────── */
  const [fallbackRebate, setFallbackRebate] = React.useState<string>("");

  // ✅ 답사예정으로 전환될 때 값 초기화 (신축/구옥 + 별점 + 리베이트)
  const prevIsVisitPlanRef = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    const prev = prevIsVisitPlanRef.current;
    const current = !!isVisitPlanPin;

    // 일반핀(false) → 답사예정(true)으로 바뀌는 순간에만 초기화
    if (current && prev === false) {
      // 신축/구옥 초기화
      setUiValue("");
      setBuildingGrade(null);
      // 별점 초기화
      setParkingGrade("" as HeaderSectionProps["parkingGrade"]);
      // 리베이트는 초기화하지 않음 (답사예정지 등록 시에도 입력 가능)
    }

    prevIsVisitPlanRef.current = current;
  }, [isVisitPlanPin, setBuildingGrade, setParkingGrade, setRebate]);

  const rebateDisplay = setRebate
    ? rebate == null
      ? ""
      : String(rebate)
    : fallbackRebate;

  const handleChangeRebate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (rebateDisabled) return;

    const raw = e.currentTarget.value;

    // 부모가 상태를 관리해주는 경우 (HeaderContainer → useEditForm.rebateRaw)
    if (setRebate) {
      // 빈 문자열이면 null 로
      setRebate(raw.trim() === "" ? null : raw);
      return;
    }

    // 부모가 setRebate를 안 넘겨준 경우 → 로컬 상태만 업데이트
    setFallbackRebate(raw);
  };

  // 🚨 에러 상태 정의
  const titleError = showValidationErrors && !title?.trim();
  const rebateError = showValidationErrors && !isVisitPlanPin && !rebateDisabled && !rebateDisplay.trim();
  const buildingGradeError = showValidationErrors && !buildingGradeDisabled && !_buildingGrade;
  const hasHeaderError = titleError || rebateError || buildingGradeError;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b supports-[backdrop-filter]:bg-white/70">
      <div
        className={cn(
          "flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-2 gap-y-3.5 px-3 md:px-4 pt-2.5 pb-3 min-w-0 transition-all duration-300"
        )}
      >
        {/* 1) 신축/구옥 — 답사예정일 때만 비활성화 */}
        <div
          className={cn(
            "order-1 flex-shrink-0 flex flex-col items-start",
            buildingGradeDisabled && "pointer-events-none opacity-60"
          )}
        >
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1">
              <BuildingGradeSegment value={uiValue} onChange={handleUiChange} />
              <span className="text-red-500 font-bold text-base">*</span>
            </div>
            
            {/* 🔹 절대위치 대신 흐름에 따라 렌더링 (개행 시 겹침 방지) */}
            {buildingGradeError && (
              <span className="mt-0.5 text-red-500 text-[10px] font-bold whitespace-nowrap animate-pulse shrink-0">
                선택필수!
              </span>
            )}
          </div>
        </div>

        {/* 2) 핀선택 — 모바일에서는 2열의 첫 번째로 이동하여 폭 확보 */}
        <div className="order-4 md:order-2 flex-shrink-0">
          <PinTypeSelect
            value={pinKind ?? null}
            onChange={(v) => setPinKind(v)}
            className="h-9 w-[135px] md:w-[160px]"
            placeholder="핀선택"
            buildingGrade={buildingGradeForPinSelect}
            showCompleted={showCompletedOption}
          />
        </div>

        {/* 3) 매물평점 + (모바일용) 리베이트 — 모바일에서 1열의 우측으로 재배치 */}
        <div className="order-2 md:order-3 flex-shrink-0 flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-[15px] md:text-[16px] font-semibold whitespace-nowrap",
              ratingDisabled ? "text-gray-400" : "text-gray-800"
            )}
          >
            평점
          </span>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center",
                ratingDisabled && "pointer-events-none opacity-60"
              )}
            >
              <StarsRating
                value={gradeNum}
                onChange={
                  ratingDisabled
                    ? () => {}
                    : (n: number) =>
                        setParkingGrade(
                          n && n >= 1 && n <= 5
                            ? (String(n) as HeaderSectionProps["parkingGrade"])
                            : ("" as HeaderSectionProps["parkingGrade"])
                        )
                }
                className="leading-none antialiased"
              />
              {gradeNum > 0 && (
                <Button
                  type="button"
                  onClick={() =>
                    !ratingDisabled &&
                    setParkingGrade("" as HeaderSectionProps["parkingGrade"])
                  }
                  variant="plain"
                  size="icon"
                  className="ml-1 h-8 w-8 rounded-full"
                  title="별점 초기화"
                >
                  <RefreshCw className="h-4 w-4 text-gray-600" />
                </Button>
              )}
            </div>

            {/* 🔹 모바일 전용 리베이트: 별점 바로 오른쪽 */}
            <div className="flex flex-col items-start md:hidden">
              <div
                className={cn(
                  "flex items-center gap-1 ml-1",
                  rebateDisabled && "pointer-events-none opacity-60"
                )}
              >
                <span className="text-[18px] font-extrabold text-red-500 leading-none flex items-center shrink-0">
                  R<span className="text-xs font-bold ml-0.5 relative -top-0.5">*</span>
                </span>
                <input
                  value={rebateDisplay}
                  onChange={handleChangeRebate}
                  placeholder="R"
                  className={cn(
                    "w-11 h-9 rounded-md border px-1 text-xs text-right shrink-0 transition-colors",
                    rebateError
                      ? "border-red-500 ring-1 ring-red-500 bg-red-50 text-red-600 placeholder:text-red-300"
                      : "outline-none focus:ring-2 focus:ring-red-200 text-red-500 font-semibold"
                  )}
                />
              </div>
              {rebateError && (
                <span className="mt-0.5 ml-1 text-red-500 text-[10px] font-bold animate-in slide-in-from-top-1 duration-200 whitespace-nowrap text-right">
                  R 입력필수
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 💡 모바일 2열 보장을 위한 강제 줄바꿈 요소 (order-3 위치에 배치되어 1열을 마감) */}
        <div className="order-3 basis-full h-0 md:hidden" />

        {/* 4) 매물명 — 2열의 두 번째 칸을 차지하여 핀선택창과 함께 2열 완성 */}
        <div className="order-5 md:order-4 flex-1 flex md:w-auto items-start gap-1.5 min-w-0">
          <span className="text-[15px] md:text-[16px] font-semibold text-gray-800 whitespace-nowrap shrink-0 pt-1.5">
            매물명<span className="text-red-500 font-bold">*</span>
          </span>
          <div className="flex flex-col flex-1 relative">
            <input
              value={asControlled(title)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.currentTarget.value)
              }
              placeholder={placeholder}
              className={cn(
                "h-9 w-full rounded-md border px-2 text-sm transition-colors",
                titleError 
                  ? "border-red-500 ring-1 ring-red-500 bg-red-50 placeholder:text-red-300"
                  : "outline-none focus:ring-2 focus:ring-blue-200"
              )}
            />
            {titleError && (
              <p className="mt-0.5 ml-1 text-red-500 text-[10px] font-bold animate-in slide-in-from-top-1 duration-200 whitespace-nowrap">
                매물명 필수
              </p>
            )}
          </div>
        </div>

        {/* 5) 리베이트 R표시 — 데스크톱 전용 */}
        <div
          className={cn(
            "order-6 md:order-5 hidden md:flex flex-col items-start shrink-0 relative",
            rebateDisabled && "pointer-events-none opacity-60"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-[18px] md:text-[20px] font-extrabold text-red-500 leading-none flex items-center">
              R<span className="text-xs font-bold ml-0.5 relative -top-1">*</span>
            </span>
            <input
              value={rebateDisplay}
              onChange={handleChangeRebate}
              placeholder="10"
              className={cn(
                "w-14 h-9 rounded-md border px-2 text-sm text-right transition-colors",
                rebateError
                  ? "border-red-500 ring-1 ring-red-500 bg-red-50 text-red-600 placeholder:text-red-300"
                  : "outline-none focus:ring-2 focus:ring-red-200 text-red-500 font-semibold"
              )}
            />
          </div>
          {rebateError && (
            <span className="mt-0.5 text-red-500 text-[10px] font-bold animate-in slide-in-from-top-1 duration-200 whitespace-nowrap text-right w-full pr-1">
              입력 필수
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
