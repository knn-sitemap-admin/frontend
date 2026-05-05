"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import type { PropertyViewDetails } from "./types";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePinDetail } from "@/features/properties/edit/hooks/useEditForm/usePinDetail";
import type {
  CreatePayload,
  UpdatePayload,
} from "@/features/properties/types/property-dto";

import ViewStage from "./ui/stage/ViewStage";
import EditStage from "./ui/stage/EditStage";
import { deriveAgeTypeFrom } from "./utils/ageType";
import { deletePin } from "@/shared/api/pins";

import { isMobile } from "@/lib/utils";

/* utils */
const toUndef = <T,>(v: T | null | undefined): T | undefined => v ?? undefined;

type Stage = "view" | "edit";
type ViewDataWithEdit = PropertyViewDetails & { editInitial?: any };

/** ✅ 로컬 뷰 동기화용 패치에 ageType 반영 */
function toViewPatchFromEdit(
  p: UpdatePayload & Partial<CreatePayload>
): Partial<PropertyViewDetails> {
  const anyP = p as any;
  const patch: any = {
    ...(p as any),
    publicMemo: toUndef(anyP.publicMemo),
    secretMemo: toUndef(anyP.secretMemo),
    completionDate: toUndef(anyP.completionDate),
    parkingType: toUndef(anyP.parkingType),
    minRealMoveInCost: toUndef(anyP.minRealMoveInCost),
  };

  const touchedAgeKey =
    "ageType" in anyP ||
    "isNew" in anyP ||
    "isOld" in anyP ||
    "buildingAgeType" in anyP ||
    "buildingGrade" in anyP;

  if (touchedAgeKey) {
    const ageType = deriveAgeTypeFrom(anyP);
    patch.ageType = ageType;
  }

  return patch;
}

/** 🔧 수정: 항상 usePinDetail(qData) 결과를 우선 사용하고,
 *  쿼리 데이터가 없을 때만 data.editInitial 를 fallback 으로 사용
 */
function ensureInitialForEdit(args: {
  qData: any;
  data?: ViewDataWithEdit | null;
  effectiveId?: string | number | null | undefined;
}) {
  const { qData, data, effectiveId } = args;

  const raw = qData?.raw ?? null;
  const viewFromQuery = qData?.view ?? null;

  // data 쪽 view 는 쿼리 결과가 없을 때만 fallback으로 사용
  const fallbackView =
    (data as any)?.view ?? (data as any as PropertyViewDetails | null) ?? null;

  const view = (viewFromQuery || fallbackView) as
    | PropertyViewDetails
    | (PropertyViewDetails & { editInitial?: any })
    | null;

  if (!raw && !view) return null;

  const ensuredId =
    (raw && raw.id) ??
    (view as any)?.id ??
    (data as any)?.id ??
    (data as any)?.propertyId ??
    effectiveId ??
    null;

  const ensuredView =
    ensuredId != null ? { ...(view as any), id: ensuredId } : (view as any);

  const hasQueryData = !!(qData && (qData.raw || qData.view));

  // 🔥 쿼리 데이터가 없을 때만 editInitial 사용
  if (!hasQueryData) {
    const fromProp = (data as any)?.editInitial;
    if (fromProp && (fromProp.view || fromProp.raw)) {
      if (fromProp.view && ensuredId != null) {
        fromProp.view = { ...(fromProp.view ?? {}), id: ensuredId };
      }
      return fromProp;
    }
  }

  if (raw || qData?.view) {
    return { raw, view: ensuredView };
  }
  return { view: ensuredView };
}

