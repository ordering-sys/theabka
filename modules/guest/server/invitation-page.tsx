import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestShell } from "@/modules/guest/components/GuestShell";
import { InvitationBody } from "@/modules/guest/components/InvitationBody";
import { InvitationEnded } from "@/modules/guest/components/InvitationEnded";
import { guestNameEn, guestNameKm } from "@/modules/guest/lib/greeting";
import { formatEnglishDate, formatKhmerDate } from "@/lib/khmer";
import { PLANS, getTemplate, templates, type Invitation } from "@/lib/mock-data";
import { findInvitedGuest, findPublished } from "./published";

/**
 * Shared by /i/[slug] (the general link) and /i/[slug]/[code] (a guest's personal link,
 * Premium). An unknown or deleted code shows the general invitation, never an error.
 */

function titleFor(inv: Pick<Invitation, "groomKm" | "brideKm" | "groomEn" | "brideEn">) {
  const short = (s: string) => s.split(" ").at(-1) || s;
  return `${inv.groomKm} & ${inv.brideKm} · ${short(inv.groomEn)} & ${short(inv.brideEn)}`;
}

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function invitationMetadata(slug: string, code?: string): Promise<Metadata> {
  const found = await findPublished(slug);
  // Private event pages shouldn't show up in search results.
  const robots = { index: false, follow: false };
  if (!found) return { title: { absolute: "TheabKa ធៀបការ" }, robots };
  if (found.ended) return { title: { absolute: titleFor(found.invitation) }, robots };
  const inv = found.invitation;
  const guest = code ? await findInvitedGuest(slug, code, found.demo) : undefined;
  const title = titleFor(inv);
  const date = `${formatKhmerDate(inv.eventDate)} · ${formatEnglishDate(inv.eventDate)} · ${inv.venueNameEn}`;
  // The link preview in Telegram says who it's for.
  const description = guest ? `${guestNameKm(guest)} · ${guestNameEn(guest)} — ${date}` : date;
  const path = code && guest ? `/i/${slug}/${code}` : `/i/${slug}`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, url: path, type: "website", siteName: "TheabKa ធៀបការ", locale: "km_KH" },
    twitter: { card: "summary_large_image", title, description },
    robots,
  };
}

export async function InvitationPageView({ slug, code }: { slug: string; code?: string }) {
  const found = await findPublished(slug);
  if (!found) notFound();
  if (found.ended) return <InvitationEnded invitation={found.invitation} />;
  const { invitation: inv } = found;
  const template = getTemplate(inv.templateId) ?? templates[0];
  const plan = PLANS[found.tier];
  const photos = found.photos.slice(0, plan.maxPhotos);
  // Personal links are a Premium feature; the database also only returns guests for Premium.
  const guest = code && plan.personalLinks ? await findInvitedGuest(slug, code, found.demo) : undefined;
  const url = `${SITE()}/i/${slug}`;

  return (
    <GuestShell
      invitation={inv}
      template={template}
      demo={found.demo}
      openingAnimation={plan.openingAnimation}
      rsvpsOpen={found.rsvpsOpen}
      guest={guest}
      guestCode={guest ? code : undefined}
    >
      <InvitationBody invitation={inv} photos={photos} template={template} url={url} guest={guest} />
    </GuestShell>
  );
}
