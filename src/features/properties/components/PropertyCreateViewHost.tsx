"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

import type { PropertyItem } from "@/features/properties/types/propertyItem";
import type { LatLng } from "@/lib/geo/types";

import type { PinKind } from "@/features/pins/types";
import { PropertyViewDetails } from "../view/types";
import PropertyCreateModalBody from "../create/PropertyCreateModalBody";
import { PropertyCreateResult } from "../create/lib/types";
import PropertyViewModal from "../view/PropertyViewModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Stage = "create" | "view";

type Props = {
  open: boolean;

  /** 최초엔 create로 시작, 필요하면 view로 시작하는 케이스도 만들 수 있음 */
  initialStage?: Stage;

  // 공통
  onClose: () => void;

  // 생성 쪽
  initialAddress?: string;
  initialPos: LatLng;
  pinDraftId?: number | string | null;
  appendItem: (item: PropertyItem) => void;
  resetAfterCreate: () => void;
  /** 리스트/MapHomeUI와 동기화용 (지금 onAfterCreate 그대로 넘기면 됨) */
  onAfterCreate?: (args: {
    pinId?: string;
    matchedDraftId?: string | number | null;
    lat: number;
    lng: number;
    payload?: any;
    mode?: "visit-plan-only" | "create";
  }) => void;

  /** ✅ MapHomeUI에서 내려오는 기본 핀 종류 */
  initialPinKind?: PinKind | null;

  draftHeaderPrefill?: {
    title?: string;
    officePhone?: string;
  };

  // 뷰 쪽
  initialViewData?: PropertyViewDetails | null;
  onSaveViewPatch?: (p: Partial<PropertyViewDetails>) => void | Promise<void>;
  onDeleteFromView?: () => void | Promise<void>;

  /** ✅ 뷰 모달 안에서 수정모달 저장 성공 시 map 핀 갱신용 콜백 */
  onLabelChanged?: () => void | Promise<void>;

  /** ✅ 생성/답사예정 저장 후 현재 뷰포트 기준 핀 refetch (usePinsMap.refetch) */
  refetchPins?: () => void | Promise<void>;
};

export default function PropertyCreateViewHost({
  open,
  initialStage = "create",
  onClose,
  initialAddress,
  initialPos,
  pinDraftId,
  appendItem,
  resetAfterCreate,
  onAfterCreate,
  initialPinKind,
  draftHeaderPrefill,
  initialViewData,
  onSaveViewPatch,
  onDeleteFromView,
  onLabelChanged,
  refetchPins, // ⭐ 새로 추가된 prop 구조분해
}: Props) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [createdPinId, setCreatedPinId] = useState<string | number | null>(
    initialViewData?.id ?? null
  );

  // ✅ 모달이 열려있을 때 바디 스크롤 차단 (PWA 깜빡임 방지 핵심)
  useBodyScrollLock(open);


  // 🔹 PropertyCreateModalBody 에 넘길 때 null → undefined 로 정리
  const resolvedPinDraftId: string | number | undefined =
    pinDraftId == null ? undefined : pinDraftId;

  // 생성 쪽 onSubmit: 성공하면 mode에 따라 처리
  const handleCreateSubmit = useCallback(
    async (
      result: PropertyCreateResult & {
        mode?: "visit-plan-only" | "create" | string;
      }
    ) => {
      const { pinId, matchedDraftId, payload, lat, lng } = result;
      const mode = result.mode;

      // 상위(MapHomeUI) 동기화 로직
      onAfterCreate?.({
        pinId: pinId ? String(pinId) : undefined,
        matchedDraftId,
        lat,
        lng,
        payload,
        mode:
          mode === "visit-plan-only" || mode === "create" ? mode : undefined,
      });

      // 🔥 답사예정 간단등록(visit-plan-only) 이거나 pinId가 없으면 → 그냥 닫기
      if (mode === "visit-plan-only" || !pinId) {
        onClose();
        return;
      }

      // 일반 매물 생성: 생성 직후 뷰로 전환
      setCreatedPinId(pinId);
      setStage("view");
    },
    [onAfterCreate, onClose]
  );

  if (!open) return null;

  // ✅ 예전 Create/Edit 모달과 동일한 프레임 구조로 복구
  //    - 전체 화면(fixed inset-0)
  //    - 카드: flex-col + overflow-hidden
  //    - sm에선 전체 h-screen, md 이상에서 max-h-[92vh]
  const frame = (inner: React.ReactNode) => (
    <div
      className="fixed inset-0 z-[99999] isolate transform-gpu"
      style={{
        transform: "translateZ(0)",
        overscrollBehavior: "none",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "transform",
      }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="닫기"
        title="닫기"
      />
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "bg-white shadow-xl overflow-hidden flex flex-col",
          "w-full h-full max-w-none max-h-none rounded-none",
          "lg:w-[1100px] lg:max-w-[95vw] lg:max-h-[92vh] lg:rounded-2xl"

        )}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </div>
    </div>

  );


  let content: React.ReactNode;

  if (stage === "create") {
    content = (
      <PropertyCreateModalBody
        asInner
        onClose={onClose}
        onSubmit={handleCreateSubmit}
        initialAddress={initialAddress}
        initialLat={initialPos.lat}
        initialLng={initialPos.lng}
        pinDraftId={resolvedPinDraftId}
        initialPinKind={initialPinKind ?? undefined}
        draftHeaderPrefill={draftHeaderPrefill ?? null}
        /** ⭐ 답사예정 저장 시 useCreateSave에서 직접 refetchPins 호출 */
        refetchPins={refetchPins}
      />
    );
  } else {
    content = (
      <PropertyViewModal
        asInner
        open={true}
        onClose={onClose}
        pinId={createdPinId ?? undefined}
        data={initialViewData ?? undefined}
        onSave={onSaveViewPatch}
        onDelete={onDeleteFromView}
        onLabelChanged={onLabelChanged}
      />
    );
  }

  return typeof document !== "undefined"
    ? createPortal(frame(content), document.body)
    : frame(content);
}
