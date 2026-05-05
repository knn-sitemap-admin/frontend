import { useMe } from "@/shared/api/auth/auth";

export function useMeRole() {
  const { data: me } = useMe();
  const role = me?.role ?? null;
  const isPrivileged = role === 'admin' || role === 'manager';
  const accountId = me?.accountId ?? null;
  const canDownloadImage = !!me?.canDownloadImage;
  
  if (process.env.NODE_ENV === 'development') {
  }

  return { me, role, isPrivileged, accountId, canDownloadImage };
}
