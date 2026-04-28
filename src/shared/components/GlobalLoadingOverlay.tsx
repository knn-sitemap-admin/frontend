"use client";
import { useSyncExternalStore } from "react";
import { useGlobalLoading } from "../store/useGlobalLoading";

export function GlobalLoadingOverlay() {
  const subscribe = (cb: () => void) => {
    const id = setInterval(cb, 100);
    return () => clearInterval(id);
  };
  const getSnapshot = () => useGlobalLoading.getState().isLoading;
  const isLoading = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="rounded-xl bg-white px-5 py-3 shadow">Loading…</div>
    </div>
  );
}
