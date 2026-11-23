"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { PayScreen } from "@/components/pay/PayScreen";
import { Editor } from "@/components/editor/Editor";
import { useContent } from "@/lib/i18n";
import { getDraft, type Draft, type Session } from "@/lib/store";
import { useIsClient } from "@/lib/use-client";
import { dashboardContent } from "./content";
import { InvitationDashboard } from "./InvitationDashboard";
import { InvitationList } from "./InvitationList";
import { TemplatePicker } from "@/app/app/new/TemplatePicker";
import { DashboardSkeleton, RequireSession } from "./RequireSession";

/** Host screens read the signed-in user's Supabase session, so they render only in the browser. */

export function DashboardPage() {
  const isClient = useIsClient();
  if (!isClient) return <DashboardSkeleton />;
  return <RequireSession fallback={<DashboardSkeleton />}>{(s) => <InvitationList session={s} />}</RequireSession>;
}

function WithInvitation({ render, variant }: { render: (inv: Draft) => React.ReactNode; variant: "detail" | "form" }) {
  const { id } = useParams<{ id: string }>();
  const isClient = useIsClient();
  if (!isClient) return <DashboardSkeleton variant={variant} />;
  return (
    <RequireSession fallback={<DashboardSkeleton variant={variant} />}>
      {(s) => <Loaded key={id} id={id} session={s} render={render} variant={variant} />}
    </RequireSession>
  );
}

function Loaded({
  id, session, render, variant,
}: { id: string; session: Session; render: (inv: Draft) => React.ReactNode; variant: "detail" | "form" }) {
  const [state, setState] = useState<{ loading: boolean; inv?: Draft }>({ loading: true });
  useEffect(() => {
    let alive = true;
    getDraft(id).then(
      (inv) => alive && setState({ loading: false, inv }),
      () => alive && setState({ loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [id]);
  if (state.loading) return <DashboardSkeleton variant={variant} />;
  // Hosts only see their own invitations (Supabase RLS also enforces this).
  if (!state.inv || state.inv.userId !== session.userId) return <HostNotFound />;
  return <>{render(state.inv)}</>;
}

export function InvitationDashboardPage() {
  return <WithInvitation variant="detail" render={(inv) => <InvitationDashboard invitation={inv} />} />;
}

export function PayPage() {
  return <WithInvitation variant="form" render={(inv) => <PayScreen initial={inv} />} />;
}

function HostNotFound() {
  const c = useContent(dashboardContent);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">{c.detail.notFound}</h1>
      <ButtonLink href="/app">{c.detail.back}</ButtonLink>
    </main>
  );
}

export function EditorPage() {
  // ?step=N opens a section directly (the pay screen links to what's missing).
  const step = Number(useSearchParams().get("step")) || 0;
  return <WithInvitation variant="form" render={(inv) => <Editor initial={inv} initialStep={step} />} />;
}

/** /app/new needs a session too, so new drafts belong to the signed-in host. */
export function TemplatePickerPage() {
  const isClient = useIsClient();
  if (!isClient) return <DashboardSkeleton variant="form" />;
  return <RequireSession fallback={<DashboardSkeleton variant="form" />}>{() => <TemplatePicker />}</RequireSession>;
}
