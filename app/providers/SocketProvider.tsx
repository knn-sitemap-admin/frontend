"use client";

import React from "react";
import { useSocketSync } from "@/hooks/useSocketSync";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useSocketSync();
  return <>{children}</>;
}
