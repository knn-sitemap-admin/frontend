import * as React from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fallback?: React.ReactNode; // 커스텀 대체 UI
};

export function SafeImg({
  src,
  alt = "",
  className,
  fallbackClassName,
  fallback,
}: Props) {
  const [errored, setErrored] = React.useState(false);
  const valid = typeof src === "string" && src.trim().length > 0;

  if (!valid || errored) {
    return (
      fallback ?? (
        <div
          className={fallbackClassName ?? "bg-gray-200"}
          aria-label="no-image"
        />
      )
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src!}
      alt={alt}
      className={className ? `${className} no-save` : "no-save"}
      onError={() => setErrored(true)}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
