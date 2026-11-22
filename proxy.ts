import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Keeps the Supabase session cookie fresh on host routes. Guest pages (/i/*) are untouched. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/app/:path*", "/signin"],
};
