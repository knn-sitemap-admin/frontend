"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";

interface ContractRecordsButtonProps {
  onClick?: () => void;
}

export function ContractRecordsButton({ onClick }: ContractRecordsButtonProps) {
  return (
    <Button
      variant="ghost"
      className="flex h-12 w-full items-center gap-3 px-4 text-gray-700 justify-start bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] hover:bg-white/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group overflow-hidden relative"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
        <FileText className="h-4 w-4" />
      </div>
      <span className="font-bold text-sm tracking-tight">영업자 계약기록</span>
    </Button>
  );
}
