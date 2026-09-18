// Two independent checks per note: a cheap deterministic one (labs/meds
// present in the text) and an LLM check for invented clinical facts. Both
// must pass for a note to be accepted.
import Anthropic from "@anthropic-ai/sdk";
import type { NoteTruth } from "../shared/types.js";
import { addUsage, type UsageTotals } from "./cost.js";
import { VERIFY_SCHEMA, VERIFY_SYSTEM, type VerifyItem, verifyUserMessage } from "./prompts.js";

export interface DeterministicResult {
  ok: boolean;
  missing: string[];
}

function medNameToken(name: string): string {
  const match = /^[A-Za-z][A-Za-z-]*/.exec(name);
  return match ? match[0] : name;
}

/** Every lab value and every med's leading drug-name token must appear verbatim in the note text. */
export function deterministicCheck(text: string, truth: NoteTruth): DeterministicResult {
  const missing: string[] = [];
  const lowerText = text.toLowerCase();
  for (const lab of truth.labs) {
    if (!text.includes(String(lab.value))) missing.push(`lab ${lab.name}=${lab.value}`);
  }
  for (const med of truth.meds) {
    const token = medNameToken(med.name).toLowerCase();
    if (!lowerText.includes(token)) missing.push(`med ${med.name}`);
  }
  return { ok: missing.length === 0, missing };
}

export interface LlmVerifyResult {
  id: string;
  hallucinated: boolean;
  details: string;
}

export async function llmVerifyBatch(client: Anthropic, model: string, items: VerifyItem[], usage: UsageTotals): Promise<Map<string, LlmVerifyResult>> {
  const results = new Map<string, LlmVerifyResult>();
  if (items.length === 0) return results;

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: VERIFY_SYSTEM,
    messages: [{ role: "user", content: verifyUserMessage(items) }],
    output_config: { format: { type: "json_schema", schema: VERIFY_SCHEMA } },
  });

  addUsage(usage, model, response.usage.input_tokens, response.usage.output_tokens);

  if (response.stop_reason === "refusal") {
    for (const item of items) results.set(item.id, { id: item.id, hallucinated: true, details: "verification call refused" });
    return results;
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as { results: LlmVerifyResult[] };
  for (const r of parsed.results ?? []) results.set(r.id, r);
  return results;
}
