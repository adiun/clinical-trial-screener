import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv, readConfig } from "./env.js";
import { Store } from "./db.js";
import { createJevClient } from "./jev/index.js";
import { SseHub } from "./sse.js";
import { Runner } from "./runner.js";
import { ensureDefaultProtocol, readNotesJsonl } from "./import.js";
import { DEFAULT_CRITERIA, DEFAULT_PROTOCOL, DEFAULT_PROTOCOL_ID } from "./protocol.js";
import { buildEvalReport } from "./eval.js";
import * as claude from "./claude.js";
import { flippedNotes, noteStatus } from "../shared/rollup.js";
import type { Answer, AppState, ClaudeStatus, CriterionInput, NoteStatusSnapshot } from "../shared/types.js";

loadDotEnv();
const config = readConfig();
const here = path.dirname(fileURLToPath(import.meta.url));

const store = new Store(config.dbPath);
ensureDefaultProtocol(store);

// Auto-import on first start when the DB is empty and the file is present.
if (store.noteCount() === 0 && fs.existsSync(config.notesPath)) {
  const { records, skipped } = await readNotesJsonl(config.notesPath);
  store.replaceNotes(records);
  process.stdout.write(`Imported ${records.length} notes from ${config.notesPath}${skipped ? ` (${skipped} skipped)` : ""}.\n`);
}

const jev = createJevClient(config);
const hub = new SseHub();
const runner = new Runner(store, jev, hub, config.jevConcurrency);

const app = Fastify({
  // Request bodies are never logged: the credentials route would leak. Request
  // logging is emitted at info level, so warn suppresses it entirely.
  logger: { level: "warn" },
  bodyLimit: 2 * 1024 * 1024,
});

app.setErrorHandler((err, _req, reply) => {
  const message = err instanceof Error ? err.message : String(err);
  const status = err instanceof claude.ClaudeNotConfigured ? 401 : (err as { statusCode?: number }).statusCode ?? 500;
  if (status >= 500) app.log.error({ err: message }, "request failed");
  reply.status(status).send({ error: message });
});

function protocol() {
  const p = store.getProtocol(DEFAULT_PROTOCOL_ID);
  if (!p) throw new Error("default protocol missing");
  return p;
}

function currentAnswers(): Record<string, Record<string, Answer>> {
  const p = protocol();
  const cache = store.loadAnswers(p.criteria.map((c) => c.hash));
  const out: Record<string, Record<string, Answer>> = {};
  for (const [noteId, byHash] of cache) {
    const forNote: Record<string, Answer> = {};
    for (const c of p.criteria) {
      const a = byHash.get(c.hash);
      if (a) forNote[c.id] = a;
    }
    out[noteId] = forNote;
  }
  return out;
}

// ---- state -----------------------------------------------------------------

function appState(): AppState {
  const recent = store.recentRuns(2);
  return {
    protocol: protocol(),
    notes: store.listNotes(),
    answers: currentAnswers(),
    lastRun: recent[0]?.stats ?? null,
    lastSnapshot: recent[0]?.snapshot ?? null,
    previousSnapshot: recent[1]?.snapshot ?? null,
    mode: jev.mode,
    jevModel: jev.model,
    concurrency: config.jevConcurrency,
    notesLoaded: store.noteCount() > 0,
  };
}

app.get("/api/state", async (): Promise<AppState> => appState());

app.get("/api/events", (req, reply) => {
  hub.add(reply.raw);
  hub.send({ type: "hello", mode: jev.mode });
  req.raw.on("close", () => reply.raw.end());
  // Keep the reply open; Fastify must not try to send a body.
  return reply;
});

// ---- notes -----------------------------------------------------------------

app.post("/api/import", async () => {
  if (!fs.existsSync(config.notesPath)) {
    return { ok: false, error: `No file at ${config.notesPath}` };
  }
  const { records, skipped } = await readNotesJsonl(config.notesPath);
  const n = store.replaceNotes(records);
  return { ok: true, imported: n, skipped };
});

app.get<{ Params: { id: string } }>("/api/notes/:id", async (req, reply) => {
  const note = store.listNotes().find((n) => n.id === req.params.id);
  if (!note) return reply.status(404).send({ error: "note not found" });
  return note;
});

// ---- criteria ---------------------------------------------------------------

app.get("/api/protocol", async () => protocol());

app.patch<{ Params: { id: string }; Body: Partial<CriterionInput> }>("/api/criteria/:id", async (req, reply) => {
  const updated = store.updateCriterion(req.params.id, req.body ?? {});
  if (!updated) return reply.status(404).send({ error: "criterion not found" });
  const p = protocol();
  hub.send({ type: "protocol", protocol: p });
  return updated;
});

