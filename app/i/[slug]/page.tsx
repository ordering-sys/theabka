import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestShell } from "@/components/guest/GuestShell";
import { InvitationBody } from "@/components/guest/InvitationBody";
import { LocalInvitation, LocalOverride } from "@/components/guest/LocalInvitation";
import { formatEnglishDate, formatKhmerDate } from "@/lib/khmer";
import { PLANS, getTemplate, templates, type Invitation } from "@/lib/mock-data";
import { findPublished, publishedSlugs } from "@/lib/published";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Known slugs are prerendered; new ones render on first request and are then cached.
export function generateStaticParams() {
  return publishedSlugs();
}

function titleFor(inv: Invitation) {
  const short = (s: string) => s.split(" ").at(-1) || s;
  return `${inv.groomKm} & ${inv.brideKm} · ${short(inv.groomEn)} & ${short(inv.brideEn)}`;
}

export async function generateMetadata({ params }: PageProps<"/i/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await findPublished(slug);
  // Prototype mode: may still be an invitation published in the browser (see LocalInvitation).
  if (!found) return { title: { absolute: "TheabKa ធៀបការ" }, robots: { index: false, follow: false } };
  const inv = found.invitation;
  const title = titleFor(inv);
  const description = `${formatKhmerDate(inv.eventDate)} · ${formatEnglishDate(inv.eventDate)} · ${inv.venueNameEn}`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, url: `/i/${slug}`, type: "website", siteName: "TheabKa ធៀបការ", locale: "km_KH" },
    twitter: { card: "summary_large_image", title, description },
    // Private event pages shouldn't show up in search results.
    robots: { index: false, follow: false },
  };
}

export default async function InvitationPage({ params }: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const found = await findPublished(slug);
  const supabase = isSupabaseConfigured();
  if (!found) {
    if (supabase) notFound();
    return <LocalInvitation slug={slug} />;
  }
  const { invitation: inv } = found;
  const template = getTemplate(inv.templateId) ?? templates[0];
  const photos = found.photos.slice(0, PLANS[template.tier].maxPhotos);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/i/${slug}`;

  const page = (
    <GuestShell invitation={inv} template={template}>
      <InvitationBody invitation={inv} photos={photos} template={template} url={url} />
    </GuestShell>
  );
  // Prototype mode only: show a host's local edits to the sample.
  return supabase ? page : <LocalOverride slug={slug}>{page}</LocalOverride>;
}
