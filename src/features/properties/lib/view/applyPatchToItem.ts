import type { PropertyItem } from "@/features/properties/types/propertyItem";
import {
  normalizeImageCards,
  normalizeImages,
  flattenCards,
} from "@/features/properties/lib/media/normalize";
import { PropertyViewDetails } from "../../view/types";

/**
 * View에서 넘어온 patch(Partial<PropertyViewDetails>)를 기존 PropertyItem에 병합.
 * - 이미지 관련(카드/세로)은 normalize 해서 반영
 * - 레거시 호환 필드(imageCards/imagesByCard/imageCardCounts/imagesVertical)는 유지
 * - pinKind는 item 레벨 + view 레벨 모두 동기화(있을 때만)
 */
export function applyPatchToItem(
  p: PropertyItem,
  patch: Partial<PropertyViewDetails> & { pinKind?: string }
): PropertyItem {
  return {
    ...p,
    title: patch.title ?? p.title,
    address: patch.address ?? p.address,
    // ViewModel의 salePrice를 item.priceText로 반영
    priceText: (patch as any).salePrice ?? p.priceText,

    // item 레벨의 pinKind 동기화(있을 때만)
    ...("pinKind" in patch && patch.pinKind !== undefined
      ? { pinKind: (patch as any).pinKind }
      : { pinKind: (p as any).pinKind }),

    view: {
      ...(p as any).view,

      // view 레벨의 pinKind 동기화(있을 때만)
      ...("pinKind" in patch && patch.pinKind !== undefined
        ? { pinKind: (patch as any).pinKind }
        : { pinKind: (p as any).view?.pinKind }),

      // ✅ 이미지 카드/이미지 병합 (레거시 호환 포함)
      ...(() => {
        const cand = (patch as any).imageCards;
        if (Array.isArray(cand)) {
          const cards = normalizeImageCards(cand);
          return {
            imageCards: cards,
            images: flattenCards(cards),
            // 레거시 호환 필드
            imagesByCard: cards,
            imageCardCounts: cards.map((c) => c.length),
          };
        }
        if ("images" in patch && Array.isArray((patch as any).images)) {
          // cards 미제공 + images만 왔을 때
          return { images: normalizeImages((patch as any).images) };
        }
        // 아무 것도 없으면 기존 유지
        return {
          images: (p as any).view?.images,
          imageCards: (p as any).view?.imageCards,
          imagesByCard: (p as any).view?.imagesByCard,
          imageCardCounts: (p as any).view?.imageCardCounts,
        };
      })(),

      // 세로형 파일(레거시: imagesVertical)
      fileItems: Array.isArray((patch as any).fileItems)
        ? normalizeImages((patch as any).fileItems)
        : (p as any).view?.fileItems,
      imagesVertical: Array.isArray((patch as any).fileItems)
        ? normalizeImages((patch as any).fileItems)
        : (p as any).view?.imagesVertical,

      // refs들은 그대로 보존(패치 있으면 대체)
      _imageCardRefs: Array.isArray((patch as any)._imageCardRefs)
        ? (patch as any)._imageCardRefs
        : (p as any).view?._imageCardRefs,
      _fileItemRefs: Array.isArray((patch as any)._fileItemRefs)
        ? (patch as any)._fileItemRefs
        : (p as any).view?._fileItemRefs,

      // 일반 필드들
      publicMemo: (patch as any).publicMemo ?? (p as any).view?.publicMemo,
      secretMemo: (patch as any).secretMemo ?? (p as any).view?.secretMemo,
      officePhone: (patch as any).officePhone ?? (p as any).view?.officePhone,
      officePhone2:
        (patch as any).officePhone2 ?? (p as any).view?.officePhone2,
      options: (patch as any).options ?? (p as any).view?.options,
      optionEtc: (patch as any).optionEtc ?? (p as any).view?.optionEtc,
      registry: (patch as any).registry ?? (p as any).view?.registry,
      unitLines: (patch as any).unitLines ?? (p as any).view?.unitLines,
      orientations: Array.isArray((patch as any).orientations)
        ? (patch as any).orientations
        : (p as any).view?.orientations,

      listingStars:
        typeof (patch as any).listingStars === "number"
          ? (patch as any).listingStars
          : (p as any).view?.listingStars,

      elevator:
        (patch as any).elevator !== undefined
          ? (patch as any).elevator
          : (p as any).view?.elevator,

      parkingType: (patch as any).parkingType ?? (p as any).view?.parkingType,

      // ✅ parkingCount: totalParkingSlots도 함께 고려
      parkingCount:
        (patch as any).parkingCount ??
        (patch as any).totalParkingSlots ??
        (p as any).view?.parkingCount,

      slopeGrade: (patch as any).slopeGrade ?? (p as any).view?.slopeGrade,
      structureGrade:
        (patch as any).structureGrade ?? (p as any).view?.structureGrade,

      aspect: (patch as any).aspect ?? (p as any).view?.aspect,
      aspectNo: (patch as any).aspectNo ?? (p as any).view?.aspectNo,
      aspect1: (patch as any).aspect1 ?? (p as any).view?.aspect1,
      aspect2: (patch as any).aspect2 ?? (p as any).view?.aspect2,
      aspect3: (patch as any).aspect3 ?? (p as any).view?.aspect3,

      totalBuildings:
        (patch as any).totalBuildings ?? (p as any).view?.totalBuildings,
      totalFloors: (patch as any).totalFloors ?? (p as any).view?.totalFloors,
      totalHouseholds:
        (patch as any).totalHouseholds ?? (p as any).view?.totalHouseholds,
      remainingHouseholds:
        (patch as any).remainingHouseholds ??
        (p as any).view?.remainingHouseholds,

      completionDate:
        (patch as any).completionDate ?? (p as any).view?.completionDate,
      exclusiveArea:
        (patch as any).exclusiveArea ?? (p as any).view?.exclusiveArea,
      realArea: (patch as any).realArea ?? (p as any).view?.realArea,
      extraExclusiveAreas:
        (patch as any).extraExclusiveAreas ??
        (p as any).view?.extraExclusiveAreas,
      extraRealAreas:
        (patch as any).extraRealAreas ?? (p as any).view?.extraRealAreas,

      baseAreaTitle:
        (patch as any).baseAreaTitle !== undefined
          ? (patch as any).baseAreaTitle
          : (p as any).view?.baseAreaTitle,
      extraAreaTitles:
        (patch as any).extraAreaTitles !== undefined
          ? (patch as any).extraAreaTitles
          : (p as any).view?.extraAreaTitles,

      // ✅ 건물유형 & 리베이트 텍스트도 반영
      buildingType:
        (patch as any).buildingType ?? (p as any).view?.buildingType,
      buildingTypes:
        (patch as any).buildingTypes ?? (p as any).view?.buildingTypes,
      rebateText: (patch as any).rebateText ?? (p as any).view?.rebateText,
    },
  };
}
