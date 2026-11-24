/**
 * Per-step status for the editor's stepper and tabs. Pure, safe on client and server.
 *
 * Every field is required to publish (see missingDetails), so a step is:
 * - "complete": nothing left to fill in (green tick);
 * - "missing": something is still empty (warning; `needs` lists what);
 * - "todo": same as missing, but for a live invitation, where nothing blocks
 *   publishing any more, so the step shows a plain number instead of a warning.
 *
 * Step order matches SECTIONS in ../components/Editor.tsx.
 */
import type { Draft } from "@/lib/store";
import { DETAIL_STEP, draftCheckable, missingDetails, type MissingDetail } from "@/modules/payments/lib/invitation-checks";

export type StepState = "complete" | "missing" | "todo";
export type StepStatus = { state: StepState; needs: MissingDetail[] };

export const STEP_COUNT = 7;

export function stepStatuses(draft: Draft, checkRequired: boolean): StepStatus[] {
  const missing = missingDetails(draftCheckable(draft));
  return Array.from({ length: STEP_COUNT }, (_, i) => {
    const needs = missing.filter((m) => DETAIL_STEP[m] === i);
    if (!needs.length) return { state: "complete", needs };
    return { state: checkRequired ? "missing" : "todo", needs: checkRequired ? needs : [] };
  });
}