app.post<{ Body: CriterionInput }>("/api/criteria", async (req) => {
  const body = req.body;
  const created = store.addCriterion(DEFAULT_PROTOCOL_ID, {
    name: body.name || "New criterion",
    kind: body.kind === "exclusion" ? "exclusion" : "inclusion",
    primitive: body.primitive === "score" ? "score" : "noul",
    question: body.question || "",
    trueDescription: body.trueDescription ?? null,
    falseDescription: body.falseDescription ?? null,
    levels: body.levels ?? null,
    metLevels: body.metLevels ?? null,
    weight: typeof body.weight === "number" ? body.weight : 1,
  });
  hub.send({ type: "protocol", protocol: protocol() });
  return created;
});

app.delete<{ Params: { id: string } }>("/api/criteria/:id", async (req) => {
  store.deleteCriterion(req.params.id);
  hub.send({ type: "protocol", protocol: protocol() });
  return { ok: true };
});

function restoreDefaultProtocol() {
  store.upsertProtocol({ ...DEFAULT_PROTOCOL, compiledJson: null });
  store.db.prepare(`UPDATE protocols SET compiled_json = NULL WHERE id = ?`).run(DEFAULT_PROTOCOL.id);
  store.replaceCriteria(DEFAULT_PROTOCOL.id, DEFAULT_CRITERIA);
  const p = protocol();
  hub.send({ type: "protocol", protocol: p });
  return p;
}

app.post("/api/protocol/reset", async () => restoreDefaultProtocol());

/**
 * Back to a cold start: cancel any run in flight, drop the answer cache, every
 * run and its decision log, and restore the default protocol. Notes and Claude
 * credentials are kept. The next run measures true end-to-end latency.
 */
app.post("/api/reset", async (): Promise<AppState> => {
  if (runner.running) {
    runner.cancel();
    // Let the cancelled run flush its final events before the wipe.
    await new Promise((r) => setTimeout(r, 50));
  }
  store.clearAnswers();
  store.clearRuns();
  restoreDefaultProtocol();
  return appState();
});

// ---- runs -------------------------------------------------------------------

app.post<{ Body: { threshold?: number; trigger?: "run" | "edit"; force?: boolean } }>("/api/run", async (req) => {
  if (store.noteCount() === 0) throw Object.assign(new Error("No notes loaded. Put data/notes.jsonl in place and run `npm run import`."), { statusCode: 409 });
  const threshold = clamp(req.body?.threshold ?? 0.6, 0, 1);
  const trigger = req.body?.trigger === "edit" ? "edit" : "run";
  const p = protocol();
  // Fire and forget: progress streams over SSE.
  void runner.run(p, { threshold, trigger, force: Boolean(req.body?.force) }).catch((err) => {
    app.log.error({ err: String(err) }, "run failed");
  });
  return { ok: true };
});

app.post("/api/run/cancel", async () => {
  runner.cancel();
  return { ok: true };
});

app.post("/api/cache/clear", async () => {
  store.clearAnswers();
  return { ok: true };
});

app.get("/api/runs", async () => store.recentRuns(20).map((r) => r.stats));

app.get<{ Params: { id: string } }>("/api/runs/:id/decisions", async (req, reply) => {
  const run = store.getRun(req.params.id);
  if (!run) return reply.status(404).send({ error: "run not found" });
  return { stats: run.stats, decisions: store.decisionsForRun(req.params.id) };
});

app.get<{ Params: { id: string } }>("/api/runs/:id/replay", async (req, reply) => {
  const replayed = runner.replay(req.params.id);
  if (!replayed) return reply.status(404).send({ error: "run not found" });
  const snapshot: Record<string, NoteStatusSnapshot> = {};
  for (const note of store.listNotes()) snapshot[note.id] = noteStatus(replayed.protocol.criteria, replayed.answers[note.id], replayed.stats.threshold);
  return { ...replayed, snapshot };
});

// ---- evaluation -------------------------------------------------------------

app.get<{ Querystring: { threshold?: string } }>("/api/eval", async (req) => {
  const threshold = clamp(Number.parseFloat(req.query.threshold ?? "0.6"), 0, 1);
  const p = protocol();
  return buildEvalReport(p.criteria, store.listTruth(), currentAnswers(), Number.isFinite(threshold) ? threshold : 0.6);
});

// ---- claude -----------------------------------------------------------------

app.get("/api/claude/status", async (): Promise<ClaudeStatus> => ({
  configured: claude.isConfigured(),
  model: claude.getModel(),
  models: [...claude.CLAUDE_MODELS],
}));

