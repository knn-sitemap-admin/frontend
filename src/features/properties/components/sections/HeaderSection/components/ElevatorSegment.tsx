import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";

type ElevatorValue = "O" | "X" | null;

const ElevatorSegment = ({
  value,
  onChange,
}: {
  value: ElevatorValue; // ⬅ "O" | "X" | null 허용
  onChange: (v: ElevatorValue) => void;
}) => {
  const isO = value === "O";
  const isX = value === "X";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={() => onChange(isO ? null : "O")}
        variant="outline"
        size="default"
        className={cn(
          "px-5 h-9 text-sm rounded-md",
          isO
            ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        )}
        title="엘리베이터 O"
      >
        O
      </Button>
      <Button
        type="button"
        onClick={() => onChange(isX ? null : "X")}
        variant="outline"
        size="default"
        className={cn(
          "px-5 h-9 text-sm rounded-md",
          isX
            ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        )}
        title="엘리베이터 X"
      >
        X
      </Button>
    </div>
  );
};

export default ElevatorSegment;
