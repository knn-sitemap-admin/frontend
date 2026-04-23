"use client";

import { useCallback, useRef, useState } from "react";
import type { PinKind } from "@/features/pins/types";
import type { UnitLine } from "@/features/properties/types/property-domain";

import { useScheduledReservations } from "@/features/survey-reservations/hooks/useScheduledReservations";
import { mapPinKindToBadge } from "@/features/properties/lib/badge";

import {
  isValidIsoDateStrict,
  normalizeDateInput,
  numOrNull,
  validateAreaSets,
  validateUnitPriceRanges,
} from "../useCreateValidation";
import { isValidPhoneKR } from "@/features/properties/edit/lib/editValidation";
import { computeCanSave } from "./helpers";
import { buildCreatePayload } from "../../lib/buildCreatePayload";
import type { PropertyCreateModalProps } from "../../lib/types";
import { createPin, createPinDraft, CreatePinDto } from "@/shared/api/pins";

type MediaDeps = {
  imageFolders: any[];
  fileItems: any[];
  imagesProp: any;
  hasImageFolderWithTitle: boolean;
  persistOneCard: (pinId: string | number, folderIdx: number) => Promise<void>;
  persistVerticalFiles: (pinId: string | number) => Promise<void>;
};

type Args = {
  form: any; // useCreateForm 반환 타입
  initialLat?: number | string | null;
  initialLng?: number | string | null;
  pinDraftId?: number | string | null;
  isVisitPlanPin: boolean;
  media: MediaDeps;
  onSubmit?: PropertyCreateModalProps["onSubmit"];
  onClose?: () => void;
  refetchPins?: () => void;
};

