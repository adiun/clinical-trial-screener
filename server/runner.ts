// Run orchestration: decide what to ask, fan out with a bounded pool, cache
// answers by (note id, criterion hash), stream each note's result over SSE as
// it lands, log every decision, and compute latency percentiles per run.
import type { Answer, Criterion, NoteStatusSnapshot, NoteView, Protocol, RunStats } from "../shared/types.js";
import { estimateJevCostUsd } from "../shared/cost.js";
import { latencyStats } from "../shared/percentiles.js";
import { noteStatus } from "../shared/rollup.js";
import type { Store } from "./db.js";
import { newId } from "./db.js";
import { buildState } from "./jev/questions.js";
import { RateLimited, type JevClient } from "./jev/types.js";
import { PauseGate, runPool } from "./pool.js";
import type { SseHub } from "./sse.js";

export interface RunRequest {
  trigger: RunStats["trigger"];
  threshold: number;
  /** Ignore the cache and re-ask everything. */
  force?: boolean;
}

export class Runner {
  private current: { runId: string; abort: AbortController } | null = null;

  constructor(
    private readonly store: Store,
    private readonly jev: JevClient,
    private readonly hub: SseHub,
    private readonly concurrency: number,
  ) {}

  get running(): string | null {
    return this.current?.runId ?? null;
  }

  cancel(): void {
    this.current?.abort.abort();
  }

