import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosInstance
} from "axios";

/* ────────────────────────────────────────────────────────────
   환경 플래그
   ──────────────────────────────────────────────────────────── */
const DEV_FAKE_MODE = process.env.NEXT_PUBLIC_DEV_FAKE_MODE === "true";

/* ────────────────────────────────────────────────────────────
   Axios 인스턴스 (배포/로컬 백엔드로 직접 요청)
   ──────────────────────────────────────────────────────────── */
const getApiBase = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_API_BASE || "";
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isActuallyLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isMobile || !isActuallyLocal) {
    return "https://backend-prod-production-a562.up.railway.app";
  }
  return process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || "http://localhost:3050";
};
const API_BASE = getApiBase();

// ✅ [인스턴스 파편화 방지] 전역 싱글톤 잠금
const G = (typeof window !== "undefined" ? window : globalThis) as any;
const API_INSTANCE_KEY = "__MASTER_API_INSTANCE__";

if (typeof window !== "undefined") {
  console.log("!!! api.ts Module Initializing !!! ID:", Math.random());
}

let apiInstance = G[API_INSTANCE_KEY] as AxiosInstance;

if (!apiInstance) {
  apiInstance = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
  });
  
  (apiInstance as any).instanceId = "MASTER_API";

  // 모든 요청에 토큰 주입 인터셉터
  apiInstance.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = window.localStorage.getItem("notemap_token");
        const bearer = (token && token !== "undefined" && token !== "null") ? `Bearer ${token}` : null;
        
        if (bearer) {
          config.headers.set("Authorization", bearer);
          apiInstance.defaults.headers.common["Authorization"] = bearer;
        }

        console.log(`[${(apiInstance as any).instanceId}] Request: ${config.url}`, {
          hasAuth: !!config.headers.get("Authorization"),
        });

        if (config.url?.includes("/auth/me")) {
          config.params = { ...config.params, _t: Date.now() };
        }
      }
      return config;
    },
    (err) => Promise.reject(err)
  );

  G[API_INSTANCE_KEY] = apiInstance;
}

export const api = apiInstance;

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("[api baseURL]", api.defaults.baseURL);
}

/* ────────────────────────────────────────────────────────────
   🔒 전역(singleton) inflight Map: HMR/StrictMode에서도 1개만 사용
   ──────────────────────────────────────────────────────────── */
type InflightMap = Map<string, Promise<AxiosResponse>>;
const INFLIGHT_KEY = "__APP__API_INFLIGHT_MAP__";

if (!G[INFLIGHT_KEY]) {
  G[INFLIGHT_KEY] = new Map() as InflightMap;
}
const inflight: InflightMap = G[INFLIGHT_KEY];

/* ────────────────────────────────────────────────────────────
   키 정규화: URL/params를 안정적으로 문자열화
   ──────────────────────────────────────────────────────────── */
function normalizeUrl(url: string) {
  const u = url || "";
  return u.startsWith("/") ? u : `/${u}`;
}

function stableParams(params: Record<string, any> = {}) {
  const entries: [string, string][] = [];

  const push = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((vv) => push(k, vv));
      return;
    }
    if (typeof v === "object") {
      entries.push([k, JSON.stringify(v)]);
    } else {
      entries.push([k, String(v)]);
    }
  };

  Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .forEach((k) => push(k, (params as any)[k]));

  const usp = new URLSearchParams(entries);
  return usp.toString();
}

function keyOf(url: string, params?: any) {
  return `${normalizeUrl(url)}?${stableParams(params ?? {})}`;
}

/* ────────────────────────────────────────────────────────────
   GET single-flight: 동일 url+params 병합 호출
   ──────────────────────────────────────────────────────────── */
export async function getOnce<T = any>(
  url: string,
  config?: { params?: any; signal?: AbortSignal }
): Promise<AxiosResponse<T>> {
  const nu = normalizeUrl(url);
  const key = keyOf(nu, config?.params);

  const existed = inflight.get(key);
  if (existed) return existed as Promise<AxiosResponse<T>>;

  let resolveGate!: (v: AxiosResponse<T>) => void;
  let rejectGate!: (e: any) => void;

  const gate = new Promise<AxiosResponse<T>>((resolve, reject) => {
    resolveGate = resolve;
    rejectGate = reject;
  });

  inflight.set(key, gate as Promise<AxiosResponse>);

  api
    .get<T>(nu, config)
    .then((resp) => resolveGate(resp))
    .catch((err) => rejectGate(err))
    .finally(() => {
      inflight.delete(key);
    });

  return gate;
}

