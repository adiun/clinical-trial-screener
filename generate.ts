// `npx tsx generate.ts --count 500 --seed 42 --out data/notes.jsonl`
//
// Synthetic clinical note generator for testing the eligibility screener.
// Two stages: truth sampling is deterministic, pure code (generator/truth.ts,
// no LLM, no I/O); rendering turns each patient's truth into note prose via
// Claude (generator/render.ts), verified against the same truth before being
// written. See README.md for the full pipeline description.
//
// SYNTHETIC DATA ONLY. Never mix this output with real patient data.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { loadDotEnv } from "./server/env.js";
import type { NoteRecord } from "./shared/types.js";
import { emptyUsage, type UsageTotals } from "./generator/cost.js";
import { closeWriter, openJsonlWriter, readExistingIds } from "./generator/jsonl.js";
import { formatDuration, ProgressBar } from "./generator/progress.js";
import { renderAll } from "./generator/render.js";
import { generateTruths } from "./generator/truth.js";

const DEFAULT_MODEL = "claude-sonnet-5";
const VERIFY_MODEL = "claude-haiku-4-5";

interface CliArgs {
  count: number;
  seed: number;
  out: string;
  model: string;
  resume: boolean;
  preview: number | null;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { count: 500, seed: 42, out: "data/notes.jsonl", model: DEFAULT_MODEL, resume: false, preview: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case "--count":
        args.count = Number(next());
        break;
      case "--seed":
        args.seed = Number(next());
        break;
      case "--out":
        args.out = next();
        break;
      case "--model":
        args.model = next();
        break;
      case "--resume":
        args.resume = true;
        break;
      case "--preview":
        args.preview = Number(next());
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(args.count) || args.count <= 0) throw new Error("--count must be a positive number");
  if (!Number.isFinite(args.seed)) throw new Error("--seed must be a number");
  if (args.preview !== null && (!Number.isFinite(args.preview) || args.preview <= 0)) throw new Error("--preview must be a positive number");
  return args;
}

const HELP = `Usage: npx tsx generate.ts [options]

  --count <n>     Number of synthetic notes to generate (default 500)
  --seed <n>      RNG seed; same seed + count => identical truth (default 42)
  --out <path>    Output JSONL path (default data/notes.jsonl)
  --model <id>    Claude model for note rendering (default ${DEFAULT_MODEL})
  --resume        Skip ids already present in --out and append to it
  --preview <n>   Render n sample notes and print them with their truth; does not write --out
  --help          Show this message

SYNTHETIC DATA ONLY. This tool never uses real patient data and its output
must never be mixed with real patient data.
`;

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

function printSummary(renderUsage: UsageTotals, verifyUsage: UsageTotals, written: number, failed: number, elapsedMs: number): void {
  const total = renderUsage.costUsd + verifyUsage.costUsd;
  process.stderr.write(
    [
      "",
      `Wrote ${written} notes${failed ? ` (${failed} logged failures — see warnings above)` : ""} in ${formatDuration(elapsedMs / 1000)}.`,
      `Render:  ${renderUsage.inputTokens.toLocaleString()} in / ${renderUsage.outputTokens.toLocaleString()} out tokens, ${formatUsd(renderUsage.costUsd)}`,
      `Verify:  ${verifyUsage.inputTokens.toLocaleString()} in / ${verifyUsage.outputTokens.toLocaleString()} out tokens, ${formatUsd(verifyUsage.costUsd)}`,
      `Total estimated cost: ${formatUsd(total)}`,
      "",
    ].join("\n"),
  );
}

function truthSummaryLine(record: NoteRecord): string {
  const t = record.truth;
  const dx = t.diagnoses.map((d) => d.name + (d.active ? "" : " (inactive)")).join("; ") || "none";
  const meds = t.meds.map((m) => m.name + (m.stop ? ` (stopped ${m.stop})` : "")).join("; ") || "none";
  const labs = t.labs.map((l) => `${l.name} ${l.value}${l.unit}`).join("; ") || "none";
  const hard = (t.hardCases ?? []).map((h) => h.type).join(", ") || "none";
  return [`age ${t.age} ${t.sex}`, `dx: ${dx}`, `meds: ${meds}`, `labs: ${labs}`, `family: ${t.familyHistory.join("; ") || "none"}`, `hard cases: ${hard}`].join("\n  ");
}

