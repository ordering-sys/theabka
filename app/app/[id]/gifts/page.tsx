import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/modules/auth/components/RequireSession";
import { GiftBookPage } from "@/modules/dashboard/components/HostPages";

export const metadata: Metadata = { title: "Gift book" };

// Reads the id from the URL at runtime (cacheComponents needs a Suspense boundary).
export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="detail" />}>
      <GiftBookPage />
    </Suspense>
  );
}
