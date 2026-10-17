import type { ReactNode } from "react";
import { MobileDashboardNav } from "@/components/mobile-dashboard-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MobileDashboardNav />
      {children}
    </>
  );
}
