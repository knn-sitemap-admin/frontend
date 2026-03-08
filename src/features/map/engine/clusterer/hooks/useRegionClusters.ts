import { useMemo } from "react";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import { normalizeRegionName, normalizeSigunguName, REGION_CENTERS } from "../../../shared/utils/regionUtils";

export type RegionClusterData = {
  regionName: string;
  count: number;
  centerPos: { lat: number; lng: number };
};

type UseRegionClustersArgs = {
  markers: MapMarker[];
  zoomLevel: number;
  triggerLevel?: number; // 기본값 8
};

/**
 * useRegionClusters (V3 계층형 클러스터링)
 * - 줌 레벨에 따라 시/도 또는 시/군/구 단위로 마커를 그룹화합니다.
 */
export function useRegionClusters({
  markers,
  zoomLevel,
  triggerLevel = 8,
}: UseRegionClustersArgs) {
  const isRegionClusteringActive = zoomLevel >= triggerLevel;

  const regionClusters = useMemo(() => {
    if (!isRegionClusteringActive || !markers || markers.length === 0) {
      return [];
    }

    const groups: Record<string, { count: number; sumLat: number; sumLng: number }> = {};
    const clusterMode = zoomLevel >= 11 ? "SIDO" : "SIGUNGU";

    markers.forEach((marker) => {
      // 줌 레벨에 따라 추출 함수 선택
      const region = clusterMode === "SIDO" 
        ? (normalizeRegionName(marker.address) ?? "기타")
        : (normalizeSigunguName(marker.address) ?? "기타");
      
      if (!groups[region]) {
        groups[region] = { count: 0, sumLat: 0, sumLng: 0 };
      }
      groups[region].count++;
      groups[region].sumLat += marker.position.lat;
      groups[region].sumLng += marker.position.lng;
    });

    const clusters: RegionClusterData[] = Object.entries(groups).map(
      ([regionName, data]) => {
        let centerPos;

        if (clusterMode === "SIDO") {
          // 시/도 모드에서는 미리 정의된 중심점 사용
          centerPos = REGION_CENTERS[regionName] ?? {
            lat: data.sumLat / data.count,
            lng: data.sumLng / data.count,
          };
        } else {
          // 시/군/구 모드에서는 포함된 마커들의 평균 좌표 사용 (동적 중심점)
          centerPos = {
            lat: data.sumLat / data.count,
            lng: data.sumLng / data.count,
          };
        }

        return {
          regionName,
          count: data.count,
          centerPos,
        };
      }
    );

    return clusters;
  }, [markers, isRegionClusteringActive, zoomLevel]);

  return {
    isRegionClusteringActive,
    regionClusters,
  };
}
