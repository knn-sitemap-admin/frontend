import ClientSessionGuard from "app/components/auth/ClientSessionGuard";
import SidebarProviders from "./SidebarProviders";
import PullToRefresh from "@/components/common/PullToRefresh";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSessionGuard redirectTo="/login">
      <SidebarProviders>
        <PullToRefresh className="bg-white">
          {children}
        </PullToRefresh>
      </SidebarProviders>
    </ClientSessionGuard>
  );
}