app.post<{ Body: { apiKey?: string; model?: string } }>("/api/claude/credentials", async (req) => {
  if (typeof req.body?.apiKey === "string" && req.body.apiKey.trim()) claude.setCredentials(req.body.apiKey);
  if (typeof req.body?.model === "string") claude.setModel(req.body.model);
  return { configured: claude.isConfigured(), model: claude.getModel() };
});

app.delete("/api/claude/credentials", async () => {
  claude.clearCredentials();
  return { configured: false };
});

app.post<{ Body: { description: string } }>("/api/claude/compile", async (req) => {
  const description = String(req.body?.description ?? "").trim();
  if (!description) throw Object.assign(new Error("Describe the trial first."), { statusCode: 400 });
  const { compiled, raw } = await claude.compileProtocol(description);
  store.upsertProtocol({ id: DEFAULT_PROTOCOL_ID, name: compiled.name, description: compiled.description, compiledJson: raw });
  store.replaceCriteria(
    DEFAULT_PROTOCOL_ID,
    compiled.criteria.map((c) => ({
      name: c.name,
      kind: c.kind,
      primitive: c.primitive,
      question: c.question,
      trueDescription: c.trueDescription ?? null,
      falseDescription: c.falseDescription ?? null,
      levels: c.levels ?? null,
      metLevels: c.metLevels ?? null,
      weight: c.weight,
    })),
  );
  const p = protocol();
  hub.send({ type: "protocol", protocol: p });
  return p;
});

app.post<{ Body: { runId: string; threshold?: number } }>("/api/claude/summary", async (req, reply) => {
  const run = store.getRun(req.body?.runId ?? "");
  if (!run || !run.snapshot) return reply.status(404).send({ error: "run not found or not finished" });
  const previous = store.recentRuns(20).find((r) => r.stats.finishedAt && r.stats.finishedAt < (run.stats.finishedAt ?? "") && r.snapshot);
  const criteria = run.protocol.criteria;
  const flips = previous?.snapshot ? flippedNotes(criteria, previous.snapshot, run.snapshot) : [];
  const counts = { eligible: 0, ineligible: 0, review: 0 };
  const uncertainByCriterion = new Map<string, number>();
  for (const snap of Object.values(run.snapshot)) {
    if (snap.status === "eligible" || snap.status === "ineligible" || snap.status === "review") counts[snap.status]++;
    for (const [cid, s] of Object.entries(snap.criteria)) if (s === "uncertain") uncertainByCriterion.set(cid, (uncertainByCriterion.get(cid) ?? 0) + 1);
  }
  const byCrit = new Map<string, number>();
  for (const f of flips) if (f.criterionId) byCrit.set(f.criterionId, (byCrit.get(f.criterionId) ?? 0) + 1);
  const nameOf = (id: string) => criteria.find((c) => c.id === id)?.name ?? id;
  const mostUncertain = [...uncertainByCriterion.entries()].sort((a, b) => b[1] - a[1])[0];
  const summary = await claude.summarizeRun({
    noteCount: run.stats.noteCount,
    ...counts,
    elapsedMs: run.stats.elapsedMs,
    p50: run.stats.p50,
    p99: run.stats.p99,
    flipped: flips.length,
    flippedByCriterion: [...byCrit.entries()].map(([id, count]) => ({ name: nameOf(id), count })).sort((a, b) => b.count - a.count).slice(0, 3),
    mostUncertainCriterion: mostUncertain ? { name: nameOf(mostUncertain[0]), uncertainCount: mostUncertain[1] } : null,
    threshold: run.stats.threshold,
    trigger: run.stats.trigger,
  });
  run.stats.summary = summary;
  store.updateRunStats(run.stats);
  hub.send({ type: "summary", runId: run.stats.runId, summary });
  return { summary };
});

// ---- static client (production) --------------------------------------------

const clientDir = path.resolve(here, "../client");
if (fs.existsSync(path.join(clientDir, "index.html"))) {
  const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
  app.get("/*", async (req, reply) => {
    const url = (req.raw.url ?? "/").split("?")[0] ?? "/";
    let file = path.join(clientDir, url === "/" ? "index.html" : url);
    if (!file.startsWith(clientDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(clientDir, "index.html");
    reply.type(types[path.extname(file)] ?? "application/octet-stream");
    return fs.createReadStream(file);
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

await app.listen({ port: config.port, host: "127.0.0.1" });
process.stdout.write(
  `screener api on http://127.0.0.1:${config.port}  jev=${jev.mode}${jev.mode === "live" ? ` (${jev.model})` : ""}  concurrency=${config.jevConcurrency}  notes=${store.noteCount()}\n`,
);
