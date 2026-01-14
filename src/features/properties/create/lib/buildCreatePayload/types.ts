import type {
  AspectRowLite,
  Grade,
  Registry,
  UnitLine,
} from "@/features/properties/types/property-domain";
import type { ImageItem } from "@/features/properties/types/media";
import type { PinKind } from "@/features/pins/types";
import type { AreaSet as StrictAreaSet } from "@/features/properties/components/sections/AreaSetsSection/types";
import type {
  KitchenLayout,
  FridgeSlot,
  SofaSize,
  LivingRoomView,
} from "@/features/properties/types/property-dto";
import { StarStr } from "@/features/properties/types/property-dto";

/** 느슨한 AreaSet (필드가 일부 비어 있을 수 있음) */
export type LooseAreaSet = Partial<
  Pick<
    StrictAreaSet,
    | "title"
    | "exMinM2"
    | "exMaxM2"
    | "exMinPy"
    | "exMaxPy"
    | "realMinM2"
    | "realMaxM2"
    | "realMinPy"
    | "realMaxPy"
  >
>;

/** 느슨한 AreaSet -> 엄격 AreaSet */
export const toStrictAreaSet = (
  raw: LooseAreaSet | StrictAreaSet
): StrictAreaSet => ({
  title: String((raw as any)?.title ?? ""),
  exMinM2: String((raw as any)?.exMinM2 ?? ""),
  exMaxM2: String((raw as any)?.exMaxM2 ?? ""),
  exMinPy: String((raw as any)?.exMinPy ?? ""),
  exMaxPy: String((raw as any)?.exMaxPy ?? ""),
  realMinM2: String((raw as any)?.realMinM2 ?? ""),
  realMaxM2: String((raw as any)?.realMaxM2 ?? ""),
  realMinPy: String((raw as any)?.realMinPy ?? ""),
  realMaxPy: String((raw as any)?.realMaxPy ?? ""),
});

/** ---------- 빌더 Args ---------- */
export type BuildArgs = {
  title: string;
  address: string;
  officeName: string;
  officePhone: string;
  officePhone2: string;
  moveIn: string;
  floor: string;
  roomNo: string;
  structure: string;

  badge?: string | null;

  parkingGrade: StarStr;
  parkingType: string | null;
  totalParkingSlots?: number | string | null;

  completionDate?: string;
  salePrice: string;

  minRealMoveInCost?: number | string | null;
  rebateText?: string | null;

  baseAreaSet: LooseAreaSet | StrictAreaSet;
  extraAreaSets: Array<LooseAreaSet | StrictAreaSet>;

  elevator?: "O" | "X" | null;
  isNew?: boolean | null;
  isOld?: boolean | null;

  registryOne?: Registry;
  slopeGrade?: Grade;
  structureGrade?: Grade;

  totalBuildings: string;
  totalFloors: string;
  totalHouseholds: string;
  remainingHouseholds: string;

  buildingType?: string | null;
  registrationTypeId?: number | string | null;

  options: string[];
  etcChecked: boolean;
  optionEtc: string;
  publicMemo: string;
  secretMemo: string;
  // ✅ Nullable Enum 4개 (별도 관리)
  kitchenLayout?: KitchenLayout | null;
  fridgeSlot?: FridgeSlot | null;
  sofaSize?: SofaSize | null;
  livingRoomView?: LivingRoomView | null;

  aspects: AspectRowLite[];
  unitLines: UnitLine[];

  imageFolders: (ImageItem[] | { title?: string; items: ImageItem[] })[];
  fileItems: ImageItem[];

  pinKind?: PinKind | null;

  lat?: number | null;
  lng?: number | null;

  pinDraftId?: number | string | null;
};
