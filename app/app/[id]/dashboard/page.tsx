import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/RequireSession";
import { InvitationDashboardPage } from "@/components/dashboard/HostPages";

export const metadata: Metadata = { title: "Invitation dashboard" };

// Reads the id from the URL at runtime (cacheComponents needs a Suspense boundary).
export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="detail" />}>
      <InvitationDashboardPage />
    </Suspense>
  );
}
