import type { Metadata } from "next";
import { SAMPLE_GUEST_CODE } from "@/modules/guest/server/published";
import { InvitationPageView, invitationMetadata } from "@/modules/guest/server/invitation-page";
import { sampleInvitation } from "@/lib/mock-data";

/**
 * A guest's personal link (Premium "special guests"): the invitation greets them by name
 * and pre-fills their RSVP. Unknown codes show the general invitation.
 */
export const instant = false;

// cacheComponents needs at least one entry: the landing page's sample guest.
export function generateStaticParams() {
  return [{ slug: sampleInvitation.slug, code: SAMPLE_GUEST_CODE }];
}

export async function generateMetadata({ params }: PageProps<"/i/[slug]/[code]">): Promise<Metadata> {
  const { slug, code } = await params;
  return invitationMetadata(slug, code);
}

export default async function PersonalInvitationPage({ params }: PageProps<"/i/[slug]/[code]">) {
  const { slug, code } = await params;
  return <InvitationPageView slug={slug} code={code} />;
}