export function useCreateSave({
  form: f,
  initialLat,
  initialLng,
  pinDraftId,
  isVisitPlanPin,
  media,
  onSubmit,
  onClose,
  refetchPins,
}: Args) {
  const { removeByPinDraftId: removeDraft } = useScheduledReservations();

  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const mainTitle = (f.title ?? "").trim();
  const mainOfficePhone = (f.officePhone ?? "").trim();

  const { canSave, debug } = computeCanSave({
    form: f,
    isVisitPlanPin,
    mainTitle,
    mainOfficePhone,
    hasImageFolderWithTitle: media.hasImageFolderWithTitle,
    isSaving,
  });

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    const {
      imageFolders,
      fileItems,
      hasImageFolderWithTitle,
      persistOneCard,
      persistVerticalFiles,
    } = media;

    try {

      if (!f.title.trim()) {
        alert("매물명을 입력해 주세요.");
        return;
      }

      const latNum = Number(initialLat);
      const lngNum = Number(initialLng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        alert("좌표가 유효하지 않습니다. (initialLat/initialLng 미전달)");
        return;
      }

      const rawPinKindLocal = (f as any).pinKind as PinKind | null | undefined;

      /* ====== 1) 답사예정핀 전용 분기 ====== */
      if (isVisitPlanPin) {
        if (!mainTitle) {
          alert("매물명을 입력해 주세요.");
          return;
        }
        if (!isValidPhoneKR(f.officePhone)) {
          alert("분양사무실 전화번호를 정확히 입력해 주세요.");
          return;
        }

        // 핀 종류는 옵셔널

        const addressLine = (f.address && f.address.trim()) || mainTitle;
        const subPhone = (f.officePhone2 ?? "").trim();

        const draft = await createPinDraft({
          lat: latNum,
          lng: lngNum,
          addressLine,
          name: mainTitle,
          contactMainPhone: mainOfficePhone,
          ...(subPhone !== "" ? { contactSubPhone: subPhone } : {}),
        });

        // ⭐ createPinDraft 결과에서 draftId 추출
        const draftId =
          typeof draft === "object" && draft && "id" in draft
            ? (draft as any).id
            : draft;

        const matchedDraftId =
          draftId != null ? (Number(draftId) as number) : undefined;

        // ⭐ MapHomeUI 쪽 onAfterCreate → refreshViewportPins 타게 하기 위해
        //    visit-plan-only 결과도 onSubmit으로 올려보내기
        await Promise.resolve(
          onSubmit?.({
            pinId: undefined, // 실매물 없음
            matchedDraftId: matchedDraftId ?? null,
            lat: latNum,
            lng: lngNum,
            payload: {
              mode: "visit-plan-only",
              title: mainTitle,
              officePhone: mainOfficePhone,
            },
            mode: "visit-plan-only",
          } as any)
        );
        refetchPins?.();

        // 기존 동작 유지: 모달 닫기
        onClose?.();
        return;
      }

      /* ====== 2) 일반핀 저장(createPin) 로직 ====== */

      // 사진 폴더 제목과 사진은 옵셔널

      // 핀 종류는 옵셔널

      if (!f.isSaveEnabled) {
        alert("필수 항목을 확인해 주세요.");
        return;
      }

      // 가격/면적 검증은 입력된 값이 있을 때만 체크 (옵셔널)
      const unitLinesArray = Array.isArray(f.unitLines) ? f.unitLines : [];
      if (unitLinesArray.length > 0) {
        const priceError = validateUnitPriceRanges(
          unitLinesArray as any[],
          f.remainingHouseholds
        );
        if (priceError) {
          alert(priceError);
          return;
        }
      }

      // 면적 입력이 있을 때만 검증
      const hasAreaInput = (set: any) => {
        if (!set) return false;
        return !!(
          (set.exMinM2 && set.exMinM2.trim()) ||
          (set.exMaxM2 && set.exMaxM2.trim()) ||
          (set.exMinPy && set.exMinPy.trim()) ||
          (set.exMaxPy && set.exMaxPy.trim()) ||
          (set.realMinM2 && set.realMinM2.trim()) ||
          (set.realMaxM2 && set.realMaxM2.trim()) ||
          (set.realMinPy && set.realMinPy.trim()) ||
          (set.realMaxPy && set.realMaxPy.trim()) ||
          (Array.isArray(set.units) && set.units.length > 0)
        );
      };

      const extraAreaSetsArray = Array.isArray(f.extraAreaSets)
        ? f.extraAreaSets
        : [];
      const hasAnyAreaInput =
        hasAreaInput(f.baseAreaSet) || extraAreaSetsArray.some(hasAreaInput);

      if (hasAnyAreaInput) {
        const areaError = validateAreaSets(
          f.baseAreaSet,
          extraAreaSetsArray,
          f.remainingHouseholds
        );
        if (areaError) {
          alert(areaError);
          return;
        }
      }

      const rawCompletion = normalizeDateInput(f.completionDate);
      const normalizedCompletion =
        rawCompletion && rawCompletion.length >= 10
          ? rawCompletion.slice(0, 10)
          : rawCompletion;

      if (normalizedCompletion && !isValidIsoDateStrict(normalizedCompletion)) {
        alert("준공일은 YYYY-MM-DD 형식으로 입력해 주세요.");
        return;
      }

      const anyForm = f as any;
      const parkingTypesForm = Array.isArray(anyForm.parkingTypes)
        ? anyForm.parkingTypes.filter(Boolean)
        : [];
      const buildingTypesForm = Array.isArray(anyForm.buildingTypes)
        ? anyForm.buildingTypes.filter(Boolean)
        : [];

      const rawMinRealMoveInCost =
        anyForm.minRealMoveInCost ??
        anyForm.minRealMoveInCostText ??
        anyForm.minRealMoveInCostRaw ??
        null;

      const minRealMoveInCost = numOrNull(rawMinRealMoveInCost);

      const rawRebate = String(anyForm.rebateRaw ?? "").trim();
      const rebateNumeric = rawRebate.replace(/[^\d]/g, "");
      const rebateText: string | null = rebateNumeric
        ? rebateNumeric.slice(0, 50)
        : null;

      const hasBuildingGrade =
        anyForm.buildingGrade != null ||
        anyForm.isNew === true ||
        anyForm.isOld === true;

      if (!hasBuildingGrade) {
        alert("신축/구옥을 선택해 주세요.");
        return;
      }
      if (anyForm.elevator !== "O" && anyForm.elevator !== "X") {
        alert("엘리베이터 유무를 선택해 주세요.");
        return;
      }
      if (!rebateText) {
        alert("리베이트를 입력해 주세요.");
        return;
      }

      const grade = anyForm.buildingGrade as "new" | "old" | null | undefined;

      const isNewForPayload =
        anyForm.isNew === true
          ? true
          : anyForm.isOld === true
            ? false
            : grade === "new"
              ? true
              : grade === "old"
                ? false
                : null;

      const isOldForPayload =
        anyForm.isOld === true
          ? true
          : anyForm.isNew === true
            ? false
            : grade === "old"
              ? true
              : grade === "new"
                ? false
                : null;

      const effectiveBadge =
        (f.badge ?? "").trim() ||
        (rawPinKindLocal ? mapPinKindToBadge(rawPinKindLocal) : "") ||
        undefined;

      /** 🔹 옵션 배열 → extraOptionsText용 문자열로 변환
       *  - 지금은 모든 옵션을 join, 필요하면 나중에 "프리셋 외의 옵션만"으로 좁혀도 됨
       */
      const optionsArray: string[] = Array.isArray(f.options)
        ? f.options.map((v: any) => String(v).trim()).filter(Boolean)
        : [];
      const extraOptionsText = optionsArray.join(", ");
      const hasExtraOptionsText = extraOptionsText.trim().length > 0;

      const payload = buildCreatePayload({
        title: f.title,
        address: f.address,
        officeName: f.officeName,
        officePhone: f.officePhone,
        officePhone2: f.officePhone2,
        moveIn: f.moveIn,
        floor: f.floor,
        roomNo: f.roomNo,
        structure: f.structure,

        badge: effectiveBadge ?? null,

        parkingGrade: f.parkingGrade,
        parkingType: f.parkingType ?? null,
        parkingTypes: parkingTypesForm,
        totalParkingSlots: f.totalParkingSlots,

        completionDate: normalizedCompletion,
        salePrice: f.salePrice,

        minRealMoveInCost,
        rebateText,

        baseAreaSet: f.baseAreaSet,
        extraAreaSets: Array.isArray(f.extraAreaSets) ? f.extraAreaSets : [],

        elevator: f.elevator,
        isNew: isNewForPayload,
        isOld: isOldForPayload,
        registryOne: f.registryOne,
        slopeGrade: f.slopeGrade,
        structureGrade: f.structureGrade,

        totalBuildings: f.totalBuildings,
        totalFloors: f.totalFloors,
        totalHouseholds: f.totalHouseholds,
        remainingHouseholds: f.remainingHouseholds,

        buildingType: (f as any).buildingType ?? null,
        buildingTypes: buildingTypesForm,
        registrationTypeId: (f as any).registrationTypeId ?? null,

        // ✅ 옵션 배열 + extraOptionsText 소스
        options: optionsArray,
        etcChecked: hasExtraOptionsText,
        optionEtc: extraOptionsText,

        publicMemo: f.publicMemo,
        secretMemo: f.secretMemo,
        // ✅ Nullable Enum 4개 (별도 관리)
        kitchenLayout: f.kitchenLayout,
        fridgeSlot: f.fridgeSlot,
        sofaSize: f.sofaSize,
        livingRoomView: f.livingRoomView,

        aspects: f.aspects,
        unitLines: f.unitLines as UnitLine[],

        imageFolders,
        fileItems,

        pinKind: rawPinKindLocal ?? undefined,
        lat: latNum,
        lng: lngNum,

        pinDraftId,
      });

      const { rebate: _ignoredRebate, ...payloadWithoutRebate } =
        payload as any;

      const dto: CreatePinDto = {
        ...(payloadWithoutRebate as any),
        lat: latNum,
        lng: lngNum,
        addressLine: f.address ?? null,
        name: f.title.trim(),
        publicMemo: f.publicMemo ?? null,
        privateMemo: f.secretMemo ?? null,
        minRealMoveInCost,
        rebateText,
        isNew: isNewForPayload ?? undefined,
        isOld: isOldForPayload ?? undefined,
        pinKind: rawPinKindLocal ?? undefined,
        pinDraftId,
      } as any;

      const createdPin = await createPin(dto);
      const createdData = (createdPin as any)?.data ?? createdPin;
      const pinId =
        createdData?.id ?? createdData?.pinId ?? createdData?.pin_id ?? null;

      if (pinId != null) {
        for (let i = 0; i < (imageFolders as any[]).length; i++) {
          await persistOneCard(pinId, i);
        }
        if (fileItems.length > 0) {
          await persistVerticalFiles(pinId);
        }
      }

      if (pinDraftId != null) {
        removeDraft(pinDraftId);
      }

      await Promise.resolve(
        onSubmit?.({
          pinId: String(pinId),
          matchedDraftId: pinDraftId ?? null,
          lat: latNum,
          lng: lngNum,
          payload,
          mode: "create",
        } as any)
      );
      // ⬆️ 일반핀 생성의 경우 여기서 onClose는 호출하지 않는다.
      // 생성 모달을 닫고 뷰모달을 여는 책임은 부모(onSubmit 핸들러)에서 처리.
    } catch (e) {
      console.error("[PropertyCreate] save error:", e);
      const msg =
        (e as any)?.responseData?.messages?.join("\n") ||
        (e as any)?.message ||
        "저장 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.";
      alert(msg);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [
    f,
    media,
    initialLat,
    initialLng,
    isVisitPlanPin,
    mainTitle,
    mainOfficePhone,
    onClose,
    onSubmit,
    pinDraftId,
    removeDraft,
    refetchPins,
  ]);

  return { save, canSave, isSaving };
}
