"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AuthPageLayout } from "@/features/auth/layouts/AuthPageLayout";
import { LoginForm } from "@/features/auth/components/LoginForm/LoginForm";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export default function SignInPage() {
  type Mode = "login" | "forgot";
  const [mode, setMode] = useState<Mode>("login");
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasShownToast.current) return;

    const reason = searchParams.get("reason");
    if (reason === "expired") {
      hasShownToast.current = true;
      setTimeout(() => {
        toast({
          title: "세션이 만료되었습니다",
          description: "보안을 위해 다시 로그인해 주세요.",
          variant: "destructive",
        });
        // 주소창에서 ?reason=expired를 말끔하게 지워줌
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 100);
    }
  }, [searchParams, toast]);

  const title = mode === "login" ? "로그인" : "비밀번호 찾기";
  const subtitle =
    mode === "login"
      ? "계정에 로그인하고 매물 관리를 시작하세요."
      : "가입하신 이메일로 재설정 링크를 받아보세요.";

  return (
    <AuthPageLayout title={title} subtitle={subtitle}>
      {mode === "login" ? (
        <LoginForm
          onForgotClick={() => setMode("forgot")} // 비번찾기로 전환
        />
      ) : (
        <ForgotPasswordForm
          onBackToLogin={() => setMode("login")} // 로그인으로 돌아가기
        />
      )}
    </AuthPageLayout>
  );
}
