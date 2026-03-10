"use client";

import { useState, useCallback } from "react";
import { searchPins } from "@/shared/api/pins/queries/searchPins";
import type { PinSearchResult } from "@/features/pins/types/pin-search";

export function useSalePinSearch() {
  const [results, setResults] = useState<PinSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const data = await searchPins({ q });
      setResults(data);
    } catch (err: any) {
      setError(err.message || "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults(null);
    setIsOpen(false);
  }, []);

  return {
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    performSearch,
    clearSearch,
  };
}
