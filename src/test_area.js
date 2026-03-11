"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toPinPatch_1 = require("./features/properties/edit/lib/toPinPatch");
const initial = {
    areaGroups: []
};
const form = {
    options: [],
    unitLines: [],
    hasElevator: null,
    buildingTypes: [],
    baseAreaSet: {
        title: "",
        exMinPy: "10", exMinM2: "33.057",
        exMaxPy: "", exMaxM2: "",
        realMinM2: "", realMaxM2: "", realMinPy: "", realMaxPy: ""
    },
    extraAreaSets: [],
    areaSetsTouched: true,
    aspectsTouched: false,
};
const patch = (0, toPinPatch_1.toPinPatch)(form, initial);
console.log(JSON.stringify(patch, null, 2));
