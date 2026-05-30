"use client";

import { useEffect, useRef } from "react";
import { AddressCandidate } from "../hooks/searchPlaceOnMap";

type Props = {
    candidates: AddressCandidate[];
    onSelect: (candidate: AddressCandidate) => void;
    onClose: () => void;
    query?: string;
};

export default function AddressPickerModal({ candidates, onSelect, onClose, query }: Props) {
    const listRef = useRef<HTMLUListElement>(null);

    // 모달 열릴 때 첫 항목에 포커스
    useEffect(() => {
        const first = listRef.current?.querySelector<HTMLButtonElement>("button");
        first?.focus();
    }, []);

    // ESC 키로 닫기
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        /* 배경 오버레이: 백드롭 블러(backdrop-blur)를 추가하여 세련된 분위기 연출 */
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 sm:items-center transition-opacity"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label="주소 선택"
        >
            {/* 모달 컨테이너: 모바일에서는 Bottom Sheet / 데스크톱에서는 Center Modal */}
            <div
                className="flex flex-col w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85dvh] sm:max-h-[70vh] transform transition-all animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
                style={{
                    backgroundColor: "var(--color-background-primary, rgb(255, 255, 255))"
                }}
            >
                {/* 모바일 상단 바텀시트 핸들 (디자인적 요소) */}
                <div className="flex justify-center py-2 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>

                {/* 헤더 영역 */}
                <div className="flex items-start justify-between px-5 pt-3 pb-4 sm:pt-5">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            위치 선택
                        </h2>
                        {query && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">&apos;{query}&apos;</span> 검색 결과
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="닫기"
                        className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <CloseIcon />
                    </button>
                </div>

                <div className="border-b border-zinc-100 dark:border-zinc-800" />

                {/* 주소 목록 영역 */}
                <ul
                    ref={listRef}
                    className="overflow-y-auto px-3 py-3 space-y-1 divide-y divide-zinc-50 dark:divide-zinc-800/50 list-none"
                    role="listbox"
                    aria-label="주소 목록"
                >
                    {candidates.length === 0 ? (
                        /* 검색 결과가 없을 때 (Empty State) */
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                검색된 주소 결과가 없습니다.
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                단어의 철자가 정확한지 확인해 보세요.
                            </p>
                        </div>
                    ) : (
                        candidates.map((c, i) => (
                            <li key={`${c.lat}-${c.lng}-${i}`} role="option" aria-selected={false} className="pt-1 first:pt-0">
                                <button
                                    onClick={() => onSelect(c)}
                                    className="w-full flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-left transition-all duration-200 group relative hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-[0.99] focus-visible:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-800/60 focus-visible:ring-2 focus-visible:ring-blue-500/50"
                                >
                                    {/* 숫자 인덱스 배지 */}
                                    <span
                                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors"
                                    >
                                        {i + 1}
                                    </span>

                                    {/* 주소 텍스트 */}
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-50">
                                            {c.label}
                                        </p>
                                        {c.sublabel && (
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                                                {c.sublabel}
                                            </p>
                                        )}
                                    </div>

                                    {/* 우측 화살표 아이콘 (Hover 시 우측으로 살짝 이동하는 애니메이션) */}
                                    <span className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 transform group-hover:translate-x-0.5 transition-all">
                                        <ChevronIcon />
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>

                {/* 모바일 하단 여백 안전구역 대응 (iOS 홈 바 대응) */}
                <div className="h-safe-bottom bg-transparent sm:hidden" />
            </div>
        </div>
    );
}

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}