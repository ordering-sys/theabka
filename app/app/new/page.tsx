import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplatePickerPage } from "@/components/dashboard/HostPages";
import { DashboardSkeleton } from "@/components/dashboard/RequireSession";

export const metadata: Metadata = { title: "Pick a template" };

// Reads ?from= (change template for an existing draft), so it needs a Suspense boundary.
export default function NewInvitationPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="form" />}>
      <TemplatePickerPage />
    </Suspense>
  );
}
