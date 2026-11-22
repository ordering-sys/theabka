import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/RequireSession";
import { EditorPage } from "@/components/dashboard/HostPages";

export const metadata: Metadata = { title: "Edit invitation" };

// The draft id comes from the URL at runtime, so stream it in (cacheComponents).
export default function EditInvitationPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="form" />}>
      <EditorPage />
    </Suspense>
  );
}
