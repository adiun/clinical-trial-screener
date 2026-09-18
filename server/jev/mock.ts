// A fake Jev for tuning the UX without quota. Answers are plausible, stable
// for a given (note, criterion hash) pair so re-runs and edits behave like the
// real thing, and arrive after 70-500ms of jitter.
//
// Plausibility is deliberately shallow: keyword hits with a negation check for
// yes/no questions, a numeric lookup for graded labs, and a range check for
// age. It is not a model and never sees `truth`.
import type { Criterion } from "../../shared/types.js";
import { fnv1a64 } from "../../shared/hash.js";
import { toAnswer, type RawJevAnswer } from "./questions.js";
import { RateLimited, type EvaluateResult, type JevClient, type NoteState } from "./types.js";

export interface MockOptions {
  minLatencyMs?: number;
  maxLatencyMs?: number;
  /** Probability [0,1] that a call fails with a simulated 429. Default 0. */
  rateLimitRate?: number;
}

export class MockJevClient implements JevClient {
  readonly mode = "mock" as const;
  readonly model = "jev-mock";
  private readonly min: number;
  private readonly max: number;
  private readonly rateLimitRate: number;

  constructor(opts: MockOptions = {}) {
    this.min = opts.minLatencyMs ?? 70;
    this.max = opts.maxLatencyMs ?? 500;
    this.rateLimitRate = opts.rateLimitRate ?? 0;
  }

  async evaluate(noteId: string, state: NoteState, criteria: readonly Criterion[], signal?: AbortSignal): Promise<EvaluateResult> {
    const latencyMs = this.min + Math.random() * (this.max - this.min);
    await sleep(latencyMs, signal);
    if (this.rateLimitRate > 0 && Math.random() < this.rateLimitRate) throw new RateLimited(800, "mock 429");
    const answers: EvaluateResult["answers"] = {};
    const tokenSets = criteria.map((c) => tokensFor(c));
    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i]!;
      const rng = seeded(`${noteId}|${c.hash}`);
      const own = tokenSets[i]!;
      const others = new Set<string>();
      tokenSets.forEach((t, j) => {
        if (j !== i) for (const w of t) others.add(w);
      });
      const raw = c.primitive === "score" ? mockScore(state.note, c, rng) : mockNoul(state, c, own, others, rng);
      answers[c.id] = toAnswer(c, raw, latencyMs);
    }
    const inputTokens = Math.round(state.note.length / 4) + criteria.length * 40;
    return { answers, latencyMs, inputTokens, model: this.model, rateLimitHeaders: {} };
  }
}

const STOP = new Set([
  "patient", "patients", "documented", "documentation", "diagnosis", "history", "currently", "including", "within",
  "roughly", "months", "present", "otherwise", "stated", "anywhere", "personal", "family", "receptor", "agonist", "taking",
  "taken", "products", "contain", "combination", "clinical", "recent", "level", "value", "based", "least", "years", "which",
  "appears", "medication", "mentioned", "equivalent", "names", "diagnoses", "explicitly", "denied", "documents", "carcinoma",
]);

/** Distinctive tokens: long words, "word digit" phrases, and uppercase abbreviations. */
function tokensFor(c: Criterion): Set<string> {
  const source = [c.name, c.question, c.trueDescription ?? ""].join(" ");
  const lower = source.toLowerCase();
  const out = new Set<string>();
  for (const w of lower.match(/[a-z][a-z0-9-]{5,}/g) ?? []) if (!STOP.has(w)) out.add(w);
  for (const p of lower.match(/\b[a-z]{3,} [0-9]\b/g) ?? []) out.add(p);
  for (const a of source.match(/\b[A-Z][A-Z0-9-]{2,}\b/g) ?? []) out.add(a.toLowerCase());
  return out;
}