/* ────────────────────────────────────────────────────────────
   /pins/map 전용 세마포어(동시 1회 제한) + getOnce 결합
   ──────────────────────────────────────────────────────────── */
let mapSemaphore = false;

export async function getPinsMapOnce<T = any>(
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<AxiosResponse<T>> {
  if (mapSemaphore) {
    const err = new AxiosError("DROPPED_BY_SEMAPHORE");
    (err as any).code = "E_SEMAPHORE";
    return Promise.reject(err);
  }

  mapSemaphore = true;
  try {
    return await getOnce<T>("/pins/map", { params, signal });
  } finally {
    mapSemaphore = false;
  }
}

/* ────────────────────────────────────────────────────────────
   DEV 경고: GET /pins 탐지 (의도치 않은 호출 추적)
   ──────────────────────────────────────────────────────────── */
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  const url = ((config.baseURL || "") + (config.url || "")).replace(
    /^https?:\/\/[^/]+/,
    ""
  );

  if (method === "GET" && /^\/?pins\/?$/.test(url)) {
    console.warn(
      "[WARN] Unexpected GET /pins detected",
      "\nfrom:\n",
      new Error().stack?.split("\n").slice(2, 8).join("\n")
    );
  }

  return config;
});

/* ────────────────────────────────────────────────────────────
   FAKE 헬퍼 (성공/실패 분리)
   ──────────────────────────────────────────────────────────── */
function makeFakeOk<T>(
  data: T,
  config: InternalAxiosRequestConfig
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  };
}

function makeFakeErr(
  status: number,
  message: string,
  config: InternalAxiosRequestConfig
): AxiosError {
  const resp: AxiosResponse = {
    data: { message },
    status,
    statusText: "ERR",
    headers: {},
    config,
  };
  return new AxiosError(message, undefined, config, undefined, resp);
}

/* ────────────────────────────────────────────────────────────
   유틸: 인증 상태 체크
   ──────────────────────────────────────────────────────────── */
export async function assertAuthed() {
  try {
    const r = await api.get("/auth/me", {
      withCredentials: true,
    });
    console.debug("[AUTH] /me status =", r.status, r.data);
  } catch (e) {
    console.warn("[AUTH] /me fail", e);
  }
}

/* ────────────────────────────────────────────────────────────
   세션 프리플라이트 1회 보장 + 401/419에 한해 1회 재시도
   ──────────────────────────────────────────────────────────── */
let __ensureSessionPromise: Promise<void> | null = null;

async function ensureSessionOnce() {
  if (!__ensureSessionPromise) {
    __ensureSessionPromise = api
      .get("/auth/me", {
        headers: { "x-no-retry": "1" }, // 재시도 인터셉터 안 타게 하는 플래그
        validateStatus: (s) => s >= 200 && s < 500,
        withCredentials: true,
      })
      .then(() => void 0)
      .finally(() => {
        __ensureSessionPromise = null;
      });
  }
  return __ensureSessionPromise;
}

// 요청 전 인터셉터: 토큰 자동 주입 및 세션 관리 (위로 이동됨)

// 응답 후: 401/419에서만 1회 재시도, 그 외엔 재전송 금지
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    if (!config) throw error;

    // 재시도 금지 플래그가 있으면 그대로 throw
    if (config.headers && config.headers["x-no-retry"] === "1") {
      throw error;
    }

    if (
      response &&
      (response.status === 401 || response.status === 419)
    ) {
      if (!config.__retried) {
        config.__retried = true;
        await ensureSessionOnce();

        // ✅ 재시도 직전에 최신 토큰을 한번 더 설정 (config 객체 강제 업데이트)
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("notemap_token");
          if (token) {
            config.headers.set("Authorization", `Bearer ${token}`);
          }
        }
        
        return api.request(config);
      } else {
        // ✅ 재시도 후에도 401/419인 경우: 세션 만료로 판단 (단, 로그인 페이지 자체는 제외)
        if (typeof window !== "undefined" && !config.url?.includes("/signin")) {
          console.warn("[API] Persistent 401 detected. Redirecting to /login...");
          window.location.href = "/login";
        }
      }
    }

    throw error;
  }
);

/* ────────────────────────────────────────────────────────────
   (선택) DEV_FAKE_MODE 사용 예시
   ──────────────────────────────────────────────────────────── */
// if (DEV_FAKE_MODE) {
//   return Promise.resolve(makeFakeOk({ ok: true }, someConfig));
//   // 혹은
//   // throw makeFakeErr(400, "bad request", someConfig);
// }
