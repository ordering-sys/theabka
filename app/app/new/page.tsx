import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplatePickerPage } from "@/modules/dashboard/components/HostPages";
import { DashboardSkeleton } from "@/modules/auth/components/RequireSession";

export const metadata: Metadata = { title: "Pick a template" };

// Reads ?from= (change template for an existing draft), so it needs a Suspense boundary.
export default function NewInvitationPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="form" />}>
      <TemplatePickerPage />
    </Suspense>
  );
}
