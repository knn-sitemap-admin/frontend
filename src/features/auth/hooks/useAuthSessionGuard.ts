"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/api";
import {
  AUTH_CHANNEL_NAME,
  AuthBroadcastMessage,
} from "@/shared/api/auth/authChannel";

type Options = {
  /** 폴링 주기 (ms). 백업용으로 10~15분 추천. 0 이면 폴링 안 함 */
  pollIntervalMs?: number;
};

export function useAuthSessionGuard(options: Options = {}) {
  const { pollIntervalMs = 10 * 60 * 1000 } = options; // 기본 10분
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let destroyed = false;
    let isChecking = false;

    const handleForceLogout = () => {
      // 🔹 React Query 캐시 비우기 (me 정보 등)
      queryClient.removeQueries({ queryKey: ["me"], exact: true });
      // 필요하면 전체 캐시 삭제도 가능: queryClient.clear();

      router.replace("/login");
    };

    /** /auth/me로 세션 유효성 체크 */
    const checkSession = async (isInitial = false) => {
      if (isChecking || destroyed) return;

      // 🔹 [iPhone PWA 대응] 새로고침 직후에는 환경이 안정화될 때까지 대기
      if (isInitial) {
        const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
        // PWA면 조금 더 넉넉하게 대기 (아이폰 쿠키 로딩 지연 대응)
        await new Promise((resolve) => setTimeout(resolve, isPWA ? 1200 : 500));
      }

      isChecking = true;
      try {
        await api.get("/auth/me"); // 200 이면 OK
      } catch (e: any) {
        const hasToken = !!localStorage.getItem("notemap_token");
        const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

        // 🔹 [PWA 특화] 1차 실패 시, 토큰이 있다면 2초 후 딱 한 번만 더 시도 (최후의 보루)
        if (isInitial && isPWA && hasToken) {
          console.warn("[AuthSessionGuard] Initial check failed in PWA. Retrying once more in 2s...");
          await new Promise(r => setTimeout(r, 2000));
          try {
            await api.get("/auth/me");
            return; // 2차 시도 성공
          } catch (e2) {
            console.error("[AuthSessionGuard] Double failure. Proceeding to logout check.");
          }
        }
        
        // 🔹 [인증 정밀화] 토큰이 있지만 실제 만료 또는 유효하지 않은 경우, 무한 대기하지 않고 로그아웃을 진행합니다.
        localStorage.removeItem("notemap_token");
        handleForceLogout();
      } finally {
        isChecking = false;
      }
    };

    // 1) BroadcastChannel: 다른 탭 로그아웃 이벤트 수신
    let channel: BroadcastChannel | undefined;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
        if (!event?.data) return;
        if (event.data.type === "LOGOUT") {
          handleForceLogout();
        }
        // 필요하면 LOGIN, SESSION_REFRESH 도 여기서 처리 가능
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

    // 3) 백업용 폴링 (선택)
    let timerId: number | undefined;
    if (pollIntervalMs > 0) {
      timerId = window.setInterval(() => {
        void checkSession();
      }, pollIntervalMs);
    }

    // 처음 마운트될 때 한 번 체크 (지연 실행)
    void checkSession(true);

    return () => {
      destroyed = true;
      if (channel) channel.close();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerId) window.clearInterval(timerId);
    };
  }, [router, queryClient, pollIntervalMs]);
}
