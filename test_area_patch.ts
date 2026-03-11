import { toPinPatch } from './src/features/properties/edit/lib/toPinPatch';
import { buildUpdatePayload } from './src/features/properties/edit/lib/buildUpdatePayload/buildUpdatePayload';

const initial = {
  options: {
    hasAircon: true,
    hasFridge: false,
    hasWasher: false,
    hasDryer: false,
    hasBidet: false,
    hasAirPurifier: false,
    isDirectLease: false,
    hasIslandTable: true,
    hasKitchenWindow: true,
    hasCityGas: true,
    hasInduction: false,
    kitchenLayout: "LINE",
    fridgeSlot: "2",
    sofaSize: "SEAT_2",
    livingRoomView: "BLOCKED",
    extraOptionsText: null
  },
  units: [
    {rooms: 2, baths: 1, hasLoft: true, hasTerrace: false, minPrice: 23, maxPrice: 23, note: "노트메모 테스트"}
  ],
  areaGroups: []
};

const form = {
  options: ["에어컨", "아일랜드 식탁", "주방창", "도시가스"],
  kitchenLayout: "LINE",
  fridgeSlot: "2",
  sofaSize: "SEAT_2",
  livingRoomView: "BLOCKED",
  etcChecked: false,

  unitLines: [
    {rooms: 2, baths: 1, duplex: true, terrace: false, primary: 23, secondary: 23, note: "노트메모 테스트"}
  ],

  baseAreaSet: {
    title: "",
    exMinM2: "", exMaxM2: "", exMinPy: "", exMaxPy: "", realMinM2: "", realMaxM2: "", realMinPy: "", realMaxPy: ""
  },
  extraAreaSets: [],
  areaSetsTouched: false,
  aspectsTouched: false,
  packAreas: () => ({
    exclusiveArea: undefined,
    realArea: undefined,
    extraExclusiveAreas: [],
    extraRealAreas: [],
    baseAreaTitleOut: "",
    extraAreaTitlesOut: []
  })
};

const patch = toPinPatch(form, initial);
console.log("toPinPatch result:", patch);

const updatePayload = buildUpdatePayload(form as any, initial as any);
console.log("buildUpdatePayload result:", updatePayload);
