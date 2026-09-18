// Minimal .env loader (no dependency). Values already present in the
// environment win. Never logs values.
import fs from "node:fs";
import path from "node:path";

export function loadDotEnv(file = path.resolve(process.cwd(), ".env")): void {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export interface Config {
  port: number;
  dbPath: string;
  notesPath: string;
  mockJev: boolean;
  jevConcurrency: number;
  jevModel: string;
  /** Per-request timeout for the live client. A hung request costs at most this long. */
  jevTimeoutMs: number;
  typesafeApiKey: string | undefined;
  anthropicApiKey: string | undefined;
  /** Mock only: probability that a call fails with a simulated 429. */
  mockRateLimitRate: number;
}

export function readConfig(): Config {
  const mockJev = /^(1|true|yes)$/i.test(process.env.MOCK_JEV ?? "");
  // Live default is 50, sized against TypeSafe's published rate limits. The
  // mock has no rate limit and 70-500ms of jitter per call, so its default pool
  // is sized to land a 500-note sweep near the one-second mark the demo is about.
  const concurrency = Number.parseInt(process.env.JEV_CONCURRENCY ?? (mockJev ? "160" : "50"), 10);
  const timeout = Number.parseInt(process.env.JEV_TIMEOUT_MS ?? "15000", 10);
  return {
    port: Number.parseInt(process.env.PORT ?? "8787", 10),
    dbPath: process.env.DB_PATH ?? path.resolve(process.cwd(), "data/screener.db"),
    notesPath: process.env.NOTES_PATH ?? path.resolve(process.cwd(), "data/notes.jsonl"),
    mockJev,
    jevConcurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 50,
    jevModel: process.env.JEV_MODEL?.trim() || "jev-latest",
    jevTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 15_000,
    typesafeApiKey: process.env.TYPESAFE_API_KEY?.trim() || undefined,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    mockRateLimitRate: clamp01(Number.parseFloat(process.env.MOCK_JEV_429_RATE ?? "0")),
  };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
