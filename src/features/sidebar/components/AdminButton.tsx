"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import Link from "next/link";

interface AdminButtonProps {
  onClick?: () => void;
}

export function AdminButton({ onClick }: AdminButtonProps) {
  return (
    <Link href="/admin" className="block">
      <Button
        variant="ghost"
        className="flex h-12 w-full items-center gap-3 px-4 text-gray-700 justify-start bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] hover:bg-white/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group overflow-hidden relative"
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
          <Settings className="h-4 w-4" />
        </div>
        <span className="font-bold text-sm tracking-tight">관리자 페이지</span>
      </Button>
    </Link>
  );
}