  /**
   * Start a run. Resolves once the run is finished. A run already in progress
   * is cancelled first; its partial answers stay cached.
   */
  async run(protocol: Protocol, req: RunRequest): Promise<RunStats> {
    if (this.current) {
      this.current.abort.abort();
      // Give the previous run a tick to settle its final events.
      await new Promise((r) => setTimeout(r, 20));
    }
    const abort = new AbortController();
    const runId = newId("run");
    this.current = { runId, abort };

    const notes = this.store.listNotes();
    const criteria = protocol.criteria;
    const hashes = criteria.map((c) => c.hash);
    const cache = req.force ? new Map<string, Map<string, Answer>>() : this.store.loadAnswers(hashes);

    const stats: RunStats = {
      runId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      elapsedMs: null,
      noteCount: notes.length,
      apiCalls: 0,
      cachedNotes: 0,
      p50: null,
      p95: null,
      p99: null,
      inputTokens: 0,
      estimatedCostUsd: 0,
      model: this.jev.model,
      mode: this.jev.mode,
      trigger: req.trigger,
      threshold: req.threshold,
      rateLimitPauses: 0,
      rateLimitHeaders: {},
      errors: 0,
      summary: null,
    };
    this.store.createRun(stats, protocol);

    // Work out, per note, which criteria still need an answer.
    const plan: { note: NoteView; cached: Record<string, Answer>; missing: Criterion[] }[] = notes.map((note) => {
      const byHash = cache.get(note.id);
      const cached: Record<string, Answer> = {};
      const missing: Criterion[] = [];
      for (const c of criteria) {
        const hit = byHash?.get(c.hash);
        if (hit) cached[c.id] = { ...hit, cached: true };
        else missing.push(c);
      }
      return { note, cached, missing };
    });
    const toAsk = plan.filter((p) => p.missing.length > 0);
    stats.cachedNotes = plan.length - toAsk.length;
    this.hub.send({
      type: "run-start",
      runId,
      total: notes.length,
      toAsk: toAsk.length,
      fromCache: stats.cachedNotes,
      criterionIds: criteria.filter((c) => toAsk.some((p) => p.missing.some((m) => m.id === c.id))).map((c) => c.id),
      trigger: req.trigger,
    });

    const t0 = performance.now();
    const latencies: number[] = [];
    const results: Record<string, Record<string, Answer>> = {};
    const gate = new PauseGate();

    // Cached-only notes land immediately, in table order.
    let index = 0;
    for (const p of plan) {
      if (p.missing.length === 0) {
        results[p.note.id] = p.cached;
        this.hub.send({ type: "note", runId, noteId: p.note.id, answers: p.cached, index: index++ });
      }
    }

    const pendingCache: { noteId: string; answer: Answer; model: string; runId: string }[] = [];
    const pendingLog: Parameters<Store["logDecisions"]>[0][number][] = [];

    await runPool(toAsk, { concurrency: this.concurrency, signal: abort.signal, gate }, async (p) => {
      const state = buildState(p.note.text, p.note.age, p.note.sex);
      let attempt = 0;
      while (true) {
        if (abort.signal.aborted) return;
        try {
          const res = await this.jev.evaluate(p.note.id, state, p.missing, abort.signal);
          latencies.push(res.latencyMs);
          stats.apiCalls++;
          stats.inputTokens += res.inputTokens;
          if (res.model) stats.model = res.model;
          Object.assign(stats.rateLimitHeaders, res.rateLimitHeaders);
          const merged: Record<string, Answer> = { ...p.cached };
          for (const c of p.missing) {
            const a = res.answers[c.id];
            if (!a) continue;
            merged[c.id] = a;
            pendingCache.push({ noteId: p.note.id, answer: a, model: res.model, runId });
            pendingLog.push({
              runId,
              noteId: p.note.id,
              criterionId: c.id,
              criterionHash: c.hash,
              question: c.question,
              p: a.p,
              c: a.c,
              threshold: req.threshold,
              latencyMs: res.latencyMs,
            });
          }
          results[p.note.id] = merged;
          this.hub.send({ type: "note", runId, noteId: p.note.id, answers: merged, index: index++ });
          // Persist in small batches so a crash loses little and the loop stays fast.
          if (pendingCache.length >= 25) this.flush(pendingCache, pendingLog);
          return;
        } catch (err) {
          if (abort.signal.aborted) return;
          if (err instanceof RateLimited && attempt < 6) {
            attempt++;
            const pause = Math.min(30_000, Math.max(250, err.retryAfterMs) * Math.pow(1.5, attempt - 1));
            gate.pause(pause);
            stats.rateLimitPauses = gate.pauseCount;
            this.hub.send({ type: "rate-limit", runId, pauseMs: pause });
            await gate.wait(abort.signal);
            continue;
          }
          stats.errors++;
          results[p.note.id] = p.cached;
          this.hub.send({ type: "note", runId, noteId: p.note.id, answers: p.cached, index: index++ });
          return;
        }
      }
    });

    this.flush(pendingCache, pendingLog);

    const elapsed = performance.now() - t0;
    const { p50, p95, p99 } = latencyStats(latencies);
    stats.p50 = p50;
    stats.p95 = p95;
    stats.p99 = p99;
    stats.elapsedMs = elapsed;
    stats.finishedAt = new Date().toISOString();
    stats.estimatedCostUsd = estimateJevCostUsd(stats.inputTokens);

    const snapshot: Record<string, NoteStatusSnapshot> = {};
    for (const note of notes) snapshot[note.id] = noteStatus(criteria, results[note.id], req.threshold);

    if (abort.signal.aborted) {
      stats.summary = null;
      this.store.updateRunStats(stats);
      this.hub.send({ type: "run-error", runId, message: "cancelled" });
    } else {
      this.store.finishRun(stats, snapshot);
      this.hub.send({ type: "run-complete", runId, stats, snapshot });
    }
    if (this.current?.runId === runId) this.current = null;
    return stats;
  }

  private flush(cache: { noteId: string; answer: Answer; model: string; runId: string }[], log: Parameters<Store["logDecisions"]>[0][number][]): void {
    if (cache.length) {
      this.store.putAnswers(cache.splice(0, cache.length));
    }
    if (log.length) {
      this.store.logDecisions(log.splice(0, log.length));
    }
  }

  /** Rebuild a run's answers from its decision log, without calling Jev. */
  replay(runId: string): { protocol: Protocol; answers: Record<string, Record<string, Answer>>; stats: RunStats } | null {
    const run = this.store.getRun(runId);
    if (!run) return null;
    const decisions = this.store.decisionsForRun(runId);
    const answers: Record<string, Record<string, Answer>> = {};
    for (const d of decisions) {
      const forNote = (answers[d.noteId] ??= {});
      const criterion = run.protocol.criteria.find((c) => c.id === d.criterionId);
      forNote[d.criterionId] = {
        criterionHash: d.criterionHash,
        p: d.p,
        c: d.c,
        raw: criterion?.primitive === "score" ? { type: "score", score: d.p, confidence: d.c, probabilities: {} } : { type: "noul", noul: d.p },
        latencyMs: d.latencyMs,
        cached: true,
      };
    }
    return { protocol: run.protocol, answers, stats: run.stats };
  }
}
