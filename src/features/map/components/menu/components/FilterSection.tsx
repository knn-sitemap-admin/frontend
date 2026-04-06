"use client";

import * as React from "react";
import { ChevronDown, Map, Building2, House, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import { MapMenuKey } from "../types/mapMenu.types";

type IconDef = LucideIcon | string;

type FilterItem = {
  key: MapMenuKey;
  label: string;
  icon: IconDef;
};

const FILTER_MENU_ITEMS: FilterItem[] = [
  { key: "all", label: "전체", icon: Map },
  { key: "new", label: "신축", icon: Building2 },
  { key: "old", label: "구옥", icon: House },
  { key: "completed", label: "입주완료", icon: CheckCircle2 },
  { key: "plannedOnly", label: "답사예정", icon: "/pins/question-pin.svg" },
];

interface FilterSectionProps {
  active: MapMenuKey;
  activeSubmenu: "filter" | "edit" | null;
  onSubmenuClick: (submenu: "filter" | "edit") => void;
  onMenuItemClick: (key: MapMenuKey) => void;
}

export const FilterSection: React.FC<FilterSectionProps> = React.memo(
  function FilterSection({
    active,
    activeSubmenu,
    onSubmenuClick,
    onMenuItemClick,
  }) {
    const isOpen = activeSubmenu === "filter";
    const panelId = "mapmenu-filter-panel";

    const handleToggle = React.useCallback(() => {
      onSubmenuClick("filter");
    }, [onSubmenuClick]);

    const items = React.useMemo(
      () =>
        FILTER_MENU_ITEMS.map((item) => {
          const isActive = active === item.key;
          const Icon =
            typeof item.icon === "string" ? null : (item.icon as LucideIcon);

          return (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMenuItemClick(item.key)}
              className={cn(
                "h-7 w-full justify-start p-1 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-gray-600 hover:bg-gray-100"
              )}
              aria-pressed={isActive}
              title={item.label}
            >
              {Icon ? (
                <Icon className="mr-2 h-3 w-3" aria-hidden />
              ) : (
                <img
                  src={item.icon as string}
                  alt=""
                  className="mr-2 h-3 w-3"
                />
              )}
              <span>{item.label}</span>
            </Button>
          );
        }),
      [active, onMenuItemClick]
    );

    return (
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-8 justify-between text-gray-700 hover:bg-gray-100"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="text-xs">필터</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>

        {isOpen && (
          <div id={panelId} className="mx-3 space-y-0.5">
            {items}
          </div>
        )}
      </div>
    );
  }
);
