"use client";

import { use } from "react";
import TeamDetailPage from "@/features/teams/components/TeamDetailPage";
import { AdminAuthGuard } from "@/components/auth-guard/AdminAuthGuard";

interface PageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const { teamId } = use(params);

  return (
    <AdminAuthGuard>
      <TeamDetailPage teamId={teamId} />
    </AdminAuthGuard>
  );
}
