import { api } from "@/shared/api/api";
import { convertToWebP } from "@/shared/utils/image";

/** 업로드 도메인 */
export type UploadDomain = "map" | "contracts" | "board" | "profile" | "etc";
const DOMAINS: UploadDomain[] = ["map", "contracts", "board", "profile", "etc"];

/** 허용 확장자 / 용량 / 분할 업로드 설정 */
export const ALLOWED_FILE_EXTS = new Set<string>([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "hwp",
  "hwpx",
]);

export const MAX_FILES_PER_REQUEST = 10; // 서버 FilesInterceptor('files', 10)
export const MAX_FILES_PER_CARD = 20; // UI 정책
export const MAX_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB ?? 10
);
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/** 업로드 메타 (호환용) */
export type UploadedFileMeta = {
  url?: string;
  storageKey?: string;
  key?: string;
  fileKey?: string;
  path?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
};

/** 백엔드 응답 타입 (Nest 코드 기준 추정) */
type UploadResponseOk = {
  message?: string;
  data: {
    urls: string[];
    keys?: string[]; // 옵션
    domain: UploadDomain;
    userId: string; // 서버가 string으로 반환
  };
};

const toExt = (f: File): string => {
  const n = f.name || "";
  return n.includes(".") ? n.split(".").pop()!.toLowerCase() : "";
};

const clampRemain = (remain: number) => (remain < 0 ? 0 : remain);

