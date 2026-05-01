import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // ⛔️ 구글 폰트 에러 방지
import "./globals.css";
import ReactQueryProvider from "./providers/ReactQueryProvider";
import { Toaster } from "@/components/atoms/Toast/Toaster"; // 🔥 추가

// const inter = Inter({ subsets: ["latin"] });

const APP_NAME = "K&N 매물관리 프로그램";
const TEST_MODE = process.env.NEXT_PUBLIC_IS_DEV === "true";

export const metadata: Metadata = {
  title: TEST_MODE ? `${APP_NAME} (테스트 모드)` : APP_NAME,
  description: TEST_MODE ? `${APP_NAME} (테스트 모드)` : APP_NAME,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans">
        <ReactQueryProvider>
          {children}
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
