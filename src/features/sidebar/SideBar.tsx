"use client";

import type React from "react";
import { useMemo, useCallback, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import type { ToggleSidebarProps } from "./types/sidebar";
import type { ListItem, SubListItem } from "./types/sidebar";
import { useSidebar } from "./SideBarProvider";
import { SidebarSection } from "./components/SidebarSection";
import { ContractRecordsButton } from "./components/ContractRecordsButton";
import { AdminButton } from "./components/AdminButton";
import { MyPageButton } from "./components/MyPageButton";

import { useScheduledReservations } from "../survey-reservations/hooks/useScheduledReservations";
import { useReorderReservations } from "../survey-reservations/hooks/useReorderReservations";
import { useCancelReservation } from "../survey-reservations/hooks/useCancelReservation";
import { useSignout } from "../auth/hooks/useSignout";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../users/api/account";
import { cn } from "@/lib/cn";

/** ✅ MapHomeUI에서 내려줄 지도이동 콜백들을 포함한 Sidebar props */
type SidebarProps = ToggleSidebarProps & {
  /** 답사지 예약(위 flat 리스트) 클릭 시 지도 이동 */
  onFocusItemMap?: (item: ListItem) => void;
  /** 즐겨찾기 그룹 하위 매물 클릭 시 지도 이동 */
  onFocusSubItemMap?: (subItem: SubListItem) => void;
};

export function Sidebar({
  isSidebarOn,
  onToggleSidebar,
  onFocusItemMap,
  onFocusSubItemMap,
}: SidebarProps) {
  // 0) 안전 기본값
  const {
    nestedFavorites = [],
    favoritesLoading,
    setNestedFavorites,
    handleDeleteNestedFavorite,
    handleDeleteSubFavorite,
    handleContractRecordsClick,
    updateFavoriteGroupTitle,
  } = useSidebar();

  // 1) 훅 호출(조건문 밖)
  const { items, setItems, refetch } = useScheduledReservations();

  const { onReorder } = useReorderReservations({
    items: items ?? [],
    setItems,
    onSuccess: () => refetch(),
    onAfterSuccessRefetch: () => refetch(),
  });

  const { onCancel } = useCancelReservation(items ?? [], setItems, () =>
    refetch()
  );

  // ✅ 로그아웃 훅
  const { mutate: doSignout, isPending: isSigningOut } = useSignout();

  // ✅ 프로필 정보 가져오기
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000, // 10분
  });

  // 2) 파생 리스트 - 내 예약만 필터링
  const listItems: ListItem[] = useMemo(
    () =>
      (items ?? [])
        .filter((r) => r.isMine === true)
        .map((r) => ({
          id: String(r.id),
          title: r.addressLine ?? (r.posKey ? `좌표 ${r.posKey}` : "주소 미확인"),
          dateISO: r.reservedDate ?? "",
          // ✅ 있다면 lat/lng도 함께 내려서 지도 이동에 활용
          lat: (r as any).lat,
          lng: (r as any).lng,
        })),
    [items]
  );

  const handleListItemsChange = useCallback((_nextList: ListItem[]) => {
    // no-op (현재는 드래그 순서만 서버에 반영, 리스트 자체는 API 기준)
  }, []);

  /* ───────── 모바일 드래그-다운 닫기용 상태 ───────── */
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY ?? 0;
    startYRef.current = y;
    setDragY(0);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || startYRef.current == null) return;
    const y = e.touches[0]?.clientY ?? 0;
    const delta = y - startYRef.current;

    if (delta > 0) {
      setDragY(delta); // 아래로만
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const threshold = 80; // 이 이상 내려가면 닫기

    if (dragY > threshold) {
      onToggleSidebar?.();
      setDragY(0);
    } else {
      // 원위치로 부드럽게 복귀
      setDragY(0);
    }

    setIsDragging(false);
    startYRef.current = null;
  };

  /* ───────── 섹션 아코디언 상태 (한 번에 하나만 열기) ───────── */
  type SectionKey = "exploration" | "favorites" | null;
  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const toggleExploration = () => {
    setOpenSection((prev) => (prev === "exploration" ? null : "exploration"));
  };

  const toggleFavorites = () => {
    setOpenSection((prev) => (prev === "favorites" ? null : "favorites"));
  };

  // 3) 조기 리턴 (모든 훅 정의 후)
  if (!isSidebarOn) return null;

  const rootClass = cn(
    "fixed z-[80] bg-white shadow-xl border border-gray-300 overflow-hidden",
    // 📱 모바일: 바텀시트
    "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-x-0 max-md:border-t",
    // 🖥 데스크탑: 기존 위치 유지
    "md:top-16 md:right-4 md:bottom-auto md:left-auto md:w-80 md:rounded-lg"
  );

  return (
    <div
      className={rootClass}
      style={{
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: isDragging ? "none" : "transform 0.18s ease-out",
      }}
    >
      <style jsx>{`
        .scrollbar-no-arrows::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>

      {/* 📱 드래그 핸들 (모바일 전용) */}
      <div
        className="max-md:block hidden pt-2 pb-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto h-1 w-12 rounded-full bg-gray-300" />
      </div>

      {/* 내용 스크롤 영역 */}
      <div className="flex flex-col gap-2 p-1 max-h-[80vh] max-md:max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-track-white scrollbar-thumb-black hover:scrollbar-thumb-gray-800 scrollbar-no-arrows">
        {/* ✅ 답사지 예약 섹션 */}
        <SidebarSection
          title="답사지 예약"
          items={listItems}
          onItemsChange={handleListItemsChange}
          onDeleteItem={(id) => onCancel(id)}
          onReorderIds={onReorder}
          expanded={openSection === "exploration"}
          onToggleExpanded={toggleExploration}
          // ✅ 리스트 아이템 클릭 시 지도 이동 콜백 전달 (ExplorationItem에서 사용)
          onFocusItemMap={onFocusItemMap}
        />

        {/* 즐겨찾기 */}
        <SidebarSection
          title={favoritesLoading ? "즐겨찾기 (로딩 중...)" : "즐겨찾기"}
          items={[]} // 평면 리스트 없음
          nestedItems={favoritesLoading ? [] : nestedFavorites}
          onItemsChange={() => {}}
          onDeleteItem={() => {}}
          onNestedItemsChange={setNestedFavorites}
          onDeleteNestedItem={handleDeleteNestedFavorite}
          onDeleteSubItem={handleDeleteSubFavorite}
          onUpdateGroupTitle={updateFavoriteGroupTitle}
          expanded={openSection === "favorites"}
          onToggleExpanded={toggleFavorites}
          // ✅ 즐겨찾기 하위 매물(SubListItem) 클릭 시 지도 이동 콜백 전달
          onFocusSubItemMap={onFocusSubItemMap}
        />

        <ContractRecordsButton onClick={handleContractRecordsClick} />
        <MyPageButton />
        {profile?.role === "admin" && <AdminButton />}

        <div className="flex justify-between items-center p-2 border-t border-gray-200">
          <span className="text-base font-medium text-gray-700">
            {profile?.account?.name || "사용자 계정"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => doSignout()}
            disabled={isSigningOut}
            className="p-0"
            title="로그아웃"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
