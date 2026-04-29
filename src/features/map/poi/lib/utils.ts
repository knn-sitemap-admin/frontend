import type { BoundsBox } from "../usePoiLayer.types";
import { distM } from "./geometry";
import { SCALEBAR_PX, DESIRED_SCALEBAR_M } from "./constants";

export function getViewportBox(map: any, kakao: any): BoundsBox | null {
  if (!map || !kakao) return null;
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return {
    sw: { lat: sw.getLat(), lng: sw.getLng() },
    ne: { lat: ne.getLat(), lng: ne.getLng() },
  };
}

export function getKakaoBounds(map: any, kakao: any) {
  return map && kakao ? map.getBounds() : null;
}

export function getMinViewportEdgeMeters(map: any, kakao: any): number {
  if (!map || !kakao) return Infinity;
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  const nwLat = ne.getLat();
  const nwLng = sw.getLng();
  const width = distM(nwLat, nwLng, ne.getLat(), ne.getLng());
  const height = distM(sw.getLat(), sw.getLng(), nwLat, nwLng);
  return Math.min(width, height);
}

export function movedEnough(a: BoundsBox, b: BoundsBox | null): boolean {
  if (!b) return true;
  const d = (x: number, y: number) => Math.abs(x - y);
  const TH = 0.0005; // ≈ 50~60m
  return (
    d(a.sw.lat, b.sw.lat) > TH ||
    d(a.sw.lng, b.sw.lng) > TH ||
    d(a.ne.lat, b.ne.lat) > TH ||
    d(a.ne.lng, b.ne.lng) > TH
  );
}

export function calcScalebarPass(
  map: any,
  kakao: any,
  minEdgeM: number,
  thresholdM: number = DESIRED_SCALEBAR_M
): boolean {
  if (!map || !kakao) return false;
  const node: any =
    map.getNode?.() || map.getContainer?.() || map.getDiv?.() || null;

  const minEdgePx = Math.min(
    node?.clientWidth ??
      (typeof window !== "undefined" ? window.innerWidth : 0),
    node?.clientHeight ??
      (typeof window !== "undefined" ? window.innerHeight : 0)
  );

  const currentScaleBarM = (minEdgeM / Math.max(1, minEdgePx)) * SCALEBAR_PX;
  return currentScaleBarM <= thresholdM;
}

export function ensurePlacesInstance(
  kakao: any,
  ref: React.MutableRefObject<any>
) {
  if (!ref.current && kakao?.maps?.services?.Places) {
    ref.current = new kakao.maps.services.Places();
  }
  return ref.current;
}
