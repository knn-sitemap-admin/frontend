import { api } from "@/shared/api/api";

export interface Schedule {
  id: number;
  title: string;
  content: string | null;
  category: string;
  location: string | null;
  customerPhone: string | null;
  platform: string | null;
  meetingType: string | null;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color: string;
  creator: {
    id: string;
    name: string | null;
  };
  createdAt: string;
  updatedAt: string;
  status: 'normal' | 'canceled';
  contractId: number | null;
  salesTeamPhone?: string | null;
}

export interface CreateScheduleRequest {
  title: string;
  content?: string;
  category: string;
  location?: string;
  customerPhone?: string;
  platform?: string;
  meetingType?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color: string;
}

export interface UpdateScheduleRequest {
  title?: string;
  content?: string;
  category?: string;
  location?: string;
  customerPhone?: string;
  platform?: string;
  meetingType?: string;
  startDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  color?: string;
  status?: 'normal' | 'canceled';
}

/** 일정 목록 조회 */
export async function getSchedules(params?: {
  from?: string;
  to?: string;
  assignedStaffId?: string;
  onlyHolidays?: boolean;
}) {
  const { data } = await api.get<{ message: string; data: Schedule[] }>(
    "/schedules",
    { params }
  );
  return data.data;
}

/** 일정 생성 */
export async function createSchedule(request: CreateScheduleRequest) {
  const { data } = await api.post<{ message: string; data: Schedule }>(
    "/schedules",
    request
  );
  return data.data;
}

/** 일정 수정 */
export async function updateSchedule(id: number, request: UpdateScheduleRequest) {
  const { data } = await api.put<{ message: string; data: Schedule }>(
    `/schedules/${id}`,
    request
  );
  return data.data;
}

/** 일정 삭제 */
export async function deleteSchedule(id: number) {
  await api.delete(`/schedules/${id}`);
}

/** 삭제된 일정 목록 조회 */
export async function getDeletedSchedules() {
  const { data } = await api.get<{ message: string; data: Schedule[] }>(
    "/schedules/deleted"
  );
  return data.data;
}

/** 일정 복원 */
export async function restoreSchedule(id: number) {
  const { data } = await api.post<{ message: string; data: Schedule }>(
    `/schedules/${id}/restore`
  );
  return data.data;
}
