"use client";

import * as React from "react";
import { PanelRight, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";

type Props = {
  overlay?: boolean;
  controlledOpen?: boolean;
  onChangeOpen?: (open: boolean) => void;
  className?: string;
};

export default function ToggleSidebar({
  overlay = false,
  controlledOpen,
  onChangeOpen,
  className,
}: Props) {
  const isControlled = typeof controlledOpen === "boolean";
  const [internal, setInternal] = React.useState(false);
  const open = isControlled ? (controlledOpen as boolean) : internal;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternal(next);
    onChangeOpen?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(!open);
    }
  };

  return (
    <Button
      type="button"
      variant={open ? "default" : "outline"}
      size="icon"
      aria-pressed={open}
      aria-label={open ? "사이드바 닫기" : "사이드바 열기"}
      data-state={open ? "on" : "off"}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
      className={cn(
        "h-10 w-10 rounded-xl pointer-events-auto transition-none", // hover시 변하지 않게
        "hover:opacity-100 hover:bg-opacity-100 hover:brightness-100", // 투명도 완전 고정
        open ? "shadow-md" : "shadow-sm",
        className
      )}
      style={{ zIndex: 10 }}
    >
      {open ? (
        <PanelRightOpen className="h-4 w-4" />
      ) : (
        <PanelRight className="h-4 w-4" />
      )}
    </Button>
  );
}
