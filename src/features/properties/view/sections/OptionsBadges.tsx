"use client";

type OptionsBadgesProps = {
  /** 어댑터에서 넘어오는 옵션 라벨들(예: ["에어컨", "세탁기"]) */
  options?: string[] | null;

  /**
   * 기타 입력(자유 텍스트: "노트북, 컴퓨터" 이런 문자열)
   * - 뷰 레이어에서는 optionEtc 로 주로 쓰임
   * - 백엔드 options.extraOptionsText 를 그대로 넘기는 경우도 고려
   */
  optionEtc?: string | null;
  extraOptionsText?: string | null;
};

const SPLIT_RE = /[,\n;/]+/;
const normalize = (s: string) => s.trim().toLowerCase();

/** 주방구조/냉장고자리/쇼파자리/거실뷰 → 줄바꿈 + mt 로 따로 표시 */
const DETAIL_OPTION_LABELS = new Set([
  "주방구조 ㄱ",
  "주방구조 ㄷ",
  "주방구조 일자",
  "냉장고자리 1",
  "냉장고자리 2",
  "냉장고자리 3",
  "쇼파 2인",
  "쇼파 3인",
  "쇼파 4인",
  "뻥뷰",
  "평범",
  "막힘",
]);

const BADGE_CLASS =
  "inline-flex items-center rounded-full border px-2.5 h-6 text-sm bg-green-50 text-green-700";

export default function OptionsBadges({
  options,
  optionEtc,
  extraOptionsText,
}: OptionsBadgesProps) {
  // 1) 기본 옵션 라벨 정리(문자만, 공백 제거)
  const base: string[] = Array.isArray(options)
    ? options
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0)
    : [];

  // 기본 옵션 중복 제거 (대소문자 무시)
  const seen = new Set<string>();
  const baseDedup: string[] = [];
  for (const label of base) {
    const key = normalize(label);
    if (!seen.has(key)) {
      seen.add(key);
      baseDedup.push(label);
    }
  }

  // 2) 기타 입력 문자열(source: optionEtc 우선, 없으면 extraOptionsText) → 여러 개로 분리 후 추가
  const etcSource =
    typeof optionEtc === "string"
      ? optionEtc
      : typeof extraOptionsText === "string"
      ? extraOptionsText
      : "";

  const extras: string[] = etcSource
    ? etcSource
        .split(SPLIT_RE)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const extrasDedup: string[] = [];
  for (const label of extras) {
    const key = normalize(label);
    // 기본 옵션에 이미 있거나, 이전 extra에 있으면 스킵
    if (seen.has(key)) continue;
    seen.add(key);
    extrasDedup.push(label);
  }

  // 최종 리스트 → 주방/냉장고/쇼파/거실뷰만 줄바꿈 + mt 로 분리
  const list = [...baseDedup, ...extrasDedup];
  const mainOptions = list.filter((op) => !DETAIL_OPTION_LABELS.has(op));
  const detailOptions = list.filter((op) => DETAIL_OPTION_LABELS.has(op));

  const hasAny = mainOptions.length > 0 || detailOptions.length > 0;

  if (!hasAny) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">옵션</span>
        <div className="mt-1 text-muted-foreground">-</div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1">
        <div className="text-sm font-medium">옵션</div>
        {mainOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label="옵션 목록">
            {mainOptions.map((op, i) => (
              <span key={`${op}-${i}`} className={BADGE_CLASS}>
                {op}
              </span>
            ))}
          </div>
        )}
      </div>
      {detailOptions.length > 0 && (
        <div
          className="flex flex-wrap gap-2 pt-4"
          aria-label="주방구조, 냉장고자리, 쇼파자리, 거실뷰"
        >
          {detailOptions.map((op, i) => (
            <span key={`detail-${op}-${i}`} className={BADGE_CLASS}>
              {op}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
