import type { Metadata } from "next";
import { publishedSlugs } from "@/modules/guest/server/published";
import { InvitationPageView, invitationMetadata } from "@/modules/guest/server/invitation-page";

// Guests arrive here by a full page load from a shared link (Telegram, Messenger), not by
// in-app navigation, so the page may block on `params` instead of streaming behind a
// <Suspense> fallback. Blocking also keeps a real 404 status for unknown slugs.
export const instant = false;

// Known slugs are prerendered; new ones render on first request and are then cached.
export function generateStaticParams() {
  return publishedSlugs();
}

export async function generateMetadata({ params }: PageProps<"/i/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return invitationMetadata(slug);
}

export default async function InvitationPage({ params }: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  return <InvitationPageView slug={slug} />;
}
