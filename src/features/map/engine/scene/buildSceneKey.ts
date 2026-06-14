import { MapMarker } from "../../shared/types/mapMarker.type";

/** markers 내용 변화에 반응하도록 안정적인 키 생성 */
export function buildSceneKey(markers: readonly MapMarker[] | undefined) {
  try {
    const core = [...(markers ?? [])]
      .map((m: any) => ({
        id: String(m.id),
        lat: m.position?.lat,
        lng: m.position?.lng,
        name: (
          m?.name ??
          m?.point?.name ??
          m?.data?.name ??
          m?.property?.name ??
          m?.property?.title ??
          m?.title ??
          ""
        )?.toString() ?? "",
        source: m?.source ?? "",
        draftState: m?.draftState ?? "",
        isSalesStopped: m?.isSalesStopped ?? false,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return JSON.stringify(core);
  } catch {
    return `len:${markers?.length ?? 0}`;
  }
}
