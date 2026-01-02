"use client";

import * as React from "react";
import { useMe } from "@/shared/api/auth/auth";
import { togglePinDisabled } from "@/shared/api/pins";

type Args = {
  propertyIdClean: string | null;
  listed: boolean;
  isSearchDraft: boolean;
  onDeleteProperty?: (id: string | null) => void | Promise<void>;
  onClose?: () => void;
};

export function useDeletePropertyFromMenu({
  propertyIdClean,
  listed,
  isSearchDraft,
  onDeleteProperty,
  onClose,
}: Args) {
  const { data: me } = useMe();

  /** 매물 삭제 여부 상태 */
  const [deleting, setDeleting] = React.useState(false);

  // 🔐 삭제 권한: admin / manager(팀장)만
  const role = me?.role;
  const canDeleteByRole = role === "admin" || role === "manager";

  const canDelete = React.useMemo(
    () => !!propertyIdClean && listed && !isSearchDraft && canDeleteByRole,
    [propertyIdClean, listed, isSearchDraft, canDeleteByRole]
  );

  const handleDelete = React.useCallback(async () => {
    if (!propertyIdClean || deleting) return;
    if (!confirm("정말 삭제(비활성화)할까요?")) return;

    try {
      setDeleting(true);
      // PropertyViewModal에서 쓰는 것과 동일한 요청
      await togglePinDisabled(String(propertyIdClean), true);

      // 부모 쪽에서 리스트/지도 갱신이 필요하면
      await onDeleteProperty?.(propertyIdClean);

      // 컨텍스트 메뉴 닫기
      onClose?.();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.responseData?.message ||
        "비활성화 요청에 실패했습니다.";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  }, [propertyIdClean, deleting, onDeleteProperty, onClose]);

  return { canDelete, deleting, handleDelete };
}
