import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/RequireSession";
import { PayPage } from "@/components/dashboard/HostPages";

export const metadata: Metadata = { title: "Preview and pay" };

// Reads the id from the URL at runtime (cacheComponents needs a Suspense boundary).
export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="form" />}>
      <PayPage />
    </Suspense>
  );
}
