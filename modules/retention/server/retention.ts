/**
 * Data retention jobs. SERVER ONLY, service role (bypasses RLS).
 * Rules: modules/retention/lib/policy.ts and supabase/migrations/20261124090000_data_retention.sql.
 *
 * Every step is idempotent and works in small batches, so a failed or
 * timed-out run is simply picked up by the next one. Storage files are removed
 * before database rows: they are found by path prefix (<user_id>/<invitation_id>/),
 * so a retry can always find what's left.
 */
import { revalidateTag } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertServer } from "@/lib/supabase/env";
import { invitationTag } from "@/lib/data/server";
import { DRAFT_IDLE_MONTHS, PAYMENT_DETAIL_DAYS, PURGE_GRACE_DAYS } from "../lib/policy";

assertServer("modules/retention/server/retention");

const BUCKETS = ["photos", "music", "gift-qr"] as const;
const PAGE = 1000;

/** Remove every file under <userId>/<invitationId>/ in all buckets. Returns the number removed. */
export async function removeInvitationFiles(userId: string, invitationId: string): Promise<number> {
  const storage = getSupabaseAdminClient().storage;
  const folder = `${userId}/${invitationId}`;
  let removed = 0;
  for (const bucket of BUCKETS) {
    // Remove page by page; removed files drop out of the listing, so always read from offset 0.
    for (;;) {
      const { data, error } = await storage.from(bucket).list(folder, { limit: PAGE });
      if (error) throw new Error(`list ${bucket}/${folder}: ${error.message}`);
      const files = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
      if (!files.length) break;
      const { error: rmError } = await storage.from(bucket).remove(files);
      if (rmError) throw new Error(`remove ${bucket}/${folder}: ${rmError.message}`);
      removed += files.length;
      if (files.length < PAGE) break;
    }
  }
  return removed;
}

/** Delete the content of invitations that ended more than PURGE_GRACE_DAYS ago; keep the tombstone. */
async function purgeEndedInvitations(limit: number) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("retention_due_purges", { p_grace_days: PURGE_GRACE_DAYS, p_limit: limit });
  if (error) throw new Error(`retention_due_purges: ${error.message}`);
  let purged = 0;
  const failed: string[] = [];
  for (const inv of data ?? []) {
    try {
      await removeInvitationFiles(inv.user_id, inv.id);
      const { error: purgeError } = await admin.rpc("purge_invitation_content", { p_invitation_id: inv.id });
      if (purgeError) throw new Error(purgeError.message);
      revalidateTag(invitationTag(inv.slug), { expire: 0 });
      purged++;
    } catch (e) {
      console.error("[retention] purge failed", inv.id, e);
      failed.push(inv.id);
    }
  }
  return { purged, failed };
}

/** Delete unpaid drafts not edited for DRAFT_IDLE_MONTHS (rows cascade to photos, RSVPs and views). */
async function deleteStaleDrafts(limit: number) {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - DRAFT_IDLE_MONTHS);
  const { data, error } = await admin
    .from("invitations")
    .select("id, user_id")
    .eq("status", "draft")
    .lt("updated_at", cutoff.toISOString())
    .order("updated_at")
    .limit(limit);
  if (error) throw new Error(`stale drafts: ${error.message}`);
  let deleted = 0;
  const failed: string[] = [];
  for (const inv of data ?? []) {
    try {
      // Row first, re-checking both conditions, so a draft paid for or edited during
      // this run is never touched. Its files are then removed by path prefix.
      const { data: gone, error: delError } = await admin
        .from("invitations")
        .delete()
        .eq("id", inv.id)
        .eq("status", "draft")
        .lt("updated_at", cutoff.toISOString())
        .select("id");
      if (delError) throw new Error(delError.message);
      if (!gone?.length) continue;
      await removeInvitationFiles(inv.user_id, inv.id);
      deleted++;
    } catch (e) {
      console.error("[retention] draft delete failed", inv.id, e);
      failed.push(inv.id);
    }
  }
  return { deleted, failed };
}

/** Delete old unpaid payments; clear raw provider data and QR payloads on old paid ones. */
async function trimPayments() {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(Date.now() - PAYMENT_DETAIL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count: deleted, error: delError } = await admin
    .from("payments")
    .delete({ count: "exact" })
    .in("status", ["pending", "expired"])
    .lt("created_at", cutoff);
  if (delError) throw new Error(`delete payments: ${delError.message}`);
  const { count: trimmed, error: trimError } = await admin
    .from("payments")
    .update({ raw: null, qr_payload: null }, { count: "exact" })
    .lt("created_at", cutoff)
    .or("raw.not.is.null,qr_payload.not.is.null");
  if (trimError) throw new Error(`trim payments: ${trimError.message}`);
  return { deleted: deleted ?? 0, trimmed: trimmed ?? 0 };
}

export type RetentionReport = {
  invitations: { purged: number; failed: string[] };
  drafts: { deleted: number; failed: string[] };
  payments: { deleted: number; trimmed: number };
};

/** One retention pass. Called daily by /api/cron/retention. */
export async function runRetention({ limit = 50 } = {}): Promise<RetentionReport> {
  const invitations = await purgeEndedInvitations(limit);
  const drafts = await deleteStaleDrafts(limit);
  const payments = await trimPayments();
  return { invitations, drafts, payments };
}
