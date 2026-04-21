"use client";

import type React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";
import type { CompletionRegistryFormSlice } from "@/features/properties/edit/types/editForm.slices";
import HeaderContainer from "../containers/HeaderContainer";
import ImagesContainer from "../containers/ImagesContainer";
import BasicInfoContainer from "../containers/BasicInfoContainer";
import NumbersContainer from "../containers/NumbersContainer";
import ParkingContainer from "../containers/ParkingContainer";
import CompletionRegistryContainer from "../containers/CompletionRegistryContainer";
import AspectsContainer from "../containers/AspectsContainer";
import AreaSetsContainer from "../containers/AreaSetsContainer";
import StructureLinesContainer from "../containers/StructureLinesContainer";
import OptionsContainer from "../containers/OptionsContainer";
import MemosContainer from "../containers/MemosContainer";
import FooterButtons from "@/features/properties/components/sections/FooterButtons/FooterButtons";

/* ───────── 공통 Alert Dialog ───────── */
export type EditAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
};

export function EditAlertDialog({
  open,
  onOpenChange,
  message,
}: EditAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>안내</DialogTitle>
          <DialogDescription asChild>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
              {message}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            확인
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Embedded: 모바일 제한 안내 레이아웃 ───────── */
export type EmbeddedRestrictionLayoutProps = {
  headerForm: any;
  onClose: () => void;
};

export function EmbeddedRestrictionLayout({
  headerForm,
  onClose,
}: EmbeddedRestrictionLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <HeaderContainer form={headerForm as any} onClose={onClose} />

      <div className="flex-1 grid place-items-center px-4 py-6 text-sm text-slate-700">
        <p className="whitespace-pre-line text-center leading-relaxed">
          {
            "모바일 환경에서는 매물정보 수정이 제한됩니다.\nPC 환경에서 다시 시도해 주세요."
          }
        </p>
      </div>
    </div>
  );
}

/* ───────── Embedded: 전체 편집 레이아웃 ───────── */
export type EmbeddedEditLayoutProps = {
  headerForm: any;
  onClose: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  imagesProp: any;
  form: any;
  mountParking: boolean;
  parkingForm: any;
  completionRegistryForm: CompletionRegistryFormSlice;
  save: () => void;
  canSaveNow: boolean;
};

export function EmbeddedEditLayout({
  headerForm,
  onClose,
  scrollRef,
  imagesProp,
  form,
  mountParking,
  parkingForm,
  completionRegistryForm,
  save,
  canSaveNow,
}: EmbeddedEditLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <HeaderContainer form={headerForm as any} onClose={onClose} />

      {/* ✅ 스크롤 컨테이너에 ref 연결 */}
      <div
        ref={scrollRef}
        className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6 px-4 lg:px-5 py-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
      >
        <ImagesContainer images={imagesProp} />
        <div className="space-y-4 lg:space-y-6 overflow-visible">
          <BasicInfoContainer form={form} />
          <NumbersContainer form={form} />
          {mountParking && <ParkingContainer form={parkingForm as any} />}
          <CompletionRegistryContainer form={completionRegistryForm} />
          <AspectsContainer form={form} />
          <AreaSetsContainer form={form} />
          <StructureLinesContainer form={form} />
          <OptionsContainer form={form} />
          <MemosContainer form={form} />
          <div className="h-16 lg:hidden" />
        </div>
      </div>

      <FooterButtons onClose={onClose} onSave={save} canSave={canSaveNow} />
    </div>
  );
}

/* ───────── Modal: 모바일 제한 안내 레이아웃 ───────── */
export type ModalRestrictionLayoutProps = {
  onClose: () => void;
};

export function ModalRestrictionLayout({
  onClose,
}: ModalRestrictionLayoutProps) {
  return (
    <div
      className="fixed inset-0 z-[99999] isolate transform-gpu"
      style={{
        transform: "translateZ(0)",
        overscrollBehavior: "none",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "transform",
      }}
    >

      {/* 배경 딤 */}
      <div
        className="absolute inset-0 z-[1000] bg-black/40 pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />
      {/* 안내 전용 패널 */}
      <div className="absolute left-1/2 top-1/2 z-[1001] w-[420px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl flex flex-col pointer-events-auto overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">매물정보 수정 제한</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 h-8 text-xs hover:bg-muted"
          >
            닫기
          </button>
        </div>
        <div className="p-5 text-sm text-slate-700 leading-relaxed">
          <p className="whitespace-pre-line text-center">
            {
              "모바일 환경에서는 매물정보 수정이 제한되어 있습니다.\nPC 환경에서 다시 시도해 주세요."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Modal: 전체 편집 레이아웃 ───────── */
export type ModalEditLayoutProps = {
  headerForm: any;
  onClose: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  imagesProp: any;
  form: any;
  mountParking: boolean;
  parkingForm: any;
  completionRegistryForm: CompletionRegistryFormSlice;
  save: () => void;
  canSaveNow: boolean;
};

export function ModalEditLayout({
  headerForm,
  onClose,
  scrollRef,
  imagesProp,
  form,
  mountParking,
  parkingForm,
  completionRegistryForm,
  save,
  canSaveNow,
}: ModalEditLayoutProps) {
  return (
    <div
      className="fixed inset-0 z-[99999] isolate transform-gpu"
      style={{
        transform: "translateZ(0)",
        overscrollBehavior: "none",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "transform",
      }}
    >

      {/* 배경 딤 */}
      <div
        className="absolute inset-0 z-[1000] bg-black/40 pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />
      {/* 모달 컨텐츠 */}
      <div className="absolute left-1/2 top-1/2 z-[1001] w-[1100px] max-w-[95vw] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl flex flex-col pointer-events-auto overflow-hidden">
        <HeaderContainer form={headerForm as any} onClose={onClose} />

        {/* embedded 버전과 동일하게 + ref 연결 */}
        <div
          ref={scrollRef}
          className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6 px-4 lg:px-5 py-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
        >
          {/* 좌측: 이미지 */}
          <div className="relative z-[1]">
            <ImagesContainer images={imagesProp} />
          </div>

          {/* 우측: 폼 */}
          <div className="relative z-[2] space-y-4 lg:space-y-6">
            <BasicInfoContainer form={form} />
            <NumbersContainer form={form} />
            {mountParking && <ParkingContainer form={parkingForm as any} />}
            <CompletionRegistryContainer form={completionRegistryForm} />
            <AspectsContainer form={form} />
            <AreaSetsContainer form={form} />
            <StructureLinesContainer form={form} />
            <OptionsContainer form={form} />
            <MemosContainer form={form} />
            <div className="h-16 lg:hidden" />
          </div>
        </div>

        <FooterButtons onClose={onClose} onSave={save} canSave={canSaveNow} />
      </div>
    </div>
  );
}
