// `npm run import` — loads data/notes.jsonl into SQLite, replacing any notes
// already there. Cached answers are kept; they are keyed by note id and
// criterion hash, so re-importing the same notes keeps the cache warm.
import fs from "node:fs";
import readline from "node:readline";
import { loadDotEnv, readConfig } from "./env.js";
import { Store } from "./db.js";
import type { NoteRecord } from "../shared/types.js";
import { DEFAULT_CRITERIA, DEFAULT_PROTOCOL } from "./protocol.js";

export async function readNotesJsonl(file: string): Promise<{ records: NoteRecord[]; skipped: number }> {
  const records: NoteRecord[] = [];
  let skipped = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file, "utf8"), crlfDelay: Infinity });
  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Partial<NoteRecord>;
      if (typeof obj.id !== "string" || typeof obj.text !== "string" || !obj.truth || typeof obj.truth !== "object") {
        skipped++;
        continue;
      }
      records.push({
        id: obj.id,
        text: obj.text,
        format: typeof obj.format === "string" ? obj.format : "unknown",
        truth: {
          age: Number(obj.truth.age ?? 0),
          sex: obj.truth.sex === "F" ? "F" : "M",
          diagnoses: Array.isArray(obj.truth.diagnoses) ? obj.truth.diagnoses : [],
          meds: Array.isArray(obj.truth.meds) ? obj.truth.meds : [],
          labs: Array.isArray(obj.truth.labs) ? obj.truth.labs : [],
          procedures: Array.isArray(obj.truth.procedures) ? obj.truth.procedures : [],
          familyHistory: Array.isArray(obj.truth.familyHistory) ? obj.truth.familyHistory : [],
        },
      });
    } catch {
      skipped++;
      process.stderr.write(`line ${lineNo}: not valid JSON, skipped\n`);
    }
  }
  return { records, skipped };
}

export function ensureDefaultProtocol(store: Store): void {
  if (!store.getProtocol(DEFAULT_PROTOCOL.id)) {
    store.upsertProtocol(DEFAULT_PROTOCOL);
    store.replaceCriteria(DEFAULT_PROTOCOL.id, DEFAULT_CRITERIA);
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = readConfig();
  if (!fs.existsSync(config.notesPath)) {
    process.stderr.write(`No notes file at ${config.notesPath}.\nExpected one JSON object per line with { id, text, format, truth }.\n`);
    process.exit(1);
  }
  const store = new Store(config.dbPath);
  ensureDefaultProtocol(store);
  const { records, skipped } = await readNotesJsonl(config.notesPath);
  const n = store.replaceNotes(records);
  store.close();
  process.stdout.write(`Imported ${n} notes into ${config.dbPath}${skipped ? ` (${skipped} lines skipped)` : ""}.\n`);
  process.stdout.write(`Synthetic data only. Never load real patient data into this tool.\n`);
}

const invokedDirectly = process.argv[1]?.endsWith("import.ts") || process.argv[1]?.endsWith("import.js");
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(String(err instanceof Error ? err.stack ?? err.message : err) + "\n");
    process.exit(1);
  });
}
