import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Answer,
  Criterion,
  CriterionInput,
  DecisionLogRow,
  NoteRecord,
  NoteStatusSnapshot,
  NoteTruth,
  NoteView,
  Protocol,
  RawAnswer,
  RunStats,
} from "../shared/types.js";
import { criterionHash } from "../shared/hash.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  format TEXT NOT NULL,
  truth TEXT NOT NULL,
  age INTEGER,
  sex TEXT
);
CREATE INDEX IF NOT EXISTS notes_position ON notes(position);

CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  compiled_json TEXT
);

CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  primitive TEXT NOT NULL,
  question TEXT NOT NULL,
  true_description TEXT,
  false_description TEXT,
  levels TEXT,
  met_levels TEXT,
  weight REAL NOT NULL DEFAULT 1,
  hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS criteria_protocol ON criteria(protocol_id, position);

-- Answer cache keyed by (note id, criterion hash).
CREATE TABLE IF NOT EXISTS answers (
  note_id TEXT NOT NULL,
  criterion_hash TEXT NOT NULL,
  p REAL NOT NULL,
  c REAL NOT NULL,
  raw TEXT NOT NULL,
  latency_ms REAL NOT NULL,
  model TEXT NOT NULL,
  run_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, criterion_hash)
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  stats TEXT NOT NULL,
  protocol_snapshot TEXT NOT NULL,
  snapshot TEXT
);
CREATE INDEX IF NOT EXISTS runs_started ON runs(started_at);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  criterion_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  p REAL NOT NULL,
  c REAL NOT NULL,
  threshold REAL NOT NULL,
  latency_ms REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS decisions_run ON decisions(run_id);
