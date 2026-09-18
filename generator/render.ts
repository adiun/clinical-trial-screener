// Stage 2: turn each patient's truth into note text via Claude. Batches of
// BATCH_SIZE patients per request, a worker pool of CONCURRENCY batches in
// flight, up to MAX_REGENERATE_RETRIES regenerations for a note that fails
// verification, incremental writes so the run is resumable.
import Anthropic from "@anthropic-ai/sdk";
import type { NoteRecord } from "../shared/types.js";
import { addUsage, type UsageTotals } from "./cost.js";
import type { WriteStream } from "node:fs";
import { RENDER_SCHEMA, renderUserMessage, RENDER_SYSTEM, stripHardCases, toRenderSpec } from "./prompts.js";
import type { GeneratedPatient } from "./truth.js";
import { deterministicCheck, llmVerifyBatch } from "./verify.js";
import { writeRecord } from "./jsonl.js";

export const BATCH_SIZE = 5;
export const CONCURRENCY = 5;
export const MAX_REGENERATE_RETRIES = 2;
/** Note rendering is high-volume, low-complexity prose — medium effort holds quality at lower cost. Haiku models reject `effort`, so it's only sent for effort-capable models. */
export const RENDER_EFFORT = "medium" as const;

export interface RenderContext {
  client: Anthropic;
  model: string;
  verifyModel: string;
  renderUsage: UsageTotals;
  verifyUsage: UsageTotals;
  out: WriteStream;
  onProgress: (ok: boolean) => void;
  onFailure: (id: string, reason: string) => void;
}

function supportsEffort(model: string): boolean {
  return !model.includes("haiku");
}

async function callRender(ctx: RenderContext, patients: GeneratedPatient[]): Promise<Map<string, string>> {
  const specs = patients.map(toRenderSpec);
  const response = await ctx.client.messages.create({
    model: ctx.model,
    max_tokens: 8000,
    system: RENDER_SYSTEM,
    messages: [{ role: "user", content: renderUserMessage(specs) }],
    output_config: {
      format: { type: "json_schema", schema: RENDER_SCHEMA },
      ...(supportsEffort(ctx.model) ? { effort: RENDER_EFFORT } : {}),
    },
  });
  addUsage(ctx.renderUsage, ctx.model, response.usage.input_tokens, response.usage.output_tokens);
  if (response.stop_reason === "refusal") throw new Error("render call refused");
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as { notes: { id: string; text: string }[] };
  const map = new Map<string, string>();
  for (const n of parsed.notes ?? []) map.set(n.id, n.text);
  return map;
}

interface VerifyOutcome {
  passed: GeneratedPatient[];
  failed: { patient: GeneratedPatient; reason: string }[];
}

async function verifyPatients(ctx: RenderContext, patients: GeneratedPatient[], texts: Map<string, string>): Promise<VerifyOutcome> {
  const passed: GeneratedPatient[] = [];
  const failed: VerifyOutcome["failed"] = [];
  const detOk: { patient: GeneratedPatient; text: string }[] = [];

  for (const patient of patients) {
    const text = texts.get(patient.id);
    if (!text) {
      failed.push({ patient, reason: "missing from render response" });
      continue;
    }
    const det = deterministicCheck(text, patient.truth);
    if (!det.ok) {
      failed.push({ patient, reason: `missing facts in text: ${det.missing.join(", ")}` });
      continue;
    }
    detOk.push({ patient, text });
  }

  if (detOk.length > 0) {
    const items = detOk.map(({ patient, text }) => ({ id: patient.id, facts: stripHardCases(patient.truth), text }));
    const llmResults = await llmVerifyBatch(ctx.client, ctx.verifyModel, items, ctx.verifyUsage);
    for (const { patient } of detOk) {
      const result = llmResults.get(patient.id);
      if (result?.hallucinated) failed.push({ patient, reason: `hallucination: ${result.details}` });
      else passed.push(patient);
    }
  }

  return { passed, failed };
}

function emit(ctx: RenderContext, patient: GeneratedPatient, text: string, ok: boolean): void {
  const record: NoteRecord = { id: patient.id, text, format: patient.format, truth: patient.truth };
  writeRecord(ctx.out, record);
  ctx.onProgress(ok);
}

async function processBatch(ctx: RenderContext, initialBatch: GeneratedPatient[]): Promise<void> {
  let pending = initialBatch;
  let attempt = 0;

  while (pending.length > 0) {
    let texts: Map<string, string>;
    try {
      texts = await callRender(ctx, pending);
    } catch (err) {
      attempt++;
      if (attempt > MAX_REGENERATE_RETRIES) {
        for (const patient of pending) ctx.onFailure(patient.id, `render failed after retries: ${String(err instanceof Error ? err.message : err)}`);
        return;
      }
      continue;
    }

    const { passed, failed } = await verifyPatients(ctx, pending, texts);
    for (const patient of passed) emit(ctx, patient, texts.get(patient.id) as string, true);

    if (failed.length === 0) return;

    attempt++;
    if (attempt > MAX_REGENERATE_RETRIES) {
      for (const { patient, reason } of failed) {
        ctx.onFailure(patient.id, reason);
        const text = texts.get(patient.id);
        if (text) emit(ctx, patient, text, false);
      }
      return;
    }
    pending = failed.map((f) => f.patient);
  }
}

export async function renderAll(ctx: RenderContext, patients: GeneratedPatient[]): Promise<void> {
  const batches: GeneratedPatient[][] = [];
  for (let i = 0; i < patients.length; i += BATCH_SIZE) batches.push(patients.slice(i, i + BATCH_SIZE));

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < batches.length) {
      const idx = cursor++;
      const batch = batches[idx];
      if (!batch) continue;
      await processBatch(ctx, batch);
    }
  }

  const workerCount = Math.min(CONCURRENCY, batches.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
