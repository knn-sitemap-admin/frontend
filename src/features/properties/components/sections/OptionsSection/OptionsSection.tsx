"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Checkbox } from "@/components/atoms/Checkbox/Checkbox";
import { Plus } from "lucide-react";
import { OptionsSectionProps } from "./types";
import OptionCell from "./OptionCell";
import { Button } from "@/components/atoms/Button/Button";
import SafeSelect from "@/shared/components/safe/SafeSelect";

const normalize = (s: string) => s.trim().toLowerCase();
const isEtcLabel = (s: string) =>
  ["직접입력", "기타", "etc"].includes(normalize(s));
const arrShallowEqual = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
const dedupNormalized = (items: readonly string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of items) {
    const t = v.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
};

const SPLIT_RE = /[,\n;/]+/;

export default function OptionsSection({
  PRESET_OPTIONS,
  options,
  setOptions,
  etcChecked,
  setEtcChecked,
  optionEtc,
  setOptionEtc,
  kitchenLayout,
  setKitchenLayout,
  fridgeSlot,
  setFridgeSlot,
  sofaSize,
  setSofaSize,
  livingRoomView,
  setLivingRoomView,
}: OptionsSectionProps) {
  const safeOptions = Array.isArray(options) ? options.map(String) : [];
  const safeSetOptions =
    typeof setOptions === "function" ? setOptions : (_: string[]) => {};
  const safeSetEtcChecked =
    typeof setEtcChecked === "function" ? setEtcChecked : (_: boolean) => {};
  const safeOptionEtc = typeof optionEtc === "string" ? optionEtc : "";
  const safeSetOptionEtc =
    typeof setOptionEtc === "function" ? setOptionEtc : (_: string) => {};

  // ----- 프리셋 / 커스텀 분리 -----
  const PRESETS_NO_ETC = PRESET_OPTIONS.filter((op) => !isEtcLabel(op));
  const presetSet = new Set(PRESETS_NO_ETC.map((v) => normalize(v)));

  const presetSelected = safeOptions.filter((v) => presetSet.has(normalize(v)));
  const customFromOptions = safeOptions.filter(
    (v) => !presetSet.has(normalize(v))
  );

  // optionEtc 쪽에서도 커스텀 후보 추출
  const customFromOptionEtc: string[] =
    typeof safeOptionEtc === "string"
      ? safeOptionEtc
          .split(SPLIT_RE)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

  // ----- 로컬 입력 필드 상태 (한 번만 초기화) -----
  const [customInputs, setCustomInputs] = useState<string[]>(() => {
    const merged = dedupNormalized([
      ...customFromOptions,
      ...customFromOptionEtc,
    ]);
    return merged.length > 0 ? merged : [""]; // 최소 1칸
  });

  const [etcOn, setEtcOn] = useState<boolean>(() => {
    const hasCustom =
      customFromOptions.length > 0 || customFromOptionEtc.length > 0;
    return Boolean(etcChecked || hasCustom);
  });

  // 부모(useEditForm)에서 옵션 초기값을 나중에 채워줬을 때 한 번 더 동기화
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;

    const presetSetLocal = new Set(
      PRESET_OPTIONS.filter((op) => !isEtcLabel(op)).map((v) => normalize(v))
    );

    const latestCustomFromOptions = safeOptions.filter(
      (v) => !presetSetLocal.has(normalize(v))
    );

    const latestCustomFromOptionEtc: string[] =
      typeof safeOptionEtc === "string"
        ? safeOptionEtc
            .split(SPLIT_RE)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

    const hasCustom =
      latestCustomFromOptions.length > 0 ||
      latestCustomFromOptionEtc.length > 0;
    const shouldHydrate = Boolean(etcChecked || hasCustom);

    if (!shouldHydrate) return;

    const merged = dedupNormalized([
      ...latestCustomFromOptions,
      ...latestCustomFromOptionEtc,
    ]);

    setCustomInputs(merged.length > 0 ? merged : [""]);
    setEtcOn(true);
    safeSetEtcChecked(true);

    hydratedRef.current = true;
  }, [
    etcChecked,
    safeOptions,
    PRESET_OPTIONS,
    safeOptionEtc,
    safeSetEtcChecked,
  ]);

  // ref로 현재 customInputs 보관 (commitSync에서 사용)
  const customInputsRef = useRef<string[]>(customInputs);
  useEffect(() => {
    customInputsRef.current = customInputs;
  }, [customInputs]);

  /** ===== 부모와 동기화: 디바운스 & 커밋 시점만 ===== */
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSync = useCallback(
    (nextCustomInputs: string[]) => {
      const uniqCustoms = dedupNormalized(nextCustomInputs);
      const customsNotPreset = uniqCustoms.filter(
        (t) => !presetSet.has(t.toLowerCase())
      );

      // options 배열: 프리셋 + 커스텀
      const nextOptions = [...presetSelected, ...customsNotPreset];
      if (!arrShallowEqual(safeOptions, nextOptions)) {
        safeSetOptions(nextOptions);
      }

      // optionEtc 문자열: 커스텀 옵션들을 ", " 로 합치기
      const extraText = customsNotPreset.join(", ");
      safeSetOptionEtc(extraText);
    },
    [presetSelected, presetSet, safeOptions, safeSetOptions, safeSetOptionEtc]
  );

  const syncOptionsDebounced = useCallback(
    (nextCustomInputs: string[]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        flushSync(nextCustomInputs);
      }, 200);
    },
    [flushSync]
  );

  const commitSync = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    flushSync(customInputsRef.current);
  }, [flushSync]);

  /** 프리셋 토글 */
  const togglePreset = useCallback(
    (op: string) => {
      const isOn = safeOptions.includes(op);
      const next = isOn
        ? safeOptions.filter((x) => x !== op)
        : [...safeOptions, op];
      if (!arrShallowEqual(safeOptions, next)) {
        safeSetOptions(next);
      }
    },
    [safeOptions, safeSetOptions]
  );

  const toBool = (v: any, cur: boolean): boolean => {
    if (typeof v === "boolean") return v;
    if (v === "indeterminate") return true;
    if (v === "on") return !cur;
    if (v && typeof v === "object" && "target" in v) {
      const checked = (v as any)?.target?.checked;
      if (typeof checked === "boolean") return checked;
    }
    return !cur;
  };

  /** 직접입력 토글 */
  const toggleEtc = useCallback(
    (val: any) => {
      const next = toBool(val, etcOn);
      if (next === etcOn) return;

      setEtcOn(next);
      safeSetEtcChecked(next);

      if (!next) {
        // 직접입력 OFF → 커스텀 옵션 제거
        setCustomInputs([""]); // 인풋 리셋
        safeSetOptionEtc(""); // extraOptionsText도 비우기

        if (!arrShallowEqual(safeOptions, presetSelected)) {
          safeSetOptions(presetSelected);
        }
        return;
      } else {
        // 켤 때 입력칸이 없으면 하나 만들기
        setCustomInputs((prev) => (prev.length === 0 ? [""] : prev));
        syncOptionsDebounced(customInputsRef.current);
      }
    },
    [
      etcOn,
      safeSetEtcChecked,
      safeOptions,
      presetSelected,
      safeSetOptions,
      syncOptionsDebounced,
      safeSetOptionEtc,
    ]
  );

  /** 입력칸 조작 */
  const addCustomFieldAfter = useCallback(
    (index?: number) => {
      if (!etcOn) {
        setEtcOn(true);
        safeSetEtcChecked(true);
        setCustomInputs((prev) => (prev.length === 0 ? [""] : prev));
      }
      setCustomInputs((prev) => {
        const copy = [...prev];
        const insertAt = typeof index === "number" ? index + 1 : copy.length;
        copy.splice(insertAt, 0, "");
        return copy;
      });
    },
    [etcOn, safeSetEtcChecked]
  );

  const removeCustomField = useCallback(
    (idx: number) => {
      setCustomInputs((prev) => {
        const copy = [...prev];
        copy.splice(idx, 1);

        // ✅ 모든 칸을 X 눌러서 "하나도 안 남았을 때"만 직접입력 자동 OFF
        if (copy.length === 0) {
          setEtcOn(false);
          safeSetEtcChecked(false);
          safeSetOptionEtc("");
        }

        syncOptionsDebounced(copy);
        return copy;
      });
    },
    [syncOptionsDebounced, safeSetEtcChecked, safeSetOptionEtc]
  );

  // IME 안전: 로컬만 즉시 업데이트, 부모는 디바운스
  const handleCustomChangeLocal = useCallback(
    (idx: number, val: string) => {
      setCustomInputs((prev) => {
        const next = [...prev];
        if (next[idx] === val) return prev;
        next[idx] = val;
        syncOptionsDebounced(next);
        return next;
      });
    },
    [syncOptionsDebounced]
  );

  /** 2칸씩 나누어 행 구성 */
  const rows: Array<[string | undefined, string | undefined]> = useMemo(() => {
    const r: Array<[string | undefined, string | undefined]> = [];
    for (let i = 0; i < customInputs.length; i += 2) {
      r.push([customInputs[i], customInputs[i + 1]]);
    }
    return r;
  }, [customInputs]);

  const CELL_W_BASE = "w-[112px]";
  const CELL_W_MD = "md:w-[220px]";
  const INPUT_W_BASE = "w-[104px]";
  const INPUT_W_MD = "md:w-[180px]";

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">옵션</div>

      {/* 프리셋 옵션 체크박스 */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {PRESETS_NO_ETC.map((op) => (
          <label key={op} className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={safeOptions.includes(op)}
              onCheckedChange={() => togglePreset(op)}
            />
            <span className="text-sm">{op}</span>
          </label>
        ))}
      </div>

      {/* Enum 선택 필드 4개 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">주방구조</label>
          <SafeSelect
            value={kitchenLayout ?? null}
            onChange={(v) => setKitchenLayout?.(v as any)}
            items={[
              { value: "G", label: "ㄱ" },
              { value: "D", label: "ㄷ" },
              { value: "LINE", label: "일자" },
            ]}
            placeholder="선택"
            className="h-9 text-sm"
            contentClassName="z-[1200]"
            allowUnset
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">냉장고자리</label>
          <SafeSelect
            value={fridgeSlot ?? null}
            onChange={(v) => setFridgeSlot?.(v as any)}
            items={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
            placeholder="선택"
            className="h-9 text-sm"
            contentClassName="z-[1200]"
            allowUnset
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">쇼파자리</label>
          <SafeSelect
            value={sofaSize ?? null}
            onChange={(v) => setSofaSize?.(v as any)}
            items={[
              { value: "SEAT_2", label: "2인" },
              { value: "SEAT_3", label: "3인" },
              { value: "SEAT_4", label: "4인" },
            ]}
            placeholder="선택"
            className="h-9 text-sm"
            contentClassName="z-[1200]"
            allowUnset
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">거실뷰</label>
          <SafeSelect
            value={livingRoomView ?? null}
            onChange={(v) => setLivingRoomView?.(v as any)}
            items={[
              { value: "OPEN", label: "뻥뷰" },
              { value: "NORMAL", label: "평범" },
              { value: "BLOCKED", label: "막힘" },
            ]}
            placeholder="선택"
            className="h-9 text-sm"
            contentClassName="z-[1200]"
            allowUnset
          />
        </div>
      </div>

      {/* 직접입력 영역 */}
      <div className="space-y-2">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] md:grid-cols-[auto_220px_220px_auto] gap-x-4 md:gap-x-7 gap-y-2 items-center">
          {etcOn ? (
            <>
              {rows.length === 0 ? (
                <>
                  {/* 첫 행 + 빈 입력칸 1개 */}
                  <div className="min-h-9 flex items-center">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <Checkbox checked={etcOn} onCheckedChange={toggleEtc} />
                      <span
                        className="text-sm select-none cursor-pointer whitespace-nowrap"
                        onClick={() => toggleEtc(!etcOn)}
                      >
                        직접입력
                      </span>
                    </label>
                  </div>
                  <OptionCell
                    value={""}
                    index={0}
                    placeholder="예: 노트북"
                    onChangeLocal={handleCustomChangeLocal}
                    onCommit={commitSync}
                    onRemove={removeCustomField}
                    onAddAfter={addCustomFieldAfter}
                    cellWidthBase={CELL_W_BASE}
                    cellWidthMd={CELL_W_MD}
                    inputWidthBase={INPUT_W_BASE}
                    inputWidthMd={INPUT_W_MD}
                  />
                  <div className={`h-9 ${CELL_W_BASE} ${CELL_W_MD}`} />
                  <div className="flex items-center justify-start">
                    <Button
                      type="button"
                      onClick={() => addCustomFieldAfter(0)}
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:text-blue-600 hover:bg-transparent"
                      title="입력칸 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                rows.map((pair, rowIdx) => {
                  const isFirstRow = rowIdx === 0;
                  const isLastRow = rowIdx === rows.length - 1;
                  const [v1, v2] = pair;
                  const baseIndex = rowIdx * 2;
                  const rowKey = `row-${rowIdx}`;

                  return (
                    <Fragment key={rowKey}>
                      <div className="min-h-9 flex items-center">
                        {isFirstRow ? (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={etcOn}
                              onCheckedChange={toggleEtc}
                            />
                            <span
                              className="text-sm select-none cursor-pointer whitespace-nowrap"
                              onClick={() => toggleEtc(!etcOn)}
                            >
                              직접입력
                            </span>
                          </label>
                        ) : (
                          <div className="h-9" />
                        )}
                      </div>

                      <OptionCell
                        value={v1 ?? ""}
                        index={baseIndex}
                        placeholder="예: 노트북"
                        onChangeLocal={handleCustomChangeLocal}
                        onCommit={commitSync}
                        onRemove={removeCustomField}
                        onAddAfter={addCustomFieldAfter}
                        cellWidthBase={CELL_W_BASE}
                        cellWidthMd={CELL_W_MD}
                        inputWidthBase={INPUT_W_BASE}
                        inputWidthMd={INPUT_W_MD}
                      />

                      {v2 !== undefined ? (
                        <OptionCell
                          value={v2}
                          index={baseIndex + 1}
                          placeholder="예: 데스크탑"
                          onChangeLocal={handleCustomChangeLocal}
                          onCommit={commitSync}
                          onRemove={removeCustomField}
                          onAddAfter={addCustomFieldAfter}
                          cellWidthBase={CELL_W_BASE}
                          cellWidthMd={CELL_W_MD}
                          inputWidthBase={INPUT_W_BASE}
                          inputWidthMd={INPUT_W_MD}
                        />
                      ) : (
                        <div className={`h-9 ${CELL_W_BASE} ${CELL_W_MD}`} />
                      )}

                      {isLastRow ? (
                        <div className="flex items-center justify-start">
                          <Button
                            type="button"
                            onClick={() =>
                              addCustomFieldAfter(
                                baseIndex + (v2 !== undefined ? 1 : 0)
                              )
                            }
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-blue-600 hover:bg-transparent"
                            title="입력칸 추가"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div />
                      )}
                    </Fragment>
                  );
                })
              )}
            </>
          ) : (
            <>
              <div className="min-h-9 flex items-center">
                <label className="inline-flex items-center gap-2 text-sm">
                  <Checkbox checked={etcOn} onCheckedChange={toggleEtc} />
                  <span
                    className="text-sm select-none cursor-pointer whitespace-nowrap"
                    onClick={() => toggleEtc(!etcOn)}
                  >
                    직접입력
                  </span>
                </label>
              </div>
              <div className={`h-9 ${CELL_W_BASE} ${CELL_W_MD}`} />
              <div className={`h-9 ${CELL_W_BASE} ${CELL_W_MD}`} />
              <div className="h-9" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