`;

export interface CriterionRow {
  id: string;
  protocol_id: string;
  position: number;
  name: string;
  kind: string;
  primitive: string;
  question: string;
  true_description: string | null;
  false_description: string | null;
  levels: string | null;
  met_levels: string | null;
  weight: number;
  hash: string;
}

function rowToCriterion(r: CriterionRow): Criterion {
  return {
    id: r.id,
    position: r.position,
    name: r.name,
    kind: r.kind === "exclusion" ? "exclusion" : "inclusion",
    primitive: r.primitive === "score" ? "score" : "noul",
    question: r.question,
    trueDescription: r.true_description,
    falseDescription: r.false_description,
    levels: r.levels ? (JSON.parse(r.levels) as string[]) : null,
    metLevels: r.met_levels ? (JSON.parse(r.met_levels) as number[]) : null,
    weight: r.weight,
    hash: r.hash,
  };
}

export class Store {
  readonly db: Database.Database;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  // ---- notes -------------------------------------------------------------

  replaceNotes(records: readonly NoteRecord[]): number {
    const insert = this.db.prepare(
      `INSERT INTO notes (id, position, text, format, truth, age, sex) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = this.db.transaction((rows: readonly NoteRecord[]) => {
      this.db.prepare(`DELETE FROM notes`).run();
      rows.forEach((n, i) => {
        const { age, sex } = parseDemographics(n.text);
        insert.run(n.id, i, n.text, n.format, JSON.stringify(n.truth), age, sex);
      });
    });
    tx(records);
    return records.length;
  }

  noteCount(): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM notes`).get() as { n: number }).n;
  }

  listNotes(): NoteView[] {
    const rows = this.db
      .prepare(`SELECT id, position, text, format, age, sex FROM notes ORDER BY position`)
      .all() as { id: string; position: number; text: string; format: string; age: number | null; sex: string | null }[];
    return rows.map((r) => ({ ...r, sex: r.sex === "M" || r.sex === "F" ? r.sex : null }));
  }

  /** Truth is only ever read by the evaluation module. */
  listTruth(): { id: string; truth: NoteTruth }[] {
    const rows = this.db.prepare(`SELECT id, truth FROM notes ORDER BY position`).all() as { id: string; truth: string }[];
    return rows.map((r) => ({ id: r.id, truth: JSON.parse(r.truth) as NoteTruth }));
  }

  // ---- protocol ----------------------------------------------------------

  getProtocol(id: string): Protocol | null {
    const p = this.db.prepare(`SELECT id, name, description, compiled_json FROM protocols WHERE id = ?`).get(id) as
      | { id: string; name: string; description: string; compiled_json: string | null }
      | undefined;
    if (!p) return null;
    const rows = this.db.prepare(`SELECT * FROM criteria WHERE protocol_id = ? ORDER BY position`).all(id) as CriterionRow[];
    return { id: p.id, name: p.name, description: p.description, compiledJson: p.compiled_json, criteria: rows.map(rowToCriterion) };
  }

  upsertProtocol(protocol: { id: string; name: string; description: string; compiledJson?: string | null }): void {
    this.db
      .prepare(
        `INSERT INTO protocols (id, name, description, compiled_json) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
           compiled_json = COALESCE(excluded.compiled_json, protocols.compiled_json)`,
      )
      .run(protocol.id, protocol.name, protocol.description, protocol.compiledJson ?? null);
  }

  /** Replace every criterion of a protocol. Returns the new criteria. */
  replaceCriteria(protocolId: string, inputs: readonly CriterionInput[]): Criterion[] {
    const insert = this.db.prepare(
      `INSERT INTO criteria (id, protocol_id, position, name, kind, primitive, question, true_description, false_description, levels, met_levels, weight, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM criteria WHERE protocol_id = ?`).run(protocolId);
      inputs.forEach((c, i) => {
        const id = c.id ?? newId("c");
        insert.run(
          id,
          protocolId,
          i,
          c.name,
          c.kind,
          c.primitive,
          c.question,
          c.trueDescription ?? null,
          c.falseDescription ?? null,
          c.levels ? JSON.stringify(c.levels) : null,
          c.metLevels ? JSON.stringify(c.metLevels) : null,
          c.weight,
          criterionHash(c),
        );
      });
    });
    tx();
    return this.getProtocol(protocolId)?.criteria ?? [];
  }

  /** Update one criterion in place. Recomputes its hash. */
  updateCriterion(id: string, patch: Partial<CriterionInput>): Criterion | null {
    const row = this.db.prepare(`SELECT * FROM criteria WHERE id = ?`).get(id) as CriterionRow | undefined;
    if (!row) return null;
    const current = rowToCriterion(row);
    const next: CriterionInput = {
      name: patch.name ?? current.name,
      kind: patch.kind ?? current.kind,
      primitive: patch.primitive ?? current.primitive,
      question: patch.question ?? current.question,
      trueDescription: patch.trueDescription === undefined ? current.trueDescription : patch.trueDescription,
      falseDescription: patch.falseDescription === undefined ? current.falseDescription : patch.falseDescription,
      levels: patch.levels === undefined ? current.levels : patch.levels,
      metLevels: patch.metLevels === undefined ? current.metLevels : patch.metLevels,
      weight: patch.weight ?? current.weight,
    };
    if (next.primitive === "noul") {
      next.levels = null;
      next.metLevels = null;
    }
    this.db
      .prepare(
        `UPDATE criteria SET name = ?, kind = ?, primitive = ?, question = ?, true_description = ?, false_description = ?,
           levels = ?, met_levels = ?, weight = ?, hash = ? WHERE id = ?`,
      )
      .run(
        next.name,
        next.kind,
        next.primitive,
        next.question,
        next.trueDescription ?? null,
        next.falseDescription ?? null,
        next.levels ? JSON.stringify(next.levels) : null,
        next.metLevels ? JSON.stringify(next.metLevels) : null,
        next.weight,
        criterionHash(next),
        id,
      );
    return rowToCriterion(this.db.prepare(`SELECT * FROM criteria WHERE id = ?`).get(id) as CriterionRow);
  }

  deleteCriterion(id: string): void {
    this.db.prepare(`DELETE FROM criteria WHERE id = ?`).run(id);
    // Re-pack positions.
    const rows = this.db.prepare(`SELECT id FROM criteria ORDER BY position`).all() as { id: string }[];
    const upd = this.db.prepare(`UPDATE criteria SET position = ? WHERE id = ?`);
    const tx = this.db.transaction(() => rows.forEach((r, i) => upd.run(i, r.id)));
    tx();
  }

  addCriterion(protocolId: string, input: CriterionInput): Criterion {
    const pos = (this.db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM criteria WHERE protocol_id = ?`).get(protocolId) as { p: number }).p;
    const id = input.id ?? newId("c");
    this.db
      .prepare(
        `INSERT INTO criteria (id, protocol_id, position, name, kind, primitive, question, true_description, false_description, levels, met_levels, weight, hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        protocolId,
        pos,
        input.name,
        input.kind,
        input.primitive,
        input.question,
        input.trueDescription ?? null,
        input.falseDescription ?? null,
        input.levels ? JSON.stringify(input.levels) : null,
        input.metLevels ? JSON.stringify(input.metLevels) : null,
        input.weight,
        criterionHash(input),
      );
    return rowToCriterion(this.db.prepare(`SELECT * FROM criteria WHERE id = ?`).get(id) as CriterionRow);
  }

  // ---- answer cache ------------------------------------------------------

  /** Load every cached answer for the given criterion hashes, keyed by note id then hash. */
  loadAnswers(hashes: readonly string[]): Map<string, Map<string, Answer>> {
    const out = new Map<string, Map<string, Answer>>();
    if (hashes.length === 0) return out;
    const placeholders = hashes.map(() => "?").join(",");
    const rows = this.db
      .prepare(`SELECT note_id, criterion_hash, p, c, raw, latency_ms FROM answers WHERE criterion_hash IN (${placeholders})`)
      .all(...hashes) as { note_id: string; criterion_hash: string; p: number; c: number; raw: string; latency_ms: number }[];
    for (const r of rows) {
      let m = out.get(r.note_id);
      if (!m) {
        m = new Map();
        out.set(r.note_id, m);
      }
      m.set(r.criterion_hash, {
        criterionHash: r.criterion_hash,
        p: r.p,
        c: r.c,
        raw: JSON.parse(r.raw) as RawAnswer,
        latencyMs: r.latency_ms,
        cached: true,
      });
    }
    return out;
  }

  putAnswers(
    rows: readonly { noteId: string; answer: Answer; model: string; runId: string }[],
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO answers (note_id, criterion_hash, p, c, raw, latency_ms, model, run_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(note_id, criterion_hash) DO UPDATE SET p = excluded.p, c = excluded.c, raw = excluded.raw,
         latency_ms = excluded.latency_ms, model = excluded.model, run_id = excluded.run_id, created_at = excluded.created_at`,
    );
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      for (const r of rows) {
        stmt.run(r.noteId, r.answer.criterionHash, r.answer.p, r.answer.c, JSON.stringify(r.answer.raw), r.answer.latencyMs, r.model, r.runId, now);
      }
    });
    tx();
  }

  clearAnswers(): void {
    this.db.prepare(`DELETE FROM answers`).run();
  }

  /** Drop every run and its decision log. Used by the full reset. */
  clearRuns(): void {
    const tx = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM decisions`).run();
      this.db.prepare(`DELETE FROM runs`).run();
    });
    tx();
  }

  // ---- runs & decisions --------------------------------------------------

  createRun(stats: RunStats, protocol: Protocol): void {
    this.db
      .prepare(`INSERT INTO runs (id, started_at, finished_at, stats, protocol_snapshot, snapshot) VALUES (?, ?, NULL, ?, ?, NULL)`)
      .run(stats.runId, stats.startedAt, JSON.stringify(stats), JSON.stringify(protocol));
  }

  finishRun(stats: RunStats, snapshot: Record<string, NoteStatusSnapshot>): void {
    this.db
      .prepare(`UPDATE runs SET finished_at = ?, stats = ?, snapshot = ? WHERE id = ?`)
      .run(stats.finishedAt, JSON.stringify(stats), JSON.stringify(snapshot), stats.runId);
  }

  updateRunStats(stats: RunStats): void {
    this.db.prepare(`UPDATE runs SET stats = ? WHERE id = ?`).run(JSON.stringify(stats), stats.runId);
  }

  getRun(runId: string): { stats: RunStats; protocol: Protocol; snapshot: Record<string, NoteStatusSnapshot> | null } | null {
    const r = this.db.prepare(`SELECT stats, protocol_snapshot, snapshot FROM runs WHERE id = ?`).get(runId) as
      | { stats: string; protocol_snapshot: string; snapshot: string | null }
      | undefined;
    if (!r) return null;
    return {
      stats: JSON.parse(r.stats) as RunStats,
      protocol: JSON.parse(r.protocol_snapshot) as Protocol,
      snapshot: r.snapshot ? (JSON.parse(r.snapshot) as Record<string, NoteStatusSnapshot>) : null,
    };
  }

  /** Most recent finished runs, newest first. */
  recentRuns(limit = 20): { stats: RunStats; snapshot: Record<string, NoteStatusSnapshot> | null }[] {
    const rows = this.db
      .prepare(`SELECT stats, snapshot FROM runs WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT ?`)
      .all(limit) as { stats: string; snapshot: string | null }[];
    return rows.map((r) => ({
      stats: JSON.parse(r.stats) as RunStats,
      snapshot: r.snapshot ? (JSON.parse(r.snapshot) as Record<string, NoteStatusSnapshot>) : null,
    }));
  }

  logDecisions(rows: readonly Omit<DecisionLogRow, "id" | "createdAt">[]): void {
    const stmt = this.db.prepare(
      `INSERT INTO decisions (run_id, note_id, criterion_id, criterion_hash, question, p, c, threshold, latency_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      for (const d of rows) stmt.run(d.runId, d.noteId, d.criterionId, d.criterionHash, d.question, d.p, d.c, d.threshold, d.latencyMs, now);
    });
    tx();
  }

  decisionsForRun(runId: string): DecisionLogRow[] {
    const rows = this.db.prepare(`SELECT * FROM decisions WHERE run_id = ? ORDER BY id`).all(runId) as {
      id: number; run_id: string; note_id: string; criterion_id: string; criterion_hash: string; question: string;
      p: number; c: number; threshold: number; latency_ms: number; created_at: string;
    }[];
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      noteId: r.note_id,
      criterionId: r.criterion_id,
      criterionHash: r.criterion_hash,
      question: r.question,
      p: r.p,
      c: r.c,
      threshold: r.threshold,
      latencyMs: r.latency_ms,
      createdAt: r.created_at,
    }));
  }
}

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 0xffff;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(3, "0")}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Pull age and sex out of the note text itself (not from truth), so they can
 * ride along in Jev's state when the note states them. Conservative patterns.
 */
