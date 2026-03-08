"use client";

import {
  useCallback,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import type { LatLng } from "@/lib/geo/types";
import type { PropertyItem } from "@/features/properties/types/propertyItem";
import { applyPatchToItem } from "@/features/properties/lib/view/applyPatchToItem";
import { toViewDetails } from "@/features/properties/lib/view/toViewDetails";
import { toViewSourceFromPropertyItem, normalizeLL } from "./mapHome.utils";
import type { LocalCreateFromPinArgs } from "./mapHome.types";
import type { CreatePayload } from "@/features/properties/types/property-dto";
import type { PinKind } from "@/features/pins/types";
import type { PropertyViewDetails } from "@/features/properties/view/types";
import { buildEditPatchWithMedia } from "@/features/properties/edit/lib/buildEditPatch";

type UsePropertyModalsArgs = {
  items: PropertyItem[];
  setItems: Dispatch<SetStateAction<PropertyItem[]>>;

  drafts: any[] | undefined;

  draftPin: LatLng | null;
  menuAnchor: LatLng | null;
  menuRoadAddr: string | null;
  menuJibunAddr: string | null;

  createFromDraftId: string | null;
  setCreateFromDraftId: (id: string | null) => void;

  setDraftPinSafe: (pin: LatLng | null) => void;
  hideDraft: (draftId: string | number | null | undefined) => void;
  refetch: () => void;

  closeMenu: () => void;
  deletePinLocally?: (id: string | number) => void;
};

export function usePropertyModals({
  items,
  setItems,
  drafts,
  draftPin,
  menuAnchor,
  menuRoadAddr,
  menuJibunAddr,
  createFromDraftId,
  setCreateFromDraftId,
  setDraftPinSafe,
  hideDraft,
  refetch,
  closeMenu,
  deletePinLocally,
}: UsePropertyModalsArgs) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [createPos, setCreatePos] = useState<LatLng | null>(null);
  const [createPinKind, setCreatePinKind] = useState<PinKind | null>(null);
  const [prefillAddress, setPrefillAddress] = useState<string | undefined>();

  const [draftHeaderPrefill, setDraftHeaderPrefill] = useState<{
    title?: string;
    officePhone?: string;
  } | null>(null);

  const onSaveViewPatch = useCallback(
    async (patch: Partial<PropertyViewDetails>) => {
      setItems((prev) =>
        prev.map((p) => (p.id === selectedId ? applyPatchToItem(p, patch) : p))
      );
    },
    [selectedId, setItems]
  );

  const onDeleteFromView = useCallback(async () => {
    if (selectedId) {
      deletePinLocally?.(selectedId);
    }
    setItems((prev) => prev.filter((p) => p.id !== selectedId));
    setViewOpen(false);
    setSelectedId(null);
  }, [selectedId, setItems, deletePinLocally]);

  const onSubmitEdit = useCallback(
    async (payload: CreatePayload) => {
      if (!selectedId) return;
      const patch = await buildEditPatchWithMedia(payload, String(selectedId));
      setItems((prev) =>
        prev.map((p) =>
          String(p.id) === String(selectedId)
            ? applyPatchToItem(p as any, patch as any)
            : p
        )
      );
      setEditOpen(false);
    },
    [selectedId, setItems]
  );

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setDraftPinSafe(null);
    setPrefillAddress(undefined);
    setCreateFromDraftId(null);
    setCreatePos(null);
    setCreatePinKind(null);
    setDraftHeaderPrefill(null);
  }, [setDraftPinSafe, setCreateFromDraftId]);

  const closeView = useCallback(() => setViewOpen(false), []);
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const onEditFromView = useCallback(() => {
    setViewOpen(false);
    setEditOpen(true);
  }, []);

  const openViewFromMenu = useCallback(
    (id: string) => {
      setSelectedId(id);
      closeMenu();
      setViewOpen(true);
    },
    [closeMenu]
  );

  const openCreateFromMenu = useCallback(
    (args?: LocalCreateFromPinArgs) => {
      let anchor: LatLng | null = null;

      const isVisitPlanOnly = !!args?.visitPlanOnly;
      setCreatePinKind(isVisitPlanOnly ? "question" : null);

      // 상단 헤더 프리필 초기화
      setDraftHeaderPrefill(null);

      const titleFromArgs =
        (args as any)?.name ??
        (args as any)?.title ??
        (args as any)?.propertyTitle ??
        undefined;

      const officePhoneFromArgs =
        (args as any)?.officePhone ??
        (args as any)?.contactMainPhone ??
        undefined;

      if (titleFromArgs || officePhoneFromArgs) {
        setDraftHeaderPrefill({
          title: titleFromArgs,
          officePhone: officePhoneFromArgs,
        });
      }

      // 1순위: args.fromPinDraftId, 2순위: 기존 createFromDraftId
      const explicitDraftId =
        args?.fromPinDraftId != null ? String(args.fromPinDraftId) : null;
      const effectiveDraftId = explicitDraftId ?? createFromDraftId;

      if (effectiveDraftId != null) {
        setCreateFromDraftId(effectiveDraftId);

        const matchedDraft = (drafts ?? []).find(
          (d: any) => String(d.id) === effectiveDraftId
        );

        if (matchedDraft) {
          const title =
            (matchedDraft as any).title ??
            (matchedDraft as any).name ??
            titleFromArgs ??
            undefined;

          const officePhone =
            (matchedDraft as any).officePhone ??
            (matchedDraft as any).contactMainPhone ??
            officePhoneFromArgs ??
            undefined;

          if (title || officePhone) {
            setDraftHeaderPrefill({
              title,
              officePhone,
            });
          }
        }
      } else {
        setCreateFromDraftId(null);
      }

      if (args) {
        const lat = (args as any).lat ?? (args as any).latFromPin ?? null;
        const lng = (args as any).lng ?? (args as any).lngFromPin ?? null;

        if (lat != null && lng != null) {
          anchor = normalizeLL({ lat, lng });
        }
      }

      if (!anchor) {
        anchor =
          menuAnchor ??
          draftPin ??
          (selected ? normalizeLL((selected as any).position) : null);
      }

      setCreatePos(anchor);
      closeMenu();

      const prefill =
        args?.address ??
        (args as any)?.roadAddress ??
        (args as any)?.jibunAddress ??
        menuRoadAddr ??
        menuJibunAddr ??
        undefined;

      setPrefillAddress(prefill);
      setCreateOpen(true);

      if (process.env.NODE_ENV !== "production") {
        console.debug("[openCreateFromMenu]", {
          args,
          effectiveDraftId,
        });
      }
    },
    [
      drafts,
      menuAnchor,
      draftPin,
      selected,
      menuRoadAddr,
      menuJibunAddr,
      closeMenu,
      createFromDraftId,
      setCreateFromDraftId,
    ]
  );

  const onViewFromMenu = useCallback(
    (id: string | number) => openViewFromMenu(String(id)),
    [openViewFromMenu]
  );
  const onCreateFromMenu = openCreateFromMenu;

  const createHostHandlers = useMemo(
    () => ({
      onClose: closeCreate,
      appendItem: (item: PropertyItem) => setItems((prev) => [item, ...prev]),
      selectAndOpenView: (id: string | number) => {
        const sid = String(id);
        setSelectedId(sid);
        setViewOpen(true);
      },
      resetAfterCreate: closeCreate,
      onAfterCreate: (res: { matchedDraftId?: string | number | null }) => {
        if (res?.matchedDraftId != null) {
          hideDraft(res.matchedDraftId);
        }
        refetch();
      },
    }),
    [closeCreate, hideDraft, refetch, setItems]
  );

  const editHostHandlers = useMemo(
    () => ({
      onClose: () => setEditOpen(false),
      updateItems: setItems,
      onSubmit: onSubmitEdit,
      onLabelChanged: refetch,
    }),
    [onSubmitEdit, setItems, refetch]
  );

  const selectedViewItem = useMemo(() => {
    if (!selected) return null;
    const id = String(selected.id);
    const view = toViewDetails(toViewSourceFromPropertyItem(selected)) as any;

    if (!view.id) view.id = id;
    if (!view.propertyId) view.propertyId = id;

    const withEditInitial = {
      ...view,
      editInitial: { view: { ...view } },
    };

    return withEditInitial as PropertyViewDetails & { editInitial: any };
  }, [selected]);

  const selectedPos = useMemo<LatLng | null>(() => {
    if (createPos) return createPos;
    if (menuAnchor) return menuAnchor;
    if (draftPin) return draftPin;
    if (selected) return normalizeLL((selected as any).position);
    return null;
  }, [createPos, menuAnchor, draftPin, selected]);

  /** ✅ createFromDraftId(string) → pinDraftId(number) 변환 */
  const pinDraftIdForCreate = useMemo(() => {
    if (!createFromDraftId) return undefined;
    const n = Number(createFromDraftId);
    return Number.isFinite(n) ? n : undefined;
  }, [createFromDraftId]);

  return {
    // selection
    selectedId,
    setSelectedId,
    selected,
    selectedViewItem,
    selectedPos,

    // modals
    viewOpen,
    setViewOpen,
    editOpen,
    setEditOpen,
    createOpen,
    setCreateOpen,
    prefillAddress,
    closeCreate,
    closeView,
    closeEdit,
    onEditFromView,

    // view/edit handlers
    onSaveViewPatch,
    onDeleteFromView,
    onSubmitEdit,

    // create from menu
    createPos,
    createPinKind,
    setCreatePinKind,
    draftHeaderPrefill,
    openViewFromMenu,
    openCreateFromMenu,
    onViewFromMenu,
    onCreateFromMenu,

    // host bridge
    createHostHandlers,
    editHostHandlers,

    /** ✅ ModalsHost로 넘길 pin-drafts용 id (number) */
    pinDraftId: pinDraftIdForCreate,
  } as const;
}
