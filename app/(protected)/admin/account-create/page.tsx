"use client";

import AccountCreatePage, {
  CreateAccountPayload,
} from "@/features/users/components/_AccountCreatePage";
import { AdminAuthGuard } from "@/components/auth-guard/AdminAuthGuard";

const TeamCreatePage = () => {
  const handleCreateUser = (payload: CreateAccountPayload) => {
    // TODO: API 연동
  };

  return (
    <AdminAuthGuard>
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">계정 생성</h1>
          <p className="text-sm text-muted-foreground">
            새로운 계정을 생성합니다.
          </p>
        </header>

        <div className="p-1 pb-8">
          <AccountCreatePage onCreate={handleCreateUser} />
        </div>
      </div>
    </AdminAuthGuard>
  );
};

export default TeamCreatePage;