export function parseDemographics(text: string): { age: number | null; sex: "M" | "F" | null } {
  let age: number | null = null;
  let sex: "M" | "F" | null = null;
  const ageMatch =
    /\b(\d{1,3})\s*(?:-|\s)?(?:year|yr|y)[\s-]*(?:old|o\b|\/o)/i.exec(text) ??
    /\bage[d:\s]+(\d{1,3})\b/i.exec(text) ??
    /\b(\d{1,3})\s*(?:yo|y\/o|yom|yof)\b/i.exec(text) ??
    /(?:^|[\s:,(])(\d{2})\s?[MF](?=[\s.,;)]|$)/m.exec(text);
  if (ageMatch?.[1]) {
    const n = Number.parseInt(ageMatch[1], 10);
    if (n > 0 && n < 120) age = n;
  }
  const tagged = /\b(?:y\/o|yo|year-old|years old|F\/|M\/)\s*([MF])\b/.exec(text) ?? /(?:^|[\s:,(])\d{2}\s?([MF])(?=[\s.,;)]|$)/m.exec(text);
  if (tagged?.[1] === "F" || tagged?.[1] === "M") sex = tagged[1];
  else if (/\b(?:female|woman|yof)\b/i.test(text)) sex = "F";
  else if (/\b(?:male|man|yom)\b/i.test(text)) sex = "M";
  return { age, sex };
}