/** 카드 잔여 용량(remain) 고려한 유효성 검사 */
export function validateFiles(
  files: File[] | FileList,
  remain: number
): { ok: File[]; skipped: { file: File; reason: string }[] } {
  const list = Array.from(files as File[]);
  const ok: File[] = [];
  const skipped: { file: File; reason: string }[] = [];
  const limit = clampRemain(remain);

  for (const f of list) {
    if (ok.length >= limit) {
      skipped.push({
        file: f,
        reason: `카드당 최대 ${MAX_FILES_PER_CARD}장 제한`,
      });
      continue;
    }
    const ext = toExt(f).toLowerCase();
    if (!ALLOWED_FILE_EXTS.has(ext)) {
      skipped.push({
        file: f,
        reason: `허용되지 않은 확장자 (.${ext || "?"})`,
      });
      continue;
    }
    if (f.size > MAX_SIZE_BYTES) {
      skipped.push({
        file: f,
        reason: `파일 크기 초과 (최대 ${MAX_SIZE_MB}MB)`,
      });
      continue;
    }
    ok.push(f);
  }
  return { ok, skipped };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function ensureDomain(d?: UploadDomain): UploadDomain {
  const dom = (d ?? "map") as UploadDomain;
  return (DOMAINS as string[]).includes(dom) ? dom : "map";
}

/* ---------- In-flight dedupe (동일 파일세트+도메인 중복호출 방지) ---------- */
type InflightEntry = {
  promise: Promise<UploadedFileMeta[]>;
  controller: AbortController;
};
const inflight = new Map<string, InflightEntry>();

function filesSignature(domain: UploadDomain, files: File[]): string {
  // 이름/사이즈/mtime을 키로 사용 (내용 해시는 비용 큼)
  const sig = files
    .map((f) => `${f.name}:${f.size}:${(f as any).lastModified ?? ""}`)
    .join("|");
  return `${domain}::${sig}`;
}

function linkAbort(source?: AbortSignal): AbortController {
  const ctrl = new AbortController();
  if (source) {
    const onAbort = () => ctrl.abort(source.reason);
    if (source.aborted) ctrl.abort(source.reason);
    else source.addEventListener("abort", onAbort, { once: true });
  }
  return ctrl;
}

/** /photo/upload 멀티파트 업로드(요청당 10장 자동 분할) → 메타 배열 반환 */
export async function uploadPhotos(
  files: File[] | FileList,
  opts?: {
    domain?: UploadDomain;
    /** 0~1의 진행률 (배치 기준 누적) */
    onProgress?: (progress: number) => void;
  },
  signal?: AbortSignal
): Promise<UploadedFileMeta[]> {
  const all: File[] = Array.from(files as File[]);
  const domain: UploadDomain = ensureDomain(opts?.domain);
  if (all.length === 0) return [];

  //  중복 호출 디듀프: 동일 세트면 기존 Promise 재사용
  const key = filesSignature(domain, all);
  const existed = inflight.get(key);
  if (existed) {
    return existed.promise;
  }

  const controller = linkAbort(signal);

  const batches = chunk<File>(all, MAX_FILES_PER_REQUEST);
  const totalBatches = batches.length;
  const metas: UploadedFileMeta[] = [];

  // 배치별 진행률 누적 계산
  const report = (batchIndex: number, inner = 1) => {
    if (!opts?.onProgress) return;
    const base = batchIndex / totalBatches;
    const step = (1 / totalBatches) * inner;
    const p = Math.min(1, base + step);
    opts.onProgress(p);
  };

  const work = (async () => {
    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const fd = new FormData();
        // ✅ WebP 변환 병렬 처리
        const processedBatch = await Promise.all(
          batch.map(f => convertToWebP(f))
        );

        processedBatch.forEach((f: File) => {
          // Safari 대응: 파일 이름이 없거나 확장자가 누락되는 경우를 대비해 이름을 명시
          const fileName = f.name || `image_${Date.now()}.webp`;
          fd.append("files", f, fileName);
        });

        const { data } = await api.post<UploadResponseOk>(
          `/photo/upload?domain=${encodeURIComponent(domain)}`,
          fd,
          {
            withCredentials: true,
            signal: controller.signal,
            onUploadProgress: (e) => {
              if (!opts?.onProgress || !e.total) return;
              const inner = Math.min(1, e.loaded / e.total);
              report(i, inner);
            },
          }
        );

        // 다른 가능한 URL 필드 확인
        if (data?.data) {
          Object.entries(data.data).forEach(([key, value]) => {
            if (
              typeof value === "string" &&
              (value.startsWith("http") || value.startsWith("s3://"))
            ) {
            } else if (
              Array.isArray(value) &&
              value.length > 0 &&
              typeof value[0] === "string" &&
              (value[0].startsWith("http") || value[0].startsWith("s3://"))
            ) {
            }
          });
        }

        const ok = data?.data;
        const urls: string[] = Array.isArray(ok?.urls) ? ok!.urls : [];
        const keysArr: string[] = Array.isArray(ok?.keys) ? ok!.keys : [];

        // ✅ keys 길이 불일치/부재를 안전 처리
        // s3:// 형태의 URL은 브라우저에서 접근 불가하므로 필터링
        urls.forEach((u, idx) => {
          const k = keysArr[idx]; // 없으면 undefined

          // s3:// 형태의 URL인 경우, key를 사용해서 접근 가능한 URL 생성 시도
          // 또는 백엔드가 제공하는 다른 접근 가능한 URL 필드 확인 필요
          let accessibleUrl = u;

          // s3:// 형태의 URL이면 key를 사용 (나중에 프리사인 URL 생성 필요할 수 있음)
          if (u.startsWith("s3://") && k) {
            console.warn(
              `⚠️ s3:// 형태의 URL 감지. key="${k}"를 사용하거나 프리사인 URL이 필요합니다.`
            );
            // 일단 key를 저장하지만, 실제로는 백엔드에서 접근 가능한 URL을 제공해야 함
            accessibleUrl = k; // 임시: key 저장 (백엔드에서 프리사인 URL 생성 API 필요)
          }

          metas.push({
            url: accessibleUrl,
            key: k,
            fileKey: k,
            storageKey: k,
          });
        });

        // 배치 완료시 진행률 갱신(안내용)
        report(i + 1, 0);
      }
      // 최종 100%
      if (opts?.onProgress) opts.onProgress(1);
      return metas;
    } catch (err: any) {
      // 부분 성공분은 반환하되, 에러는 위로
      (err as any).partial = metas;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "사진 업로드 중 오류가 발생했습니다.";
      const e = new Error(msg) as any;
      e.cause = err;
      e.partial = metas;
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, { promise: work, controller });
  return work;
}

/** URL 배열만 필요할 때 */
export async function uploadPhotosAndGetUrls(
  files: File[] | FileList,
  opts?: {
    domain?: UploadDomain;
    onProgress?: (progress: number) => void;
  },
  signal?: AbortSignal
): Promise<string[]> {
  const metas = await uploadPhotos(files, opts, signal);
  return metas
    .map((m: UploadedFileMeta) => m.url)
    .filter((u: string | undefined): u is string => typeof u === "string");
}

/** 편의: 단일 파일 업로드 */
export async function uploadOnePhoto(
  file: File,
  opts?: { domain?: UploadDomain; onProgress?: (p: number) => void },
  signal?: AbortSignal
): Promise<UploadedFileMeta | null> {
  const [meta] = await uploadPhotos([file], opts, signal);
  return meta ?? null;
}
