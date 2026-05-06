"use client";

import { useEffect, useState } from "react";
import {
  AUTH_CHANNEL_NAME,
  AuthBroadcastMessage,
} from "@/shared/api/auth/authChannel";
import { Logger } from "@/shared/utils/logger";

/**
 * 백엔드 API base (마지막 슬래시 제거해서 안전하게 사용)
 */
const API_BASE = (
  process.env.NEXT_PUBLIC_IS_DEV === "true" ? "http://localhost:3050" : (process.env.NEXT_PUBLIC_API_BASE || "")
).replace(/\/+$/, "");

/** 세션 백업 폴링 주기 (ms) — 포커스 이벤트가 메인, 이건 서브 */
const DEFAULT_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10분

type Props = {
  children: React.ReactNode;
  /** 로그인 안 된 경우 보낼 경로 (기본값: "/login") */
  redirectTo?: string;
};

/* ─────────────────────────────────────────────
 * 📌 전역 세션 체크: 여러 Guard 인스턴스에서도 /me 한 번만
 * ───────────────────────────────────────────── */

let inFlightSessionCheck: Promise<boolean> | null = null;

async function fetchSessionValid(isRetry = false): Promise<boolean> {
  try {
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (!isRetry && isPWA) {
      // PWA 환경에서는 로컬스토리지/쿠키 로딩 지연 가능성이 있으므로 대기
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const token = window.localStorage.getItem("notemap_token");
    const headers: HeadersInit = {};
    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/auth/me?_t=${Date.now()}`, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
    });

    const isAuthErrorStatus =
      res.status === 401 || res.status === 419 || res.status === 440;

    if (!res.ok) {
      if (!isRetry && isPWA && token) {
        console.warn("[ClientSessionGuard] 1st check failed on PWA. Retrying in 1.5s...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return fetchSessionValid(true);
      }
      return !isAuthErrorStatus; 
    }

    const json = await res.json().catch(() => null);
    const hasUser = !!json?.data;

    if (isAuthErrorStatus || !hasUser) return false;
    return true;
  } catch (error: any) {
    // 네트워크 에러 (백엔드 서버가 실행되지 않았거나 연결 불가)
    Logger.error("세션 확인 실패:", error);
    Logger.error(`백엔드 서버(${API_BASE})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`);
    // 개발 환경에서는 에러를 던지지 않고 false 반환 (로그인 페이지로 리다이렉트)
    return false;
  }
}

/** 여러 곳에서 동시에 호출돼도 실제 네트워크는 1번만 */
function ensureSessionCheck(): Promise<boolean> {
  if (!inFlightSessionCheck) {
    inFlightSessionCheck = fetchSessionValid().finally(() => {
      inFlightSessionCheck = null;
    });
  }
  return inFlightSessionCheck;
}

/* ───────────────────────────────────────────── */

export default function ClientSessionGuard({
  children,
  redirectTo = "/login",
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;
    let destroyed = false;
    let timerId: number | undefined;
    let channel: BroadcastChannel | undefined;

    const handleForceLogout = async (skipApiCall = false) => {
      if (!mounted) return;

      if (!skipApiCall) {
        try {
          await fetch(`${API_BASE}/auth/signout`, {
            method: "POST",
            credentials: "include",
          });
        } catch {
          // ignore
        }
      }

      setReady(false);
      window.location.assign(redirectTo);
    };

    const checkSession = async () => {
      if (destroyed) return;

      const ok = await ensureSessionCheck();

      if (!mounted || destroyed) return;

      if (!ok) {
        // 토큰이 남아있는데도 실패한 경우를 위해 한 번 더블체크
        const hasToken = !!window.localStorage.getItem("notemap_token");
        const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
        
        if (isPWA && hasToken) {
          console.warn("[ClientSessionGuard] Proceeding as ready despite failure due to PWA persistent token.");
          setReady(true);
          return;
        }

        await handleForceLogout(true); // 이미 로그아웃된 상태라면 API 호출을 건너뛰고 리다이렉트
        return;
      }

      // ✅ 로그인된 상태
      setReady(true);
    };

    // 1) BroadcastChannel: 다른 탭에서 LOGOUT 브로드캐스트 수신
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
        if (!event?.data) return;
        if (event.data.type === "LOGOUT") {
          void handleForceLogout();
        }
      };
    }

    // 2) 포커스 / visibilitychange 시 세션 다시 확인
    const onFocus = () => {
      void checkSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 3) 백업용 폴링
    if (DEFAULT_POLL_INTERVAL_MS > 0) {
      timerId = window.setInterval(() => {
        void checkSession();
      }, DEFAULT_POLL_INTERVAL_MS);
    }

    // 처음 마운트될 때 한 번 체크
    void checkSession();

    return () => {
      mounted = false;
      destroyed = true;
      if (channel) channel.close();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerId) window.clearInterval(timerId);
    };
  }, [redirectTo]);

  if (!ready) return null;
  return <>{children}</>;
}
