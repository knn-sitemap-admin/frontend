import { apiFetch } from "@/shared/api/fetch";
import type { UpdatePinDraftDto, PinDraftDetail } from "../types";

export async function updatePinDraft(
  id: string | number,
  dto: UpdatePinDraftDto
): Promise<PinDraftDetail> {
  const data = await apiFetch.patch<{ message: string; data: PinDraftDetail }>(
    `/pin-drafts/${id}`,
    dto
  );
  return data.data;
}
