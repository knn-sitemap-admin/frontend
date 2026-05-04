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

      // 🔹 [iPhone PWA 대응] 새로고침 직후에는 환경(localStorage, 등)이 안정화될 때까지 약간 대기
      if (isInitial) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      isChecking = true;
      try {
        await api.get("/auth/me"); // 200 이면 OK
      } catch (e: any) {
        // 🔹 [보안/안정화] 401 에러가 났더라도, 로컬에 토큰이 있다면 즉시 로그아웃 시키지 않고 
        // 인터셉터의 재시도 로직이 끝날 때까지 기다리거나 한 번 더 기회를 줍니다.
        const hasToken = !!localStorage.getItem("notemap_token");
        
        if (!hasToken) {
          handleForceLogout();
        } else {
          // 토큰은 있는데 401인 경우: 인터셉터가 이미 처리 중일 수 있으므로 
          // 여기서 즉시 로그아웃 시키는 것은 위험합니다. 
          // 정말 만료된 거라면 인터셉터가 결국 /login으로 보낼 것입니다.
          console.warn("[AuthSessionGuard] 401 detected but token exists. Letting interceptor handle it.");
        }
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
