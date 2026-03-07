import React from "react";
import CustomOverlay from "../../../shared/CustomOverlay/CustomOverlay";
import type { RegionClusterData } from "../hooks/useRegionClusters";

type RegionClustererLayerProps = {
  kakao: any;
  map: any;
  clusters: RegionClusterData[];
  onRegionClick?: (regionName: string, centerPos: { lat: number; lng: number }) => void;
};

/**
 * 지역별 클러스터 레이어
 * CSS 애니메이션 추가
 */
export function RegionClustererLayer({
  kakao,
  map,
  clusters,
  onRegionClick,
}: RegionClustererLayerProps) {
  if (!clusters || clusters.length === 0) return null;

  return (
    <>
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}
      </style>
      {clusters.map((cluster) => (
        <CustomOverlay
          key={cluster.regionName}
          kakao={kakao}
          map={map}
          position={
            new kakao.maps.LatLng(cluster.centerPos.lat, cluster.centerPos.lng)
          }
          zIndex={9999}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onRegionClick?.(cluster.regionName, cluster.centerPos);
            }}
            className={
              "group relative flex flex-col items-center justify-center " +
              "w-[54px] h-[54px] rounded-full " +
              "bg-gradient-to-br from-indigo-500 to-violet-500 " +
              "shadow-[0_4px_16px_rgba(99,102,241,0.5)] " +
              "border border-white/30 cursor-pointer " +
              "transition-all duration-300 ease-out hover:scale-110 " +
              "hover:shadow-[0_0_18px_rgba(139,92,246,0.7)] " +
              "animate-float"
            }
          >
            {/* Glossy overlay */}
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

            <span className="text-[11px] font-bold text-white leading-tight tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] z-10 text-center px-1">
              {cluster.regionName}
            </span>
            <span className="text-[10px] font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-10">
              {cluster.count.toLocaleString()}
            </span>

            {/* Hover Aura */}
            <div className="absolute inset-0 rounded-full bg-violet-400 opacity-0 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500 blur-xl" />
          </div>
        </CustomOverlay>
      ))}
    </>
  );
}

