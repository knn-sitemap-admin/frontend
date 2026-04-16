import React from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface MapZoomSliderProps {
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  onLevelChange: (level: number) => void;
}

export const MapZoomSlider = ({
  currentLevel,
  minLevel,
  maxLevel,
  onLevelChange,
}: MapZoomSliderProps) => {
  // 카카오 맵 레벨은 1이 가장 확대(Zoom In), 12가 가장 축소(Zoom Out)임.
  // 사용자의 직관에 맞게 위쪽(+)이 확대, 아래쪽(-)이 축소가 되도록 슬라이더 값을 매핑함.
  // 슬라이더의 물리적 값: 1(아래) ~ 12(위)
  const sliderValue = maxLevel + minLevel - currentLevel;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const actualLevel = maxLevel + minLevel - val;
    onLevelChange(actualLevel);
  };

  const zoomIn = () => {
    if (currentLevel > minLevel) onLevelChange(currentLevel - 1);
  };

  const zoomOut = () => {
    if (currentLevel < maxLevel) onLevelChange(currentLevel + 1);
  };

  return (
    <div className="flex flex-col items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-2xl border border-white/20 select-none">
      <button
        onClick={zoomIn}
        disabled={currentLevel <= minLevel}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 transition-all active:scale-90 disabled:opacity-30"
      >
        <Plus className="w-4 h-4" />
      </button>

      <div className="relative h-28 w-8 flex justify-center items-center py-1">
        {/* 커스텀 슬라이더 (Vertical) */}
        <input
          type="range"
          min={minLevel}
          max={maxLevel}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="appearance-none w-24 h-1 bg-gray-100 rounded-lg cursor-pointer accent-emerald-500 hover:accent-emerald-600 focus:outline-none -rotate-90 origin-center"
          style={{ width: '80px' }}
        />
        
        {/* 레벨 표시기 (인버전 대응) */}
        <div className="absolute -left-8 flex flex-col justify-between h-full py-1 text-[9px] font-bold text-gray-300 pointer-events-none">
          <span>{minLevel}</span>
          <span>{maxLevel}</span>
        </div>
      </div>

      <button
        onClick={zoomOut}
        disabled={currentLevel >= maxLevel}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 transition-all active:scale-90 disabled:opacity-30"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="mt-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black tracking-tighter">
        LV.{currentLevel}
      </div>
    </div>
  );
};
