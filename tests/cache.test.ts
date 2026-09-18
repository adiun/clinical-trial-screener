import { describe, expect, it } from "vitest";
import { Store } from "../server/db.js";
import { DEFAULT_CRITERIA, DEFAULT_PROTOCOL } from "../server/protocol.js";
import { criterionHash } from "../shared/hash.js";
import type { Answer } from "../shared/types.js";

function seeded(): Store {
  const store = new Store(":memory:");
  store.upsertProtocol(DEFAULT_PROTOCOL);
  store.replaceCriteria(DEFAULT_PROTOCOL.id, DEFAULT_CRITERIA);
  store.replaceNotes([
    { id: "n1", text: "62 y/o M with type 2 diabetes on metformin.", format: "soap", truth: emptyTruth() },
    { id: "n2", text: "45 y/o F, no diabetes.", format: "soap", truth: emptyTruth() },
  ]);
  return store;
}

function emptyTruth() {
  return { age: 50, sex: "M" as const, diagnoses: [], meds: [], labs: [], procedures: [], familyHistory: [] };
}

const answer = (hash: string, p = 0.9): Answer => ({ criterionHash: hash, p, c: 0.8, raw: { type: "noul", noul: p }, latencyMs: 12, cached: false });

describe("answer cache keyed by (note id, criterion hash)", () => {
  it("hits for unchanged criteria and misses for the edited one only", () => {
    const store = seeded();
    const protocol = store.getProtocol(DEFAULT_PROTOCOL.id)!;
    const [a, b] = protocol.criteria;
    store.putAnswers([
      { noteId: "n1", answer: answer(a!.hash), model: "m", runId: "r1" },
      { noteId: "n1", answer: answer(b!.hash), model: "m", runId: "r1" },
      { noteId: "n2", answer: answer(a!.hash), model: "m", runId: "r1" },
    ]);

    // Edit criterion a's question: its hash changes, b's does not.
    const edited = store.updateCriterion(a!.id, { question: "does the patient have T2DM documented anywhere?" })!;
    expect(edited.hash).not.toBe(a!.hash);
    const after = store.getProtocol(DEFAULT_PROTOCOL.id)!;
    expect(after.criteria.find((c) => c.id === b!.id)!.hash).toBe(b!.hash);

    const cache = store.loadAnswers(after.criteria.map((c) => c.hash));
    expect(cache.get("n1")!.has(b!.hash)).toBe(true); // unchanged criterion still cached
    expect(cache.get("n1")!.has(edited.hash)).toBe(false); // edited criterion must be re-asked
    expect(cache.get("n2")?.has(edited.hash) ?? false).toBe(false);
  });

  it("does not change the hash when only the name or weight changes", () => {
    const store = seeded();
    const c = store.getProtocol(DEFAULT_PROTOCOL.id)!.criteria[0]!;
    const renamed = store.updateCriterion(c.id, { name: "Renamed", weight: 0.3 })!;
    expect(renamed.hash).toBe(c.hash);
  });

  it("changes the hash when Score levels or met levels change", () => {
    const store = seeded();
    const score = store.getProtocol(DEFAULT_PROTOCOL.id)!.criteria.find((c) => c.primitive === "score")!;
    const levelsChanged = store.updateCriterion(score.id, { levels: [...(score.levels ?? []), "extra level"] })!;
    expect(levelsChanged.hash).not.toBe(score.hash);
    const metChanged = store.updateCriterion(score.id, { metLevels: [1] })!;
    expect(metChanged.hash).not.toBe(levelsChanged.hash);
  });

  it("keeps the cache warm across a re-import of the same notes", () => {
    const store = seeded();
    const c = store.getProtocol(DEFAULT_PROTOCOL.id)!.criteria[0]!;
    store.putAnswers([{ noteId: "n1", answer: answer(c.hash), model: "m", runId: "r1" }]);
    store.replaceNotes([{ id: "n1", text: "same note", format: "soap", truth: emptyTruth() }]);
    expect(store.loadAnswers([c.hash]).get("n1")!.has(c.hash)).toBe(true);
  });

  it("hash is a pure function of the question-bearing fields", () => {
    const base = { primitive: "noul" as const, question: "q", trueDescription: null, falseDescription: null, levels: null, metLevels: null };
    expect(criterionHash(base)).toBe(criterionHash({ ...base, question: " q " }));
    expect(criterionHash(base)).not.toBe(criterionHash({ ...base, trueDescription: "yes means yes" }));
  });
});

describe("decision log and replay", () => {
  it("stores every decision with its question and threshold", () => {
    const store = seeded();
    const protocol = store.getProtocol(DEFAULT_PROTOCOL.id)!;
    const c = protocol.criteria[0]!;
    const stats = {
      runId: "run1", startedAt: "t", finishedAt: null, elapsedMs: null, noteCount: 2, apiCalls: 0, cachedNotes: 0,
      p50: null, p95: null, p99: null, inputTokens: 0, estimatedCostUsd: 0, model: "m", mode: "mock" as const,
      trigger: "run" as const, threshold: 0.6, rateLimitPauses: 0, rateLimitHeaders: {}, errors: 0, retries: true, failures: {}, summary: null,
    };
    store.createRun(stats, protocol);
    store.logDecisions([{ runId: "run1", noteId: "n1", criterionId: c.id, criterionHash: c.hash, question: c.question, p: 0.9, c: 0.8, threshold: 0.6, latencyMs: 12 }]);
    const rows = store.decisionsForRun("run1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ noteId: "n1", criterionId: c.id, p: 0.9, threshold: 0.6, question: c.question });
  });

  it("clearRuns drops runs and decisions but keeps notes; clearAnswers empties the cache", () => {
    const store = seeded();
    const protocol = store.getProtocol(DEFAULT_PROTOCOL.id)!;
    const c = protocol.criteria[0]!;
    const stats = {
      runId: "run1", startedAt: "t", finishedAt: "t2", elapsedMs: 5, noteCount: 2, apiCalls: 1, cachedNotes: 0,
      p50: 1, p95: 1, p99: 1, inputTokens: 0, estimatedCostUsd: 0, model: "m", mode: "mock" as const,
      trigger: "run" as const, threshold: 0.6, rateLimitPauses: 0, rateLimitHeaders: {}, errors: 0, retries: true, failures: {}, summary: null,
    };
    store.createRun(stats, protocol);
    store.finishRun(stats, {});
    store.logDecisions([{ runId: "run1", noteId: "n1", criterionId: c.id, criterionHash: c.hash, question: c.question, p: 0.9, c: 0.8, threshold: 0.6, latencyMs: 12 }]);
    store.putAnswers([{ noteId: "n1", answer: answer(c.hash), model: "m", runId: "run1" }]);

    store.clearAnswers();
    store.clearRuns();

    expect(store.loadAnswers([c.hash]).size).toBe(0);
    expect(store.recentRuns()).toHaveLength(0);
    expect(store.getRun("run1")).toBeNull();
    expect(store.decisionsForRun("run1")).toHaveLength(0);
    expect(store.noteCount()).toBe(2);
  });
});
