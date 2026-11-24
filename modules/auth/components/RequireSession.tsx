"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/i18n";
import { getSession, onSessionChange, type Session } from "@/lib/store";
import { loadingContent } from "@/modules/auth/content";

/** Current user, kept up to date on sign-in/out (also in pages kept alive by Activity). */
export function useSession(): { loading: boolean; session: Session | null } {
  const [state, setState] = useState<{ loading: boolean; session: Session | null }>({ loading: true, session: null });
  useEffect(() => {
    let alive = true;
    const load = () => {
      getSession().then(
        (session) => alive && setState({ loading: false, session }),
        () => alive && setState({ loading: false, session: null }),
      );
    };
    load();
    const off = onSessionChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

/**
 * Host pages need a signed-in user (Supabase Auth session).
 * Children remount on every push/replace navigation (`bfcacheId`), because
 * cacheComponents keeps visited pages alive and they'd otherwise show stale
 * localStorage data. Browser back/forward still restores them.
 */
export function RequireSession({
  children, fallback,
}: { children: (session: Session) => React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter();
  const { loading, session } = useSession();

  useEffect(() => {
    // Come back to this exact page (path + query) after signing in.
    if (!loading && !session) {
      router.replace(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [loading, session, router]);

  if (!session) return fallback;
  return <Fragment key={`${router.bfcacheId}:${session.userId}`}>{children(session)}</Fragment>;
}

/** Loading skeletons. `list` = my invitations; `detail` = one invitation's dashboard; `form` = editor/pay. */
export function DashboardSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "form" }) {
  const label = useContent(loadingContent);
  const bar = "motion-safe:animate-pulse bg-sand";
  return (
    <div aria-busy className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 p-4 lg:p-6">
      <span role="status" className="sr-only">{label}</span>
      <div className="flex items-center justify-between">
        <div className={cn(bar, "h-9 w-28 rounded-card")} />
        <div className={cn(bar, "h-9 w-24 rounded-card")} />
      </div>
      {variant === "list" && (
        <>
          <div className={cn(bar, "h-7 w-48 rounded-card")} />
          <div className={cn(bar, "h-4 w-64 rounded")} />
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 rounded-card bg-white p-3 shadow-card">
              <div className={cn(bar, "h-[84px] w-16 shrink-0 rounded-lg")} />
              <div className="flex grow flex-col gap-2 py-1">
                <div className={cn(bar, "h-4 w-16 rounded-full")} />
                <div className={cn(bar, "h-4 w-3/4 rounded")} />
                <div className={cn(bar, "h-3 w-1/2 rounded")} />
              </div>
            </div>
          ))}
          <div className={cn(bar, "h-14 rounded-card")} />
        </>
      )}
      {variant === "detail" && (
        <>
          <div className="flex flex-col gap-2 rounded-card bg-white p-3 shadow-card">
            <div className={cn(bar, "h-3 w-20 rounded")} />
            <div className={cn(bar, "h-10 rounded-card")} />
            <div className="flex justify-around pt-1">
              {[0, 1, 2, 3].map((i) => <div key={i} className={cn(bar, "size-11 rounded-full")} />)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-card bg-white p-3 shadow-card">
                <div className={cn(bar, "h-3 w-16 rounded")} />
                <div className={cn(bar, "h-7 w-12 rounded")} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 rounded-card bg-white p-3.5 shadow-card">
            <div className={cn(bar, "h-12 rounded-card")} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(bar, "size-9 rounded-full")} />
                <div className={cn(bar, "h-4 grow rounded")} />
              </div>
            ))}
          </div>
        </>
      )}
      {variant === "form" && (
        <>
          <div className={cn(bar, "h-10 w-full rounded-full lg:hidden")} />
          <div className={cn(bar, "h-64 w-full rounded-card")} />
          <div className={cn(bar, "h-40 w-full rounded-card")} />
        </>
      )}
    </div>
  );
}
