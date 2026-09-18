// Shared domain types used by both the server and the client.
// Everything crossing the HTTP/SSE boundary is defined here.

export type Sex = "M" | "F";

/** One deliberately hard-to-parse fact the generator wove into a note. */
export interface HardCase {
  type: "discontinued_med" | "historical_finding" | "family_confounder" | "stale_lab" | "duplicate_lab" | "negation";
  detail: string;
}

/** Ground truth shipped with each synthetic note. Never sent to Jev or Claude. */
export interface NoteTruth {
  age: number;
  sex: Sex;
  diagnoses: { code: string; name: string; onset: string; active: boolean }[];
  meds: { name: string; start: string; stop: string | null }[];
  labs: { name: string; value: number; unit: string; date: string }[];
  procedures: { name: string; date: string }[];
  familyHistory: string[];
  /** Generator-only metadata: which deliberately hard cases this note was assigned. Absent on hand-written fixtures. */
  hardCases?: HardCase[];
}

/** One line of data/notes.jsonl. */
export interface NoteRecord {
  id: string;
  text: string;
  format: string;
  truth: NoteTruth;
}

/** What the browser sees for a note. `truth` is deliberately absent. */
export interface NoteView {
  id: string;
  position: number;
  text: string;
  format: string;
  /** Age parsed from the note text itself (not from truth), when present. */
  age: number | null;
  /** Sex parsed from the note text itself (not from truth), when present. */
  sex: Sex | null;
}

export type Primitive = "noul" | "score";
export type CriterionKind = "inclusion" | "exclusion";

export interface Criterion {
  id: string;
  position: number;
  name: string;
  kind: CriterionKind;
  primitive: Primitive;
  /** The literal question sent to Jev. Phrased so that "yes" / a high level means the condition holds. */
  question: string;
  /** Optional clarifications for a Noul's yes/no outcomes. */
  trueDescription: string | null;
  falseDescription: string | null;
  /** Ordered level descriptions for a Score. Null for Noul. */
  levels: string[] | null;
  /** For a Score: which level indices count as "criterion met". Null for Noul. */
  metLevels: number[] | null;
  /** Relative weight, informational and used for on-demand sorting. */
  weight: number;
  /** Hash of the fields that affect Jev's answer. Changes when the question changes. */
  hash: string;
}

export type CriterionInput = Omit<Criterion, "id" | "position" | "hash"> & { id?: string };

export interface Protocol {
  id: string;
  name: string;
  description: string;
  /** Raw JSON Claude produced when it compiled the protocol, if any. */
  compiledJson: string | null;
  criteria: Criterion[];
}

/** A cached, decision-grade answer for one (note, criterion) pair. */
export interface Answer {
  criterionHash: string;
  /** Probability the criterion is met, 0..1. */
  p: number;
  /** Confidence 0..1. For Noul this is |2p - 1|; for Score it is Jev's reported confidence. */
  c: number;
  /** Raw Jev answer for inspection (noul value or score distribution). */
  raw: RawAnswer;
  latencyMs: number;
  cached: boolean;
}

export type RawAnswer =
  | { type: "noul"; noul: number }
  | { type: "score"; score: number; confidence: number; probabilities: Record<string, number> };

export type CriterionStatus = "met" | "not_met" | "uncertain" | "pending";
export type NoteStatus = "eligible" | "ineligible" | "review" | "pending";

export interface RunStats {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  elapsedMs: number | null;
  noteCount: number;
  /** Notes that needed at least one API call. */
  apiCalls: number;
  cachedNotes: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  inputTokens: number;
  estimatedCostUsd: number;
  model: string;
  mode: "mock" | "live";
  trigger: "run" | "edit" | "replay";
  threshold: number;
  rateLimitPauses: number;
  rateLimitHeaders: Record<string, string>;
  errors: number;
  /** Whether failed requests were retried during this run. */
  retries: boolean;
  /** noteId -> short reason, for every note whose request failed. */
  failures: Record<string, string>;
  summary: string | null;
}

export interface NoteStatusSnapshot {
  status: NoteStatus;
  criteria: Record<string, CriterionStatus>;
}

/** Full client bootstrap payload. */
export interface AppState {
  protocol: Protocol;
  notes: NoteView[];
  /** answers[noteId][criterionId] */
  answers: Record<string, Record<string, Answer>>;
  lastRun: RunStats | null;
  /** Status snapshot from the run before the last one, for the Flipped filter. */
  previousSnapshot: Record<string, NoteStatusSnapshot> | null;
  lastSnapshot: Record<string, NoteStatusSnapshot> | null;
  mode: "mock" | "live";
  jevModel: string;
  concurrency: number;
  notesLoaded: boolean;
  /** Server-side run setting: retry failed Jev requests. */
  retries: boolean;
}

/** Server-sent events. */
export type SseEvent =
  | { type: "hello"; mode: "mock" | "live" }
  | { type: "run-start"; runId: string; total: number; toAsk: number; fromCache: number; criterionIds: string[]; trigger: RunStats["trigger"] }
  | { type: "note"; runId: string; noteId: string; answers: Record<string, Answer>; index: number; error?: string }
  | { type: "rate-limit"; runId: string; pauseMs: number }
  | { type: "run-complete"; runId: string; stats: RunStats; snapshot: Record<string, NoteStatusSnapshot> }
  | { type: "run-error"; runId: string; message: string }
  | { type: "protocol"; protocol: Protocol }
  | { type: "summary"; runId: string; summary: string };

export interface DecisionLogRow {
  id: number;
  runId: string;
  noteId: string;
  criterionId: string;
  criterionHash: string;
  question: string;
  p: number;
  c: number;
  threshold: number;
  latencyMs: number;
  createdAt: string;
}

export interface EvalCriterionRow {
  criterionId: string;
  name: string;
  /** Predictions with ground truth available and a decided (met / not_met) status. */
  decided: number;
  correct: number;
  uncertain: number;
  noTruth: number;
  accuracy: number | null;
}

export interface CalibrationBucket {
  /** Inclusive lower bound of stated confidence, e.g. 0.5 */
  lo: number;
  hi: number;
  n: number;
  /** Observed accuracy of the argmax prediction within this bucket. */
  accuracy: number | null;
  meanConfidence: number | null;
}

export interface EvalReport {
  available: boolean;
  reason?: string;
  perCriterion: EvalCriterionRow[];
  calibration: CalibrationBucket[];
  noteAccuracy: { decided: number; correct: number; review: number; accuracy: number | null };
}

export interface ClaudeStatus {
  configured: boolean;
  model: string;
  models: string[];
}

export interface CompiledCriterion {
  name: string;
  kind: CriterionKind;
  primitive: Primitive;
  question: string;
  trueDescription?: string | null;
  falseDescription?: string | null;
  levels?: string[] | null;
  metLevels?: number[] | null;
  weight: number;
}

export interface CompiledProtocol {
  name: string;
  description: string;
  criteria: CompiledCriterion[];
}
