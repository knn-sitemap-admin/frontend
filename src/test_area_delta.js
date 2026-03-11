"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toPinPatch_1 = require("./features/properties/edit/lib/toPinPatch");
const initial = {
    areaGroups: [
        {
            title: "",
            exclusiveMinM2: null,
            exclusiveMaxM2: null,
            actualMinM2: null,
            actualMaxM2: null,
            units: []
        }
    ]
};
const form = {
    options: [],
    unitLines: [
        {
            rooms: 2, baths: 1, hasLoft: true, hasTerrace: false, minPrice: 23, maxPrice: 23, note: "노트메모 테스트"
        }
    ],
    hasElevator: null,
    buildingTypes: [],
    baseAreaSet: {
        title: "",
        exMinPy: "", exMinM2: "18",
        exMaxPy: "", exMaxM2: "",
        realMinM2: "", realMaxM2: "21", realMinPy: "", realMaxPy: ""
    },
    extraAreaSets: [],
    areaSetsTouched: false,
    aspectsTouched: false,
};
const patch = (0, toPinPatch_1.toPinPatch)(form, initial);
console.log(JSON.stringify(patch, null, 2));
