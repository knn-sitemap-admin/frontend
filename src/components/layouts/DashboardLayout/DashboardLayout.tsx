"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button/Button";
import { Card } from "@/components/atoms/Card/Card";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/atoms/Sheet/Sheet";
import { MenuIcon, SearchIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

type DashboardLayoutProps = {
  /** 좌측 사이드바 섹션(그룹) */
  nav?: NavSection[];
  /** 상단 헤더 중앙 영역(보통 검색바) */
  headerCenter?: React.ReactNode;
  /** 상단 헤더 오른쪽 액션들 (버튼, 아바타 등) */
  headerActions?: React.ReactNode;
  /** 로고(기본 NoteMap) */
  logo?: React.ReactNode;
  /** 하단 푸터(선택) */
  footer?: React.ReactNode;
  /** 메인 콘텐츠 */
  children: React.ReactNode;
  /** 커스텀 클래스 */
  className?: string;
};

export function DashboardLayout({
  nav,
  headerCenter,
  headerActions,
  logo = (
    <Link href="/" className="font-bold text-lg">
      NoteMap
    </Link>
  ),
  footer,
  children,
  className,
}: DashboardLayoutProps) {
  const [open, setOpen] = React.useState(false);

  const SidebarContent = (
    <div className="flex h-full flex-col gap-4">
      <div className="px-4 pt-4">{logo}</div>
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-4">
          {(nav ?? []).map((section, i) => (
            <div key={i}>
              {section.title ? (
                <div className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">
                  {section.title}
                </div>
              ) : null}
              <ul className="space-y-1">
                {section.items.map((item, j) => (
                  <li key={`${i}-${j}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition",
                        item.active ? "bg-muted font-medium" : "text-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      {footer ? <div className="px-4 pb-4">{footer}</div> : null}
    </div>
  );

  return (
    <div className={cn("grid min-h-screen grid-rows-[auto,1fr]", className)}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          {/* Mobile: open sidebar */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 py-3">
                <SheetTitle className="text-base">{logo}</SheetTitle>
                <SheetDescription className="hidden">사이드바 메뉴</SheetDescription>
              </SheetHeader>
              {SidebarContent}
            </SheetContent>
          </Sheet>

          {/* Desktop logo (collapsed with sidebar) */}
          <div className="hidden lg:block shrink-0">{logo}</div>

          {/* Center (search 등) - 모바일에서는 공간이 부족하므로 숨기거나 축소 */}
          <div className="flex-1 flex justify-center lg:justify-start lg:ml-6 min-w-0">
            <div className="w-full max-w-md lg:max-w-none">
              {headerCenter ?? (
                <Card className="hidden lg:flex h-9 items-center gap-2 px-2 bg-muted/50 border-none shadow-none">
                  <SearchIcon className="h-4 w-4 opacity-60" />
                  <input
                    className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="검색…"
                  />
                </Card>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">{headerActions}</div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr]">
        {/* Desktop sidebar */}
        <aside className="relative hidden border-r bg-background lg:block">
          <div className="sticky top-14 h-[calc(100vh-56px)]">
            {SidebarContent}
          </div>
        </aside>

        {/* Main content */}
        <main className="p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
