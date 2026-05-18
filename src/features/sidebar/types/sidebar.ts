export interface SubListItem {
  id: string;
  title: string;

  /** ✅ 즐겨찾기 삭제/토글을 위한 원본 pinId */
  pinId?: string;

  /** ✅ 지도 포커싱용 좌표 (즐겨찾기 하위 매물) */
  lat?: number | null;
  lng?: number | null;

  /** (옵션) 예약일 등 표시용 */
  dateISO?: string;
}

export interface FavorateListItem {
  id: string;
  title: string;
  subItems: SubListItem[];
}

export interface ListItem {
  id: string;
  title: string;
  dateISO: string;
  createdAt?: string;

  /** 좌표 보정키: 답사예정 핀의 위치 기반 예약 식별용 (id 변경 대비) */
  posKey?: string;

  /** ✅ 지도 포커싱용 좌표 (답사지 예약 flat 리스트) */
  lat?: number | null;
  lng?: number | null;

  /** ✅ 답사지 예약의 원본 pinDraftId */
  pinDraftId?: string;
}

export interface PendingReservation {
  lat: number;
  lng: number;
  address: string;
  roadAddress?: string;
  jibunAddress?: string;
  propertyId?: string | null;
  propertyTitle?: string | null;
  dateISO?: string;
}

export interface SidebarSectionProps {
  title: string;
  items: ListItem[];
  nestedItems?: FavorateListItem[];
  onItemsChange: (items: ListItem[]) => void;
  onDeleteItem: (id: string) => void;
  onNestedItemsChange?: (items: FavorateListItem[]) => void;
  onDeleteNestedItem?: (id: string) => void;
  onDeleteSubItem?: (parentId: string, subId: string) => void;
  onUpdateGroupTitle?: (groupId: string, newTitle: string) => Promise<void>;
}

export interface ToggleSidebarProps {
  isSidebarOn: boolean;
  onToggleSidebar: () => void;

  /** ✅ 답사지 예약(flat 리스트) 클릭 시 지도 포커싱 */
  onFocusItemMap?: (item: ListItem) => void;

  /** ✅ 즐겨찾기 그룹 하위 매물 클릭 시 지도 포커싱 */
  onFocusSubItemMap?: (subItem: SubListItem) => void;
}
