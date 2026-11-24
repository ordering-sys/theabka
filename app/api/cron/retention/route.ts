import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runRetention } from "@/modules/retention/server/retention";

/**
 * GET /api/cron/retention — daily data-retention pass (see modules/retention).
 * Scheduled in vercel.json. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`;
 * any other scheduler must send the same header.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const report = await runRetention();
    console.info("[retention]", JSON.stringify(report));
    return NextResponse.json(report);
  } catch (e) {
    console.error("[retention] run failed", e);
    return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  }
}
