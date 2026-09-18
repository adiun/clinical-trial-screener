// Minimal JSONL I/O for data/notes.jsonl: read existing ids (for --resume)
// and append records incrementally so a killed run loses at most one batch.
import fs, { type WriteStream } from "node:fs";
import readline from "node:readline";
import type { NoteRecord } from "../shared/types.js";

export async function readExistingIds(file: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!fs.existsSync(file)) return ids;
  const rl = readline.createInterface({ input: fs.createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as { id?: unknown };
      if (typeof obj.id === "string") ids.add(obj.id);
    } catch {
      // Ignore malformed lines; the writer below never produces them.
    }
  }
  return ids;
}

export function openJsonlWriter(file: string, resume: boolean): WriteStream {
  const dir = file.slice(0, Math.max(0, file.lastIndexOf("/")));
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return fs.createWriteStream(file, { flags: resume ? "a" : "w" });
}

export function writeRecord(stream: WriteStream, record: NoteRecord): void {
  stream.write(JSON.stringify(record) + "\n");
}

export function closeWriter(stream: WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.end((err: Error | null | undefined) => (err ? reject(err) : resolve()));
  });
}