function printPreview(records: NoteRecord[]): void {
  for (const record of records) {
    process.stdout.write(`\n==== ${record.id} (${record.format}) ====\n  ${truthSummaryLine(record)}\n----\n${record.text}\n`);
  }
}

async function runPreview(args: CliArgs, client: Anthropic): Promise<void> {
  const count = args.preview as number;
  const patients = generateTruths(count, args.seed);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-preview-"));
  const tmpFile = path.join(tmpDir, "preview.jsonl");
  const renderUsage = emptyUsage();
  const verifyUsage = emptyUsage();
  const bar = new ProgressBar(patients.length);
  const failures: { id: string; reason: string }[] = [];
  const out = openJsonlWriter(tmpFile, false);

  await renderAll(
    {
      client,
      model: args.model,
      verifyModel: VERIFY_MODEL,
      renderUsage,
      verifyUsage,
      out,
      onProgress: (ok) => bar.increment(ok),
      onFailure: (id, reason) => failures.push({ id, reason }),
    },
    patients,
  );
  await closeWriter(out);
  bar.finish();

  const lines = fs
    .readFileSync(tmpFile, "utf8")
    .split("\n")
    .filter((l) => l.trim());
  const records = lines.map((l) => JSON.parse(l) as NoteRecord).sort((a, b) => a.id.localeCompare(b.id));
  printPreview(records);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  for (const f of failures) process.stderr.write(`FAILED ${f.id}: ${f.reason}\n`);
  printSummary(renderUsage, verifyUsage, records.length, failures.length, 0);
}

async function runFull(args: CliArgs, client: Anthropic): Promise<void> {
  const startedAt = Date.now();
  const allPatients = generateTruths(args.count, args.seed);

  const existingIds = args.resume ? await readExistingIds(args.out) : new Set<string>();
  const patients = allPatients.filter((p) => !existingIds.has(p.id));
  if (args.resume && existingIds.size > 0) {
    process.stderr.write(`Resuming: ${existingIds.size} notes already in ${args.out}, ${patients.length} remaining.\n`);
  }

  const renderUsage = emptyUsage();
  const verifyUsage = emptyUsage();
  const bar = new ProgressBar(patients.length);
  const failures: { id: string; reason: string }[] = [];
  let writtenThisRun = 0;
  const out = openJsonlWriter(args.out, args.resume);

  await renderAll(
    {
      client,
      model: args.model,
      verifyModel: VERIFY_MODEL,
      renderUsage,
      verifyUsage,
      out,
      onProgress: (ok) => {
        writtenThisRun++;
        bar.increment(ok);
      },
      onFailure: (id, reason) => failures.push({ id, reason }),
    },
    patients,
  );
  await closeWriter(out);
  bar.finish();

  for (const f of failures) process.stderr.write(`FAILED ${f.id}: ${f.reason} (run with --resume to retry)\n`);
  printSummary(renderUsage, verifyUsage, writtenThisRun + existingIds.size, failures.length, Date.now() - startedAt);
  process.stderr.write("Synthetic data only. Never mix this output with real patient data.\n");
}

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${String(err instanceof Error ? err.message : err)}\n\n${HELP}`);
    process.exit(1);
  }
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  loadDotEnv();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    process.stderr.write("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey, maxRetries: 5 });

  if (args.preview !== null) {
    await runPreview(args, client);
  } else {
    await runFull(args, client);
  }
}

const invokedDirectly = process.argv[1]?.endsWith("generate.ts") || process.argv[1]?.endsWith("generate.js");
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`${String(err instanceof Error ? (err.stack ?? err.message) : err)}\n`);
    process.exit(1);
  });
}
