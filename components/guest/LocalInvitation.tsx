"use client";

import { useState } from "react";
import { getTemplate, PLANS, templates } from "@/lib/mock-data";
import { getLocalPublishedBySlug } from "@/lib/mock-store";
import { inviteUrl, useIsClient } from "@/lib/use-client";
import { GuestShell } from "./GuestShell";
import { InvitationBody } from "./InvitationBody";
import { InvitationNotFound } from "./InvitationNotFound";

/**
 * PROTOTYPE ONLY. Invitations published in this browser live in localStorage,
 * which the server can't see, so the guest page looks them up here.
 * Phase 7 (Supabase) removes this: the server finds every live invitation.
 */
export function LocalInvitation({ slug }: { slug: string }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <Lookup slug={slug} />;
}

function Lookup({ slug }: { slug: string }) {
  const [inv] = useState(() => getLocalPublishedBySlug(slug));
  if (!inv) return <InvitationNotFound />;
  const template = getTemplate(inv.templateId) ?? templates[0];
  const photos = inv.photos.slice(0, PLANS[template.tier].maxPhotos);
  return (
    <GuestShell invitation={inv} template={template}>
      <InvitationBody invitation={inv} photos={photos} template={template} url={inviteUrl(slug)} />
    </GuestShell>
  );
}

/**
 * PROTOTYPE ONLY. Server-rendered invitation, swapped after hydration for this
 * browser's published copy if the host edited it here (edits after publishing are free and live).
 */
export function LocalOverride({ slug, children }: { slug: string; children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return <>{children}</>;
  return <Override slug={slug}>{children}</Override>;
}

function Override({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [inv] = useState(() => getLocalPublishedBySlug(slug));
  if (!inv) return <>{children}</>;
  return <Lookup slug={slug} />;
}
