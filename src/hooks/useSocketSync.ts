"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE } from "@/shared/api/api";

export function useSocketSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 세션 기반 인증을 위해 withCredentials 설정
    const socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("WebSocket connected for real-time sync");
    });

    // 매물핀 관련 이벤트 수신
    socket.on("pin_updated", (data: { pinId: string; action: string }) => {
      console.log("WebSocket [pin_updated]:", data);
      
      // 지도상 마커들을 다시 불러옵니다.
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      
      // 만약 방금 변경된 핀의 상세 정보 모달이 열려있다면 해당 정보도 갱신합니다.
      if (data.pinId) {
        queryClient.invalidateQueries({ queryKey: ["pinDetail", data.pinId] });
        queryClient.invalidateQueries({ queryKey: ["pin-raw", data.pinId] });
      }

      // 지도 마커 즉시 갱신을 위해 커스텀 이벤트 발송
      window.dispatchEvent(new Event("socket_refresh_map"));
    });

    // 답사예정핀(임시핀) 관련 이벤트 수신
    socket.on("reservation_changed", (data: { draftId?: string; action: string }) => {
      console.log("WebSocket [reservation_changed]:", data);
      
      // 예약 리스트 및 지도상 예약(임시) 핀들을 갱신합니다.
      queryClient.invalidateQueries({ queryKey: ["scheduledReservations"] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      
      // draftId를 포함한 CustomEvent를 발송하여 해당 핀만 상태 업데이트 (전체 클리어 방지)
      window.dispatchEvent(new CustomEvent("socket_reservation_changed", {
        detail: { draftId: data.draftId, action: data.action },
      }));
      // ⛔ socket_refresh_map은 발송하지 않음 → 전체 캐시 클리어 + 재요청으로 인한 깜빡임 방지
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
