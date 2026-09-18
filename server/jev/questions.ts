// Builds Jev questions from criteria. One question per criterion, keyed by the
// criterion id (ids are for code and are not sent to the model). The question
// text carries the complete meaning.
import { noul, score } from "@typesafe-ai/sdk";
import type { EntryType, Question, Questions, ScoreCriteria } from "@typesafe-ai/sdk";
import type { Answer, Criterion } from "../../shared/types.js";
import { noulConfidence, scoreMetProbability } from "../../shared/rollup.js";
import type { NoteState } from "./types.js";

export type JevQuestion = Question;

export function buildQuestions(criteria: readonly Criterion[]): Questions {
  const questions: Questions = {};
  for (const c of criteria) {
    if (c.primitive === "score") {
      const levels = c.levels && c.levels.length >= 2 ? c.levels : ["Not the case", "The case"];
      questions[c.id] = score(scoreInstructions(c), levels as unknown as ScoreCriteria);
    } else {
      const crit =
        c.trueDescription || c.falseDescription
          ? { ...(c.trueDescription ? { true: c.trueDescription } : {}), ...(c.falseDescription ? { false: c.falseDescription } : {}) }
          : null;
      questions[c.id] = noul(noulInstructions(c), crit);
    }
  }
  return questions;
}

function noulInstructions(c: Criterion): string {
  // Point the model at the field that carries the evidence.
  return `Based on \`note\` (a clinical note about one patient), ${c.question.trim()}`;
}

function scoreInstructions(c: Criterion): string {
  return `Based on \`note\` (a clinical note about one patient), ${c.question.trim()}`;
}

/** Full per-note state. Strictly the note text plus demographics parsed from that text. */
export function buildState(text: string, age: number | null, sex: "M" | "F" | null): NoteState {
  const state: NoteState = { note: text };
  if (age !== null || sex !== null) {
    state.patient = {};
    if (age !== null) state.patient.age = age;
    if (sex !== null) state.patient.sex = sex;
  }
  return state;
}

/** Shape of a raw Jev answer as it comes back from the SDK for our two primitives. */
export type RawJevAnswer =
  | { type: "noul"; noul: number }
  | { type: "score"; score: number; confidence: number; probabilities: Record<string, number>; legend?: unknown };

/** Convert a raw Jev answer into our decision-grade Answer. */
export function toAnswer(c: Criterion, raw: RawJevAnswer, latencyMs: number): Answer {
  if (raw.type === "noul") {
    const p = clamp01(raw.noul);
    return { criterionHash: c.hash, p, c: noulConfidence(p), raw: { type: "noul", noul: p }, latencyMs, cached: false };
  }
  const met = c.metLevels && c.metLevels.length > 0 ? c.metLevels : [(c.levels?.length ?? 2) - 1];
  const p = scoreMetProbability(raw.probabilities, met);
  return {
    criterionHash: c.hash,
    p,
    c: clamp01(raw.confidence),
    raw: { type: "score", score: raw.score, confidence: raw.confidence, probabilities: raw.probabilities },
    latencyMs,
    cached: false,
  };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** The SDK's state type. NoteState is plain JSON, so the cast is safe. */
export function toEntry(state: NoteState): EntryType {
  return state as unknown as EntryType;
}
