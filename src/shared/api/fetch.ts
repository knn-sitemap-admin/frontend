/**
 * 🚀 Fetch 기반 API 클라이언트
 * Axios 보안 이슈 대응을 위해 Native Fetch를 사용하도록 구현되었습니다.
 */

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

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  
  // 1. URL 및 쿼리 파라미터 구성
  let url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // 2. 헤더 설정 (토큰 주입)
  const headers = new Headers(init.headers || {});
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("notemap_token");
    if (token && token !== "undefined" && token !== "null") {
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  }
  
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // 3. 호출
  const response = await fetch(url, {
    ...init,
    headers,
  });

  // 4. 공통 에러 처리 (401 등)
  if (response.status === 401 || response.status === 419) {
    if (typeof window !== "undefined" && !url.includes("/login") && !url.includes("/signin")) {
      console.warn("[API] 401 Unauthorized. Redirecting to /login...");
      // 여기에 세션 갱신 로직을 추가할 수 있습니다.
      // window.location.href = "/login";
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.message || "API 요청 중 오류가 발생했습니다.",
      data: errorData,
    };
  }

  // 5. 결과 반환
  if (response.status === 204) return {} as T;
  return response.json();
}

export const apiFetch = {
  get: <T>(url: string, params?: Record<string, any>, options?: RequestInit) => 
    request<T>(url, { ...options, method: "GET", params }),
    
  post: <T>(url: string, body?: any, options?: RequestInit) => 
    request<T>(url, { ...options, method: "POST", body: JSON.stringify(body) }),
    
  put: <T>(url: string, body?: any, options?: RequestInit) => 
    request<T>(url, { ...options, method: "PUT", body: JSON.stringify(body) }),
    
  patch: <T>(url: string, body?: any, options?: RequestInit) => 
    request<T>(url, { ...options, method: "PATCH", body: JSON.stringify(body) }),
    
  delete: <T>(url: string, options?: RequestInit) => 
    request<T>(url, { ...options, method: "DELETE" }),
};
