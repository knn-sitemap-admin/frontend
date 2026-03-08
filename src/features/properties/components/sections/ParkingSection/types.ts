import { PRESETS } from "./constants";

export interface ParkingSectionProps {
  parkingType: string | null;
  setParkingType: (v: string | null) => void;

  /** 총 주차대수: 미입력(null), 그 외는 number */
  parkingCount: number | null;
  setParkingCount: (v: number | null) => void;
}

export type Preset = (typeof PRESETS)[number];