function mockNoul(state: NoteState, c: Criterion, own: Set<string>, others: Set<string>, rng: () => number): RawJevAnswer {
  const text = state.note.toLowerCase();
  const q = c.question.toLowerCase();

  // Age-style range questions: compare the number from state in code, as a
  // person would; blur a little so the limit slider has work to do.
  if (/\bage\b/.test(q) && state.patient?.age !== undefined) {
    const nums = (q.match(/\b\d{1,3}\b/g) ?? []).map(Number).filter((n) => n > 0 && n < 130);
    if (nums.length >= 2) {
      const lo = Math.min(nums[0]!, nums[1]!);
      const hi = Math.max(nums[0]!, nums[1]!);
      const inside = state.patient.age >= lo && state.patient.age <= hi;
      return { type: "noul", noul: clamp((inside ? 0.93 : 0.06) + (rng() - 0.5) * 0.08) };
    }
  }

  let evidence = 0;
  let uniqueHit = false;
  for (const tok of own) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(tok, from);
      if (idx < 0) break;
      from = idx + tok.length;
      const beforeCh = idx > 0 ? text[idx - 1]! : " ";
      const afterCh = text[idx + tok.length] ?? " ";
      if (/[a-z0-9]/.test(beforeCh) || /[a-z0-9]/.test(afterCh)) continue;
      const before = text.slice(Math.max(0, idx - 60), idx);
      const negated = /\b(no|denies|denied|negative for|without|not|never|absence of)\b[^.;]*$/.test(before);
      const weight = others.has(tok) ? 0.35 : 1;
      if (!others.has(tok)) uniqueHit = true;
      evidence += negated ? -weight : weight;
    }
  }
  if (!uniqueHit && evidence > 0) evidence = 0;
  let base: number;
  if (evidence >= 1) base = 0.86;
  else if (evidence > 0) base = 0.62;
  else if (evidence === 0) base = 0.1;
  else base = 0.14;
  const spread = rng() < 0.12 ? 0.3 : 0.08;
  return { type: "noul", noul: clamp(base + (rng() - 0.5) * 2 * spread) };
}

/** Graded labs: find the value in the note after a keyword from the name, then place it on the levels. */
function mockScore(note: string, c: Criterion, rng: () => number): RawJevAnswer {
  const levels = c.levels ?? [];
  const n = Math.max(2, levels.length);
  const source = `${c.name} ${c.question}`;
  const abbrevs = (source.match(/\b[A-Za-z]*(?:[A-Z][a-z]*[A-Z0-9]|[a-z]+[0-9]+[a-z]*)[A-Za-z0-9]*\b/g) ?? []).map((k) => k.toLowerCase());
  const longWords = (c.name.match(/[A-Za-z]{5,}/g) ?? []).map((k) => k.toLowerCase()).filter((k) => !STOP.has(k) && !/^(higher|lower|recent)$/.test(k));
  const keywords = [...new Set([...abbrevs, ...longWords])];
  const lower = note.toLowerCase();
  let value: number | null = null;
  for (const k of keywords) {
    const re = new RegExp(`${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^0-9]{0,12}(\\d+(?:\\.\\d+)?)`, "i");
    const m = re.exec(lower);
    if (m?.[1]) {
      value = Number.parseFloat(m[1]);
      break;
    }
  }
  let peak: number;
  if (value === null) {
    const notDoc = levels.findIndex((l) => /not documented|no .* documented|missing|absent/i.test(l));
    peak = notDoc >= 0 ? notDoc : Math.floor(rng() * n);
  } else {
    peak = levelFor(value, levels);
    if (peak < 0) peak = Math.floor(rng() * n);
  }
  const sharpness = rng() < 0.12 ? 0.9 : 2.4;
  const weights = Array.from({ length: n }, (_, i) => Math.exp(-Math.abs(i - peak) * sharpness));
  const sum = weights.reduce((a, b) => a + b, 0);
  const probabilities: Record<string, number> = {};
  let expected = 0;
  weights.forEach((w, i) => {
    const p = w / sum;
    probabilities[String(i)] = p;
    expected += i * p;
  });
  const confidence = Math.max(...weights.map((w) => w / sum));
  return { type: "score", score: expected, confidence, probabilities };
}

/** Parse numeric bounds out of level text ("below 7.0", "from 45 up to 59", "above 10.0"). */
function levelFor(value: number, levels: readonly string[]): number {
  for (let i = 0; i < levels.length; i++) {
    const l = levels[i]!.toLowerCase();
    const nums = (l.match(/(?<![a-z0-9.])\d+(?:\.\d+)?(?![a-z0-9])/g) ?? []).map(Number).filter((x) => x < 1000);
    if (nums.length === 0) continue;
    if (/below|under|less than/.test(l) && nums.length === 1) {
      if (value < nums[0]!) return i;
      continue;
    }
    if (/above|over|greater than|or higher|or more|at least/.test(l) && nums.length === 1) {
      if (value >= nums[0]!) return i;
      continue;
    }
    if (nums.length >= 2) {
      const lo = Math.min(nums[0]!, nums[1]!);
      const hi = Math.max(nums[0]!, nums[1]!);
      if (value >= lo && value <= hi + 0.0999) return i;
    }
  }
  return -1;
}

function seeded(key: string): () => number {
  let s = Number.parseInt(fnv1a64(key).slice(0, 8), 16) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function clamp(n: number): number {
  return Math.min(0.99, Math.max(0.01, n));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}
