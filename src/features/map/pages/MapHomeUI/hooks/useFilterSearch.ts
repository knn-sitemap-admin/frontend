import { useState, useCallback } from "react";
import type {
  PinSearchParams,
  PinSearchResult,
} from "@/features/pins/types/pin-search";
import { fitSearchResultToBounds } from "../lib/searchUtils";
import { searchPins } from "@/shared/api/pins";
import { initialFilterState } from "@/features/map/components/filterSearch/utils/filterDefaults";
import type { FilterState } from "@/features/map/components/filterSearch/types/filterSearch.types";
import { buildPinSearchParams } from "@/features/map/components/filterSearch/lib/buildPinSearchParams";

type Args = {
  kakaoSDK: any;
  mapInstance: any;
  setFilterSearchOpen: (open: boolean) => void;
  setNoResultDialogOpen: (open: boolean) => void;
};

const isFilterStateEmpty = (f: FilterState): boolean => {
  return (
    f.rooms.length === 0 &&
    f.deposit === "" &&
    f.areaMin === "" &&
    f.areaMax === "" &&
    f.buildingTypes.length === 0 &&
    f.elevator === "" &&
    f.priceMin === "" &&
    f.priceMax === ""
  );
};

export function useFilterSearch({
  kakaoSDK,
  mapInstance,
  setFilterSearchOpen,
  setNoResultDialogOpen,
}: Args) {
  const [searchRes, setSearchRes] = useState<PinSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>(
    initialFilterState as FilterState
  );

  const fitToSearch = useCallback(
    (res: PinSearchResult) => {
      fitSearchResultToBounds({ kakaoSDK, mapInstance, res });
    },
    [kakaoSDK, mapInstance]
  );

  const handleApplyFilters = useCallback(
    async (params: PinSearchParams, filters?: FilterState) => {
      if (filters) {
        setActiveFilters(filters);
      }
      setFilterSearchOpen(false);
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await searchPins(params);
        setSearchRes(res);

        const hasPins = (res.pins?.length ?? 0) > 0;
        const hasDrafts = (res.drafts?.length ?? 0) > 0;

        if (!hasPins && !hasDrafts) {
          setNoResultDialogOpen(true);
        } else {
          fitToSearch(res);
        }
      } catch (e: any) {
        setSearchError(e?.message ?? "검색 실패");
        setSearchRes(null);
      } finally {
        setSearchLoading(false);
      }
    },
    [fitToSearch, setFilterSearchOpen, setNoResultDialogOpen]
  );

  const clearSearch = useCallback(() => {
    setSearchRes(null);
    setSearchError(null);
    setActiveFilters(initialFilterState as FilterState);
  }, []);

  const handleRemoveFilter = useCallback(
    async (key: keyof FilterState, value?: string) => {
      setActiveFilters((prev) => {
        let next: FilterState;
        if (key === "rooms" || key === "buildingTypes") {
          const arr = (prev[key] as string[]) ?? [];
          next = {
            ...prev,
            [key]: arr.filter((x) => x !== value),
          };
        } else if (key === "areaMin" || key === "areaMax") {
          next = {
            ...prev,
            areaMin: "",
            areaMax: "",
          };
        } else if (key === "priceMin" || key === "priceMax") {
          next = {
            ...prev,
            priceMin: "",
            priceMax: "",
          };
        } else {
          next = {
            ...prev,
            [key]: "",
          };
        }

        const params = buildPinSearchParams(next);
        if (isFilterStateEmpty(next)) {
          setSearchRes(null);
          setSearchError(null);
        } else {
          // 비동기 쿼리 반영
          handleApplyFilters(params, next);
        }

        return next;
      });
    },
    [handleApplyFilters]
  );

  return {
    searchRes,
    searchLoading,
    searchError,
    activeFilters,
    handleApplyFilters,
    clearSearch,
    handleRemoveFilter,
  };
}
