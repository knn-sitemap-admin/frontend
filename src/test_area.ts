import { toPinPatch } from './features/properties/edit/lib/toPinPatch';
import { toPy, toM2 } from './features/properties/lib/area';

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
    exMaxPy: "",   exMaxM2: "", 
    realMinM2: "", realMaxM2: "", realMinPy: "", realMaxPy: ""
  },
  extraAreaSets: [],
  areaSetsTouched: true,
  aspectsTouched: false,
};

const patch = toPinPatch(form, initial);
console.log(JSON.stringify(patch, null, 2));
