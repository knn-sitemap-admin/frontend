import { useEffect, useMemo, useRef, useState } from "react";
import type { MapMarker } from "../../shared/types/mapMarker.type";
import { PinKind } from "@/features/pins/types";
import {
  fetchUnreservedDrafts,
  BeforeDraft,
} from "@/shared/api/survey-reservations/surveyReservations";

import { Bounds } from "@/features/map/shared/types/bounds.type";
import { MapMenuKey } from "@/features/map/components/menu/types/mapMenu.types";

export function usePlannedDrafts({
  filter,
  getBounds,
}: {
  filter: string;
  getBounds: () => Bounds | undefined;
}) {
  const activeMenu = (filter as MapMenuKey) ?? "all";

  type DraftLite = {
    id: string;
    lat: number;
    lng: number;
    addressLine?: string;
  };

  const [plannedDrafts, setPlannedDrafts] = useState<DraftLite[]>([]);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // getBounds는 ref에 보관 (함수 정체성 변동을 deps에서 제외)
  const getBoundsRef = useRef(getBounds);
  useEffect(() => {
    getBoundsRef.current = getBounds;
  }, [getBounds]);

  /**
   * NOTE:
   * 아래 makeKey의 toFixed(6)는 "키 비교용"으로만 사용합니다.
   * 실제 서버 요청/모달 파라미터/마커 position으로 전달되는 좌표는
   * 절대 toFixed로 잘라내지 않습니다(정밀도 유지).
   */
  const makeKey = (b?: Bounds) =>
    b
      ? `${b.swLat.toFixed(6)}|${b.swLng.toFixed(6)}|${b.neLat.toFixed(
          6
        )}|${b.neLng.toFixed(6)}`
      : "none";

  // 현재 렌더 시점의 bounds를 읽어 key 생성 (값 변화 시에만 effect 재실행)
  const boundsKey = useMemo(() => {
    return makeKey(getBoundsRef.current?.());
    // 의도적으로 deps 없음: getBoundsRef.current()의 "결과값"이 바뀌면
    // boundsKey 문자열이 달라져 다음 렌더에서 effect가 트리거됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]); // 메뉴 변경 시에도 즉시 재평가

  // 강제 새로고침 트리거
  const [reloadTick, setReloadTick] = useState(0);
  const reloadPlanned = () => setReloadTick((t) => t + 1);

  // 웹소켓 이벤트 수신 시 자동으로 새로고침
  useEffect(() => {
    const handleSocketEvent = () => {
      setReloadTick((t) => t + 1);
    };
    window.addEventListener("socket_reservation_changed", handleSocketEvent);
    return () => {
      window.removeEventListener("socket_reservation_changed", handleSocketEvent);
    };
  }, []);

  // 마지막으로 가져온 key 기억
  const lastKeyRef = useRef<string | null>(null);

  // 얕은 비교: 길이/핵심 필드만 비교해 동일 배열이면 setState 생략
  const isSameDrafts = (a: DraftLite[], b: DraftLite[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if (
        x.id !== y.id ||
        x.lat !== y.lat ||
        x.lng !== y.lng ||
        (x.addressLine ?? "") !== (y.addressLine ?? "")
      ) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    // plannedOnly가 아니면 데이터를 비우되, 이미 비어있다면 갱신 생략(루프 차단)
    if (activeMenu !== "plannedOnly") {
      if (plannedDrafts.length > 0) setPlannedDrafts([]);
      setState((s) =>
        s.loading || s.error ? { loading: false, error: null } : s
      );
      lastKeyRef.current = null;
      return;
    }

    // plannedOnly 인 경우에만 bounds 기반 호출
    const currentKey = boundsKey;

    // bounds 변동이 없고, 강제 새로고침도 없으면 스킵
    const shouldFetch = currentKey !== lastKeyRef.current || reloadTick > 0;
    if (!shouldFetch) return;

    let cancelled = false;

    (async () => {
      try {
        setState((s) => (s.loading ? s : { ...s, loading: true, error: null }));

        // ▶ bounds는 "원본 그대로" 전달 (정밀도 손실 없음)
        const list = await fetchUnreservedDrafts(getBoundsRef.current?.());
        if (cancelled) return;

        // 서버 응답(lat/lng)이 string일 수도 있으므로 number로 캐스팅만 수행 (자르지 않음)
        const normalized: DraftLite[] = (list ?? []).map((d: BeforeDraft) => ({
          id: String(d.id),
          lat: Number(d.lat),
          lng: Number(d.lng),
          addressLine: d.addressLine ?? undefined,
        }));

        setPlannedDrafts((prev) =>
          isSameDrafts(prev, normalized) ? prev : normalized
        );
        setState({ loading: false, error: null });

        // 마지막 성공 키 갱신 & reloadTick 소진
        lastKeyRef.current = currentKey;
        if (reloadTick > 0) setReloadTick(0);
      } catch (e: any) {
        if (!cancelled) {
          setState({
            loading: false,
            error: e?.response?.data?.message || e?.message || "load failed",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // boundsKey: 범위가 변할 때만 effect 실행
    // activeMenu: plannedOnly 진입/이탈 포착
    // reloadTick: 강제 새로고침
  }, [activeMenu, boundsKey, reloadTick, plannedDrafts.length]);

  const plannedMarkersOnly: MapMarker[] = useMemo(
    () =>
      plannedDrafts.map((d) => ({
        id: `__visit__${String(d.id)}`,
        title: d.addressLine ?? "답사예정",
        // ▶ 마커 position에도 원본 값 그대로 사용 (toFixed 절대 금지)
        position: { lat: d.lat, lng: d.lng },
        kind: "question" as PinKind,
      })),
    [plannedDrafts]
  );

  return { plannedDrafts, plannedMarkersOnly, reloadPlanned, state };
}
