"use server";

import { updateTag } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { invitationTag } from "./server";

/**
 * Call after saveDraft() on a LIVE invitation so guests see the edit right
 * away instead of after the 1-hour cache window. Only the owner can trigger it.
 */
export async function refreshPublishedInvitation(invitationId: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("invitations")
    .select("slug, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!data || data.status !== "live") return false;
  updateTag(invitationTag(data.slug));
  return true;
}
