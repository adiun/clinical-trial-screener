// Per-note rollup. Pure functions, computed in code, never by Jev.
//
// A criterion is decided when the model's confidence clears the threshold.
// Below the threshold it is "uncertain". Above it, probability decides met /
// not met. Note status follows trial logic: any failed inclusion or any met
// exclusion makes the note ineligible; otherwise any uncertain criterion sends
// it to review; otherwise it is eligible.

import type { Answer, Criterion, CriterionStatus, NoteStatus, NoteStatusSnapshot } from "./types.js";

export function criterionStatus(answer: Answer | undefined, threshold: number): CriterionStatus {
  if (!answer) return "pending";
  if (answer.c < threshold) return "uncertain";
  return answer.p >= 0.5 ? "met" : "not_met";
}

/** Whether a criterion in this state is favorable to eligibility. */
export function favorable(kind: Criterion["kind"], status: CriterionStatus): boolean | null {
  if (status === "pending" || status === "uncertain") return null;
  return kind === "inclusion" ? status === "met" : status === "not_met";
}

export function noteStatus(
  criteria: readonly Criterion[],
  answers: Record<string, Answer> | undefined,
  threshold: number,
): NoteStatusSnapshot {
  const perCriterion: Record<string, CriterionStatus> = {};
  let anyPending = false;
  let anyUncertain = false;
  let anyFail = false;
  for (const c of criteria) {
    const a = answers?.[c.id];
    // An answer computed for a stale version of the criterion is treated as pending.
    const live = a && a.criterionHash === c.hash ? a : undefined;
    const s = criterionStatus(live, threshold);
    perCriterion[c.id] = s;
    if (s === "pending") anyPending = true;
    else if (s === "uncertain") anyUncertain = true;
    else if (favorable(c.kind, s) === false) anyFail = true;
  }
  let status: NoteStatus;
  if (criteria.length === 0) status = "pending";
  else if (anyFail) status = "ineligible";
  else if (anyPending) status = "pending";
  else if (anyUncertain) status = "review";
  else status = "eligible";
  return { status, criteria: perCriterion };
}

export interface Counts {
  eligible: number;
  ineligible: number;
  review: number;
  pending: number;
}

export function countStatuses(snapshots: Iterable<NoteStatusSnapshot>): Counts {
  const counts: Counts = { eligible: 0, ineligible: 0, review: 0, pending: 0 };
  for (const s of snapshots) counts[s.status]++;
  return counts;
}

export interface Flip {
  noteId: string;
  from: NoteStatus;
  to: NoteStatus;
  /** The criterion whose status change explains the flip, when one can be named. */
  criterionId: string | null;
}

/**
 * Notes whose status changed between two snapshots. The named criterion is the
 * first one whose own status changed and whose new status is consistent with
 * the new note status (a failing criterion for a flip into ineligible, an
 * uncertain one for a flip into review, a newly favorable one otherwise).
 */
export function flippedNotes(
  criteria: readonly Criterion[],
  previous: Record<string, NoteStatusSnapshot>,
  current: Record<string, NoteStatusSnapshot>,
): Flip[] {
  const flips: Flip[] = [];
  for (const [noteId, now] of Object.entries(current)) {
    const before = previous[noteId];
    if (!before || before.status === now.status) continue;
    // A note that had no answer yet did not flip; it landed for the first time.
    if (now.status === "pending" || before.status === "pending") continue;
    let criterionId: string | null = null;
    for (const c of criteria) {
      const was = before.criteria[c.id];
      const is = now.criteria[c.id];
      if (was === is) continue;
      const fav = favorable(c.kind, is ?? "pending");
      if (now.status === "ineligible" && fav === false) { criterionId = c.id; break; }
      if (now.status === "review" && is === "uncertain") { criterionId = c.id; break; }
      if (now.status === "eligible" && fav === true) { criterionId = c.id; break; }
    }
    if (!criterionId) {
      const changed = criteria.find((c) => before.criteria[c.id] !== now.criteria[c.id]);
      criterionId = changed?.id ?? null;
    }
    flips.push({ noteId, from: before.status, to: now.status, criterionId });
  }
  return flips;
}

/** Weighted eligibility score for on-demand sorting: sum of weight * P(favorable). */
export function eligibilityScore(criteria: readonly Criterion[], answers: Record<string, Answer> | undefined): number {
  let total = 0;
  let weightSum = 0;
  for (const c of criteria) {
    const a = answers?.[c.id];
    weightSum += c.weight;
    if (!a || a.criterionHash !== c.hash) continue;
    const pFav = c.kind === "inclusion" ? a.p : 1 - a.p;
    total += c.weight * pFav;
  }
  return weightSum === 0 ? 0 : total / weightSum;
}

/** For a Score answer: probability mass on the "met" levels. */
export function scoreMetProbability(probabilities: Record<string, number>, metLevels: readonly number[]): number {
  let p = 0;
  for (const level of metLevels) p += probabilities[String(level)] ?? 0;
  return Math.min(1, Math.max(0, p));
}

/** Noul carries no confidence; derive one from distance to 0.5. */
export function noulConfidence(p: number): number {
  return Math.min(1, Math.max(0, Math.abs(2 * p - 1)));
}
