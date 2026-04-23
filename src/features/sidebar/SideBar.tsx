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
import { SchedulesButton } from "./components/SchedulesButton";

import { useScheduledReservations } from "../survey-reservations/hooks/useScheduledReservations";
import { useReorderReservations } from "../survey-reservations/hooks/useReorderReservations";
import { useCancelReservation } from "../survey-reservations/hooks/useCancelReservation";
import { useSignout } from "../auth/hooks/useSignout";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../users/api/account";
import { cn } from "@/lib/cn";
import { SalesContractRecordsModal } from "../contract-records";

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
    // 🔸 추가: 임시핀(Drafts)
    siteReservations = [],
    isContractModalOpen,
    setIsContractModalOpen,
    selectedContract,
    setSelectedContract,
    activeFavGroupId,
    setActiveFavGroupId,
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

  // 2) 파생 리스트 구성 (임시핀 + 확정 예약)
  const listItems: ListItem[] = useMemo(() => {
    const isAdmin = profile?.role === "admin" || profile?.role === "manager";

    // 2-a) 확정 예약 필터링 & 매핑
    const filteredScheduled = (items ?? []).filter((r) => {
      if (isAdmin) return true; // 관리자는 전체
      return r.isMine === true; // 일반 사용자는 내 것만
    });

    // 2-b) 확정 예약 목록만 반환 (임시핀 제외)
    return filteredScheduled.map((r) => ({
      id: String(r.id),
      title: r.addressLine ?? (r.posKey ? `좌표 ${r.posKey}` : "주소 미확인"),
      dateISO: r.reservedDate ?? "",
      lat: (r as any).lat,
      lng: (r as any).lng,
      isDraft: false,
    }));
  }, [items, profile?.role]);

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
    "fixed z-[80] bg-white/60 backdrop-blur-xl shadow-2xl border border-white/60 overflow-hidden",
    // 📱 모바일: 바텀시트
    "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:rounded-t-[32px] max-md:rounded-b-none max-md:border-x-0 max-md:border-t-white/40",
    // 🖥 데스크탑: 기존 위치 유지
    "md:top-16 md:right-4 md:bottom-auto md:left-auto md:w-80 md:rounded-[32px]"
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
        className="max-md:block hidden pt-3 pb-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300/50" />
      </div>

      {/* 내용 스크롤 영역 */}
      <div className="flex flex-col h-full max-h-[85vh] md:max-h-[80vh]">
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 scrollbar-no-arrows">
          {/* ✅ 답사지 예약 섹션 */}
          <SidebarSection
            title="답사지 예약"
            items={listItems}
            onItemsChange={handleListItemsChange}
            onDeleteItem={(id) => onCancel(id)}
            onReorderIds={onReorder}
            expanded={openSection === "exploration"}
            onToggleExpanded={toggleExploration}
            onFocusItemMap={onFocusItemMap}
          />

          {/* 즐겨찾기 */}
          <SidebarSection
            title={favoritesLoading ? "즐겨찾기 (로딩 중...)" : "즐겨찾기"}
            items={[]}
            nestedItems={favoritesLoading ? [] : nestedFavorites}
            onItemsChange={() => { }}
            onDeleteItem={() => { }}
            onNestedItemsChange={setNestedFavorites}
            onDeleteNestedItem={handleDeleteNestedFavorite}
            onDeleteSubItem={handleDeleteSubFavorite}
            onUpdateGroupTitle={updateFavoriteGroupTitle}
            expanded={openSection === "favorites"}
            onToggleExpanded={toggleFavorites}
            onFocusSubItemMap={onFocusSubItemMap}
            activeFavGroupId={activeFavGroupId}
            onToggleFilterGroup={(id) => setActiveFavGroupId(activeFavGroupId === id ? null : id)}
          />

          <div className="space-y-2 mt-2 pb-2">
            <ContractRecordsButton onClick={handleContractRecordsClick} />
            <SchedulesButton />
            <MyPageButton />
            {profile?.role === "admin" && <AdminButton />}
          </div>
        </div>

        {/* 👤 사용자 섹션 (하단 고정 및 컴팩트 레이아웃) */}
        <div className="px-4 py-3 bg-white/50 backdrop-blur-md border-t border-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs shadow-inner border border-emerald-500/20">
              {profile?.account?.name?.[0] || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800 leading-none">
                {profile?.account?.name || "사용자"}
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-tighter font-semibold">
                {profile?.role || "USER"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => doSignout()}
            disabled={isSigningOut}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
            title="로그아웃"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>

      <SalesContractRecordsModal
        isOpen={isContractModalOpen}
        onClose={() => {
          setIsContractModalOpen(false);
          setSelectedContract(null);
        }}
        data={selectedContract ?? undefined}
        onDataChange={() => {
          refetch(); // 계약 저장 후 답사지 예약 목록 새로고침
        }}
      />
    </div>
  );
}
