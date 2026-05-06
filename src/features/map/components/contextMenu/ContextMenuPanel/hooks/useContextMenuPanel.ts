"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { useMeRole } from "@/features/auth/hooks/useMeRole";
import { getEmployeesList } from "@/features/users/api/account";

import { getPinRaw } from "@/shared/api/pins/queries/getPin";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CreateMode,
  ReserveRequestPayload,
} from "../../PinContextMenu/PinContextMenuContainer.types";
import { getPinDraftDetailOnce } from "@/shared/api/pins";
import { ContextMenuPanelProps } from "../panel.types";
import { computeHeaderTitle, computePanelState } from "../panel.state";
import {
  extractDraftIdFromPropertyId,
  getLatLngFromPosition,
  isDraftLikeId,
} from "../panel.utils";

export function useContextMenuPanelLogic(props: ContextMenuPanelProps) {
  const {
    roadAddress,
    jibunAddress,
    propertyId,
    propertyTitle,
    draftState,
    isPlanPin,
    isVisitReservedPin,
    isAlreadyReserved,
    isReservedByOtherAccount,
    assigneeName,
    onCancelReservation,
    onClose,
    onView,
    onCreate,
    onPlan,
    onReserve,
    position,
  } = props;

  const headingId = useId();
  const descId = useId();
  const qc = useQueryClient();
  const { isPrivileged, accountId } = useMeRole();

  // 대리 예약 시 대상 직원 목록 조회
  const { data: employees } = useQuery({
    queryKey: ["employees-list", "active"],
    queryFn: () => getEmployeesList({ sort: "name", onlyActive: true }),
    enabled: isPrivileged,
  });

  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");

  useEffect(() => {
    if (accountId && !selectedAssigneeId) {
      setSelectedAssigneeId(String(accountId));
    }
  }, [accountId, selectedAssigneeId]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  /** 제목 로컬 상태: 컨테이너에서 title이 없을 때 보완 */
  const [displayTitle, setDisplayTitle] = useState(
    (propertyTitle ?? "").trim()
  );
  const [displayOfficePhone, setDisplayOfficePhone] = useState<string>(
    props.officePhone ?? ""
  );
  const [displayParkingGrade, setDisplayParkingGrade] = useState<number>(
    props.parkingGrade ?? 0
  );
  const [displayRoadAddress, setDisplayRoadAddress] = useState<string>(
    roadAddress ?? ""
  );
  const [displayJibunAddress, setDisplayJibunAddress] = useState<string>(
    jibunAddress ?? ""
  );

  useEffect(() => {
    if (roadAddress) setDisplayRoadAddress(roadAddress);
  }, [roadAddress]);

  useEffect(() => {
    if (jibunAddress) setDisplayJibunAddress(jibunAddress);
  }, [jibunAddress]);

  useEffect(() => {
    setDisplayTitle((propertyTitle ?? "").trim());
  }, [propertyTitle]);

  useEffect(() => {
    if (props.officePhone !== undefined) {
      setDisplayOfficePhone(props.officePhone ?? "");
    }
  }, [props.officePhone]);

  useEffect(() => {
    if (props.parkingGrade !== undefined) {
      setDisplayParkingGrade(props.parkingGrade ?? 0);
    }
  }, [props.parkingGrade]);

  /** 파생 상태: reserved > planned > draft > normal */
  const panelState = useMemo(
    () =>
      computePanelState({
        propertyId,
        draftState,
        isPlanPin,
        isVisitReservedPin,
      }),
    [propertyId, draftState, isPlanPin, isVisitReservedPin]
  );

  const draft = panelState === "draft";
  const reserved = panelState === "reserved";
  const planned = panelState === "planned";

  // 상세보기 가능 여부
  const canView = useMemo(() => {
    const s = String(propertyId ?? "").trim();
    if (!s) return false;

    // 임시 id(빈값, __draft__, __new__, 숫자 아닌 것)는 상세보기 불가
    if (isDraftLikeId(propertyId)) return false;

    const low = s.toLowerCase();
    if (
      /(^|[_:. -])(visit|reserved|reserve|rsvd|plan|planned|planning|previsit)([_:. -]|$)/i.test(
        s
      ) ||
      low.startsWith("__visit__") ||
      low.startsWith("__reserved__") ||
      low.startsWith("__plan__") ||
      low.startsWith("__planned__")
    ) {
      return false;
    }

    // 안전하게: 숫자 id만 상세보기 허용
    if (!/^\d+$/.test(s)) return false;

    return true;
  }, [propertyId]);

  /** 제목이 비어 있고 조회 가능한 등록핀이라면 1회 조회 후 제목 채우기
   *  ⚙️ React Query 캐시/페치 사용 → StrictMode 에서도 네트워크는 1번만
   */
  useEffect(() => {
    if (displayTitle) return;
    if (!canView) return;
    if (!propertyId) return;

    const idStr = String(propertyId).trim();
    if (!idStr) return;

    let cancelled = false;

    const fillFromPin = (pinLike: any) => {
      if (cancelled || !pinLike) return;

      const raw = (pinLike as any)?.data ?? pinLike;

      const name =
        raw?.property?.title ??
        raw?.title ??
        raw?.name ??
        raw?.property?.name ??
        "";

      if (name) {
        setDisplayTitle(String(name).trim());
      }

      const officePhone =
        raw?.property?.contactMainPhone ?? raw?.contactMainPhone ?? "";
      if (officePhone) {
        setDisplayOfficePhone(String(officePhone).trim());
      }

      const pgRaw = raw?.property?.parkingGrade ?? raw?.parkingGrade;
      const pg = Number(pgRaw);
      if (Number.isFinite(pg)) {
        setDisplayParkingGrade(Math.max(0, Math.min(5, pg)));
      }

      const addr = String(raw?.addressLine ?? raw?.property?.addressLine ?? "").trim();
      if (addr && !displayRoadAddress && !displayJibunAddress) {
        setDisplayRoadAddress(addr);
      }
    };

    // 1️⃣ 캐시에 있으면 네트워크 없이 바로 사용
    const rawKey = ["pin-raw", idStr] as const;
    const cached = qc.getQueryData<any>(rawKey);
    if (cached) {
      fillFromPin(cached);
      return;
    }

    // 2️⃣ 없으면 fetchQuery (sidebar와 캐시 공유)
    qc.fetchQuery({
      queryKey: rawKey,
      queryFn: () => getPinRaw(idStr),
      staleTime: 60_000,
    })
      .then(fillFromPin)
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [canView, propertyId, qc]);

  /** 답사예정/답사지예약(임시핀)일 때 pin-drafts 기반으로 제목 채우기 */
  useEffect(() => {
    const idStr = String(propertyId ?? "").trim();
    if (!idStr) return;

    if (!reserved && !planned) {
      return;
    }

    if (
      displayTitle &&
      displayTitle !== "답사예정" &&
      displayTitle !== "답사지예약"
    ) {
      return;
    }

    let draftId = extractDraftIdFromPropertyId(propertyId);

    if (draftId == null) {
      const n = Number(idStr);
      if (Number.isFinite(n)) {
        draftId = n;
      }
    }

    if (!draftId) {
      return;
    }

    let alive = true;

    getPinDraftDetailOnce(draftId)
      .then((detail) => {
        if (!alive || !detail) return;

        const name = String(detail.name ?? "").trim();
        const addr = String(detail.addressLine ?? "").trim();
        const phone = String(detail.contactMainPhone ?? "").trim();

        if (name) {
          setDisplayTitle(name);
        } else if (addr) {
          setDisplayTitle(addr);
        }

        if (addr && !displayRoadAddress && !displayJibunAddress) {
          setDisplayRoadAddress(addr);
        }

        if (phone) {
          setDisplayOfficePhone(phone);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [propertyId, planned, reserved, displayTitle]);

  /** 최종 헤더 타이틀 (도메인 규칙은 types.ts로 위임) */
  const headerTitle = useMemo(
    () =>
      computeHeaderTitle({
        panelState,
        displayTitle,
        propertyTitle,
        roadAddress: displayRoadAddress,
        jibunAddress: displayJibunAddress,
      }),
    [
      panelState,
      displayTitle,
      propertyTitle,
      displayRoadAddress,
      displayJibunAddress,
    ]
  );

  const officePhone = useMemo(() => {
    const v = String(displayOfficePhone ?? "").trim();
    return v.length ? v : undefined;
  }, [displayOfficePhone]);

  const parkingGrade = useMemo(() => {
    return Number.isFinite(displayParkingGrade) ? displayParkingGrade : 0;
  }, [displayParkingGrade]);

  /** 초기 포커스/복귀 */
  useEffect(() => {
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement) ?? null;
    panelRef.current?.focus();
    firstFocusableRef.current?.focus?.();
    return () => previouslyFocusedRef.current?.focus?.();
  }, []);

  /** ESC 닫기 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 패널 안쪽에서만 상위 버블링 차단 */
  const stopAll = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  const handleReserveClick = useCallback(() => {
    // ReserveRequestPayload 형식에 맞춰 전달 (kind는 Container에서 보강하거나 여기서 임의 지정)
    // 여기서는 assigneeId만 넘기고 Container의 handleReserveWithToast에서 처리하도록 유도
    const payload: any = {
      assigneeId: selectedAssigneeId ? Number(selectedAssigneeId) : undefined,
    };

    if (onReserve) {
      onReserve(payload);
    } else if (onPlan) {
      onPlan();
    }

    onClose();
  }, [onReserve, onPlan, onClose, selectedAssigneeId]);

  const handleViewClick = useCallback(() => {
    if (!canView) return;
    onView?.(String(propertyId));
    Promise.resolve().then(() => onClose());
  }, [onView, onClose, propertyId, canView]);

  const handleCreateClick = useCallback(() => {
    const pinDraftId = extractDraftIdFromPropertyId(propertyId);
    const { lat, lng } = getLatLngFromPosition(position);

    const createMode: CreateMode = draft
      ? "PLAN_FROM_DRAFT"
      : reserved
      ? "FULL_PROPERTY_FROM_RESERVED"
      : "NORMAL";

    const basePayload = {
      latFromPin: lat,
      lngFromPin: lng,
      fromPinDraftId: pinDraftId,
      address: roadAddress ?? jibunAddress ?? null,
      roadAddress: roadAddress ?? null,
      jibunAddress: jibunAddress ?? null,
      createMode,
    };

    const payload = draft
      ? { ...basePayload, visitPlanOnly: true }
      : basePayload;

    onCreate?.(payload);
    onClose();
  }, [
    onCreate,
    onClose,
    propertyId,
    roadAddress,
    jibunAddress,
    position,
    draft,
    reserved,
  ]);

  const handleHoverPrefetch = useCallback(() => {
    if (!canView) return;
    const idStr = String(propertyId);
    qc.prefetchQuery({
      queryKey: ["pin-raw", idStr],
      queryFn: () => getPinRaw(idStr),
      staleTime: 60_000,
    });
  }, [qc, propertyId, canView]);

  return {
    // refs & ids
    headingId,
    descId,
    panelRef,
    firstFocusableRef,

    // 상태
    headerTitle,
    roadAddress: displayRoadAddress,
    jibunAddress: displayJibunAddress,
    officePhone,
    parkingGrade,
    draft,
    planned,
    reserved,
    canView,
    isAlreadyReserved,
    isReservedByOtherAccount,
    assigneeName,
    onCancelReservation,

    // 핸들러
    stopAll,
    handleReserveClick,
    handleViewClick,
    handleCreateClick,
    handleHoverPrefetch,

    // 대리 예약 관련
    isPrivileged,
    employees,
    selectedAssigneeId,
    setSelectedAssigneeId,
  };
}
