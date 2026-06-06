import type { Metadata, Viewport } from "next";
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
  // ✅ Apple PWA 메타 태그 (홈 화면 바로가기 실행 시 전체화면 모드)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

// ✅ Next.js 13+ viewport 분리 export (user-scalable=no: 실수 핀치줌 방지)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // ✅ iOS Safe Area(노치/홈 인디케이터) 영역까지 콘텐츠 확장
  viewportFit: "cover",
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
