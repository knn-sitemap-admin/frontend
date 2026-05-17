"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import SocketProvider from "./SocketProvider";

export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(() => new QueryClient());

  const isDev = process.env.NODE_ENV === "development";

  return (
    <QueryClientProvider client={client}>
      <SocketProvider>
        {children}
      </SocketProvider>

      {/* ✅ 개발 모드에서만 Devtools 표시 */}
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