export default function PropertyViewModal({
  open,
  onClose,
  data,
  pinId,
  onSave,
  onDelete,
  asInner,
  /** ✅ 수정모달에서 저장 성공 시 map 핀을 다시 불러오고 싶을 때 쓰는 콜백 */
  onLabelChanged,
}: {
  open: boolean;
  onClose: () => void;
  data?: ViewDataWithEdit | null;
  pinId?: string | number | null;
  onSave?: (patch: Partial<PropertyViewDetails>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  asInner?: boolean;
  onLabelChanged?: () => void | Promise<void>;
}) {
  const [stage, setStage] = useState<Stage>("view");
  const [deleting, setDeleting] = useState(false);
  // useBodyScrollLock(open && !asInner); // 상위 PropertyCreateViewHost에서 일괄 관리


  // --- 모바일 뒤로가기 제어 (History API) ---
  const isPopStateRef = useRef(false);
  const onCloseRef = useRef(onClose);
  
  // 최신 onClose 함수를 ref에 유지
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || asInner || !isMobile()) return;

    // 1. 모달이 열릴 때 히스토리에 가짜 상태 추가
    isPopStateRef.current = false;
    const modalId = Math.random().toString(36).substring(2, 11);
    window.history.pushState({ propertyViewOpen: true, modalId }, "");

    // 2. 뒤로가기(popstate) 발생 시 핸들러
    const handlePopState = (event: PopStateEvent) => {
      // 만약 현재 state에 우리 모달의 식별자가 없다면, 사용자가 뒤로가기를 눌러서 나간 것임
      // (단, 다른 모달이 위에 쌓여있는 상태에서 발생한 popstate인지는 modalId로 구분)
      if (event.state?.modalId !== modalId) {
        isPopStateRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
      
      // 3. 수동으로 닫힌 경우 (X 버튼 등), 가짜 히스토리 원복
      if (!isPopStateRef.current) {
        // 현재 히스토리의 최상단이 내가 푸시한 그 상태가 맞을 때만 back() 실행
        // (리마운트 등으로 이미 다음 ID가 쌓였다면 back()을 하지 않음으로써 깜빡임 방지)
        if (window.history.state?.modalId === modalId) {
          window.history.back();
        }
      }
    };
  }, [open]); // onClose를 의존성에서 제거하여 리렌더링 시 히스토리 꼬임 방지

  const [editInitial, setEditInitial] = useState<any | null>(null);
  const [lastEditPayload, setLastEditPayload] = useState<any | null>(null);

  const effectiveId =
    pinId ?? (data as any)?.id ?? (data as any)?.propertyId ?? undefined;

  const q = usePinDetail(effectiveId as any, !!(open && effectiveId));

  useEffect(() => {
    if (!q.data) return;

    const raw = (q.data as any).raw ?? null;
    const view = (q.data as any).view ?? null;

    const debug = {
      raw: raw
        ? {
          buildingType: raw.buildingType ?? null,
          propertyType: raw.propertyType ?? null,
          type: raw.type ?? null,
          registry: raw.registry ?? null,
          registryOne: raw.registryOne ?? null,
          registrationType: raw.registrationType ?? null,
          registrationTypeName: raw.registrationTypeName ?? null,
          registrationTypeId: raw.registrationTypeId ?? null,
        }
        : null,
      view: view
        ? {
          buildingType: view.buildingType ?? null,
          propertyType: view.propertyType ?? null,
          type: view.type ?? null,
          registry: view.registry ?? null,
          registryOne: view.registryOne ?? null,
          registrationType: view.registrationType ?? null,
          registrationTypeName: view.registrationTypeName ?? null,
          registrationTypeId: view.registrationTypeId ?? null,
        }
        : null,
    };
  }, [q.data]);

  const viewData: PropertyViewDetails | null = useMemo(() => {
    const v = (q.data as any)?.view as PropertyViewDetails | undefined;
    if (v) return v;
    return (data as PropertyViewDetails) ?? null;
  }, [q.data, data]);

  const metaDetails = useMemo(
    () => (q.data as any) ?? (data as any) ?? viewData,
    [q.data, data, viewData]
  );

  const initialForEdit: any | null = useMemo(
    () => ensureInitialForEdit({ qData: q.data, data, effectiveId }),
    [q.data, data, effectiveId]
  );

  const headingId = "property-view-modal-heading";
  const descId = "property-view-modal-desc";

  const idForActions =
    (q.data as any)?.raw?.id ??
    (data as any)?.id ??
    (data as any)?.propertyId ??
    effectiveId;

  useEffect(() => {
    setLastEditPayload(null);
  }, [pinId]);

  const handleDelete = useCallback(async () => {
    if (!idForActions || deleting) return;

    const numericId = Number(idForActions);
    if (!Number.isFinite(numericId)) {
      alert("삭제할 핀 ID가 올바르지 않습니다.");
      return;
    }

    if (
      !confirm("정말 이 매물을 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.")
    ) {
      return;
    }

    try {
      setDeleting(true);
      await deletePin(numericId);
      await onDelete?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.responseData?.message ||
        "삭제 요청에 실패했습니다.";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  }, [idForActions, deleting, onDelete, onClose]);

  const onEditClose = useCallback(() => {
    setStage("view");
    setEditInitial(null);
  }, []);

  const onEditSubmit = useCallback(
    async (payload: UpdatePayload & Partial<CreatePayload>) => {
      try {
        const viewPatch = toViewPatchFromEdit(payload);
        const idFromPayload = (payload as any)?.id;
        const patchId =
          idFromPayload ??
          (viewData as any)?.id ??
          (metaDetails as any)?.raw?.id ??
          idForActions ??
          null;

        const finalPatch =
          patchId != null ? { ...viewPatch, id: patchId } : viewPatch;

        setLastEditPayload(payload);
        await onSave?.(finalPatch);
      } finally {
        setStage("view");
        setEditInitial(null);
      }
    },
    [onSave, viewData, metaDetails, idForActions]
  );

  if (!open) return null;

  const portalChild =
    stage === "edit" && (editInitial || initialForEdit) ? (
      <EditStage
        key={`edit-${String(
          (editInitial as any)?.raw?.id ??
          (editInitial as any)?.view?.id ??
          (initialForEdit as any)?.raw?.id ??
          (initialForEdit as any)?.view?.id ??
          idForActions ??
          ""
        )}`}
        initialData={editInitial ?? initialForEdit}
        onClose={onEditClose}
        onSubmit={onEditSubmit}
        asInner={asInner}
        // ⭐ 여기서 EditStage로 onLabelChanged 전달
        onLabelChanged={onLabelChanged}
      />
    ) : (
      <ViewStage
        key={`view-${String(effectiveId ?? idForActions ?? "")}`}

        data={viewData}
        metaDetails={metaDetails}
        headingId={headingId}
        descId={descId}
        onClose={onClose}
        onDelete={handleDelete}
        deleting={deleting}
        loading={!!(open && effectiveId && q.isFetching && !viewData)}
        onRequestEdit={(seed) => {
          setEditInitial(seed);
          setStage("edit");
        }}
        asInner={asInner}
        initialForEdit={initialForEdit}
        lastEditPayload={lastEditPayload}
      />
    );

  if (asInner) {
    return portalChild;
  }

  return typeof document !== "undefined"
    ? createPortal(portalChild, document.body)
    : portalChild;
}
