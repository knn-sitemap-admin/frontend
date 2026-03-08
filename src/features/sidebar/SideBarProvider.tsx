"use client";
import { createContext, useContext, useMemo } from "react";
import { useSidebarState } from "./hooks/useSidebarState";
import { useScheduledReservations } from "../survey-reservations/hooks/useScheduledReservations";

const SidebarCtx = createContext<
  | (ReturnType<typeof useSidebarState> & {
      reservationOrderMap: Record<string, number>;
      reservationOrderByPosKey: Record<string, number>;
    })
  | null
>(null);

export function SideBarProvider({ children }: { children: React.ReactNode }) {
  const state = useSidebarState();
  const {
    items: reservations = [],
    reservationOrderMap = {},
    reservationOrderByPosKey = {},
  } = useScheduledReservations();

  const value = useMemo(
    () => ({
      ...state,
      reservationOrderMap,
      reservationOrderByPosKey,
    }),
    [state, reservationOrderMap, reservationOrderByPosKey]
  );

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
