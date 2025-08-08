"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith("/login");
  return isAuth ? <>{children}</> : <AppShell>{children}</AppShell>;
}
