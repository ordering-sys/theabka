"use client";

import { useSession } from "@/modules/auth/components/RequireSession";

/**
 * Where "Create your invitation" style buttons should go: straight to the
 * template picker when the visitor is already signed in, otherwise to sign-in.
 */
export function useStartHref() {
  const { session } = useSession();
  return session ? "/app/new" : "/signin";
}
