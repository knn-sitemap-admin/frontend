"use client";

import { useRef, useMemo, useEffect } from "react";

import type { PropertyCreateModalProps } from "./lib/types";
import type { AreaSet as StrictAreaSet } from "@/features/properties/components/sections/AreaSetsSection/types";

import { useCreateForm } from "./hooks/useCreateForm/useCreateForm";
import { useCreateMedia } from "./hooks/useCreateMedia";

import {
  AreaSetsContainer,
  AspectsContainer,
  BasicInfoContainer,
  CompletionRegistryContainer,
  HeaderContainer,
  ImagesContainer,
  MemosContainer,
  NumbersContainer,
  OptionsContainer,
  ParkingContainer,
  StructureLinesContainer,
} from "./ui";
import { useVisitPlanMode } from "./hooks/useVisitPlanMode";
import { useParkingForm } from "./hooks/useParkingForm";
import { useCreateSave } from "./hooks/useCreateSave/useCreateSave";
import { toStrictAreaSet } from "./lib/toStrictAreaSet";
import { PRESET_OPTIONS, STRUCTURE_PRESETS } from "../components/constants";
import FooterButtons from "../components/sections/FooterButtons/FooterButtons";

type Props = Omit<PropertyCreateModalProps, "open"> & {
  asInner?: boolean;
  initialPinKind?: import("@/features/pins/types").PinKind | null;
  draftHeaderPrefill?: {
    title?: string;
    officePhone?: string;
  } | null;
  refetchPins?: () => void;
};

export default function PropertyCreateModalBody({
  onClose,
  onSubmit,
  initialAddress,
  initialLat,
  initialLng,
  pinDraftId,
  asInner,
  initialPinKind,
  draftHeaderPrefill,
  refetchPins,
}: Props) {
  const form = useCreateForm({
    initialAddress,
    pinDraftId,
    draftHeaderPrefill,
  });

  const media = useCreateMedia();
  const { imageFolders } = media;

  const { isVisitPlanPin } = useVisitPlanMode({
    form,
    pinDraftId,
    initialPinKind,
  });

  const parkingForm = useParkingForm(form);

  /* === 생성 카드 내부 스크롤 컨테이너의 가로 스크롤 강제 리셋 === */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const { save, canSave, isSaving } = useCreateSave({
    form,
    initialLat,
    initialLng,
    pinDraftId,
    isVisitPlanPin,
    media,
    onSubmit,
    onClose,
    refetchPins,
  });

  // AreaSetsContainer용 어댑터
  const areaForm = useMemo(
    () => ({
      baseAreaSet: toStrictAreaSet(form.baseAreaSet),
      setBaseAreaSet: (v: StrictAreaSet) => form.setBaseAreaSet(v),
      extraAreaSets: (Array.isArray(form.extraAreaSets)
        ? form.extraAreaSets
        : []
      ).map(toStrictAreaSet),
      setExtraAreaSets: (arr: StrictAreaSet[]) => form.setExtraAreaSets(arr),
    }),
    [
      form.baseAreaSet,
      form.extraAreaSets,
      form.setBaseAreaSet,
      form.setExtraAreaSets,
    ]
  );

  const content = (
    <>
      <HeaderContainer
        form={form}
        onClose={onClose}
        isVisitPlanPin={isVisitPlanPin}
      />

      <div
        ref={scrollRef}
        className="
          flex-1 min-h-0
          overflow-y-auto overflow-x-hidden overscroll-y-contain
          px-4 py-4 md:px-5 md:py-4
        "
      >
        <div
          className="
            grid gap-4 md:gap-6
            grid-cols-1 md:grid-cols-[300px_1fr]
          "
        >
          <fieldset
            disabled={isVisitPlanPin}
            className={isVisitPlanPin ? "opacity-60" : ""}
          >
            <ImagesContainer images={media.imagesProp} />
          </fieldset>

          <div className="space-y-6 min-w-0">
            <BasicInfoContainer form={form} />

            <fieldset
              disabled={isVisitPlanPin}
              className={isVisitPlanPin ? "opacity-60" : ""}
            >
              <div className="space-y-6">
                <NumbersContainer form={form} />
                <ParkingContainer form={parkingForm} />
                <CompletionRegistryContainer
                  form={form}
                  isVisitPlanPin={isVisitPlanPin}
                />
                <AspectsContainer form={form} isVisitPlanPin={isVisitPlanPin} />
                <AreaSetsContainer form={areaForm} />
                <StructureLinesContainer
                  form={form}
                  presets={STRUCTURE_PRESETS}
                  isVisitPlanPin={isVisitPlanPin}
                />
                <OptionsContainer form={form} PRESET_OPTIONS={PRESET_OPTIONS} />
                <MemosContainer form={form} />
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      <FooterButtons
        onClose={onClose}
        onSave={save}
        canSave={canSave}
        isSaving={isSaving}
      />
    </>
  );

  if (asInner) return content;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div 
        className="absolute left-1/2 top-1/2 w-[1100px] max-w-[95vw] max-h-[92vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col transform-gpu"
        style={{
          transform: "translate3d(-50%, -50%, 0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );
}
