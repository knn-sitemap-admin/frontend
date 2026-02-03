"use client";

const PillCheckboxGroup = <T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<T>;
  value: readonly T[];
  onChange: (v: T[]) => void;
}) => {
  const toggle = (opt: T) => {
    const next = value.includes(opt)
      ? value.filter((x) => x !== opt)
      : [...value, opt];
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={name}
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((opt) => {
        const id = `${name}-${opt}`;
        const checked = value.includes(opt);
        return (
          <label
            key={opt}
            htmlFor={id}
            className={[
              "inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-1 md:px-3 text-sm whitespace-nowrap",
              "border transition-colors select-none cursor-pointer",
              checked
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              className="sr-only"
              checked={checked}
              onChange={() => toggle(opt)}
            />
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  );
};

export default PillCheckboxGroup;
