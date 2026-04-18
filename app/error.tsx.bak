"use client";

import { useEffect } from "react";
import { RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 발생 시 로그를 남길 수 있습니다.
    console.error("Application Crash:", error);
  }, [error]);

  const handleRefresh = () => {
    // 1. 리액트 상태 리셋 시도
    reset();
    // 2. 물리적 페이지 새로고침 (웹뷰 갱신)
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100/80 p-4 text-red-600 shadow-inner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-10 w-10"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
        문제가 발생했습니다
      </h1>
      <p className="mb-10 max-w-sm text-gray-500 leading-relaxed">
        일시적인 오류로 인해 화면을 불러올 수 없습니다. <br />
        새로고침을 통해 다시 시도해 주세요.
      </p>

      <div className="flex w-full flex-col gap-3 sm:w-auto">
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
        >
          <RefreshCcw className="h-5 w-5" />
          앱 새로고침
        </button>

        <button
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
        >
          <Home className="h-5 w-5" />
          메인으로 이동
        </button>
      </div>

      <div className="mt-12 text-sm text-gray-400">
        Error Digest: <span className="font-mono text-gray-300">{error.digest || "N/A"}</span>
      </div>
    </div>
  );
}
