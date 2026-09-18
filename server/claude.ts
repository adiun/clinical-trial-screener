// Claude as compiler and summarizer. The API key lives in this module's
// memory for the process lifetime: never written to disk, never logged.
import Anthropic from "@anthropic-ai/sdk";
import type { CompiledProtocol, CriterionKind, Primitive } from "../shared/types.js";

export const CLAUDE_MODELS = ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"] as const;
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

let apiKey: string | null = null;
let model: string = DEFAULT_CLAUDE_MODEL;

export function setCredentials(key: string): void {
  apiKey = key.trim() || null;
}

export function clearCredentials(): void {
  apiKey = null;
}

export function isConfigured(): boolean {
  return apiKey !== null;
}

export function getModel(): string {
  return model;
}

export function setModel(m: string): void {
  if ((CLAUDE_MODELS as readonly string[]).includes(m)) model = m;
}

function client(): Anthropic {
  if (!apiKey) throw new ClaudeNotConfigured();
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export class ClaudeNotConfigured extends Error {
  constructor() {
    super("Claude credentials have not been provided.");
    this.name = "ClaudeNotConfigured";
  }
}

const COMPILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "criteria"],
  properties: {
    name: { type: "string", description: "Short trial name." },
    description: { type: "string", description: "One-sentence summary of the population." },
    criteria: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "kind", "primitive", "question", "weight", "trueDescription", "falseDescription", "levels", "metLevels"],
        properties: {
          name: { type: "string", description: "Short label, 2-6 words." },
          kind: { type: "string", enum: ["inclusion", "exclusion"] },
          primitive: { type: "string", enum: ["noul", "score"] },
          question: {
            type: "string",
            description:
              "The literal question asked of a clinical note about one patient. For noul: a yes/no question where yes means the condition holds. For score: a 'what is ...' question whose answer is one of the levels.",
          },
          trueDescription: { type: ["string", "null"], description: "Noul only: what a yes means. Null for score." },
          falseDescription: { type: ["string", "null"], description: "Noul only: what a no means. Null for score." },
          levels: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "Score only: 2-6 ordered level descriptions, each a concrete, self-contained situation. Level 0 should be 'not documented' when absence is possible. Null for noul.",
          },
          metLevels: {
            type: ["array", "null"],
            items: { type: "integer" },
            description: "Score only: indices of levels that count as the criterion being met. Null for noul.",
          },
          weight: { type: "number", minimum: 0, maximum: 1, description: "Relative importance, 0-1." },
        },
      },
    },
  },
} as const;

const COMPILE_SYSTEM = `You compile plain-English clinical trial descriptions into typed eligibility criteria for a System One decision model (TypeSafe Jev). Jev reads one clinical note at a time and answers each criterion independently. It reads questions literally, is weak at arithmetic and date comparison, and does best with narrow, concrete conditions.

Rules:
- One criterion per independent condition. Split compound criteria.
- Use "noul" for yes/no conditions. Phrase the question so that YES means the condition holds. Give trueDescription/falseDescription that name boundary cases (synonyms, drug class members, what counts as current).
- Use "score" only for graded quantities (lab tiers, staging, severity). Levels are ordered, concrete, and self-contained; include a "not documented" level when absence is possible. Set metLevels to the indices that satisfy the criterion.
- kind "exclusion" means the criterion holding makes the patient ineligible; phrase the question about the condition itself, not its negation.
- Never put arithmetic in the model's hands: turn numeric ranges into level descriptions or spell out the bounds in the question.
- Questions should reference the note as \`note\`, and may reference \`patient.age\` / \`patient.sex\` when the note supplies them.
- Weight 1 for defining criteria, lower for softer ones.`;

export async function compileProtocol(description: string): Promise<{ compiled: CompiledProtocol; raw: string }> {
  const c = client();
  const response = await c.messages.create({
    model,
    max_tokens: 16000,
    system: COMPILE_SYSTEM,
    messages: [{ role: "user", content: `Trial description:\n\n${description}` }],
    output_config: { format: { type: "json_schema", schema: COMPILE_SCHEMA } },
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to compile this description.");
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as CompiledProtocol;
  return { compiled: sanitizeCompiled(parsed), raw: JSON.stringify(parsed, null, 2) };
}

function sanitizeCompiled(input: CompiledProtocol): CompiledProtocol {
  const kinds: CriterionKind[] = ["inclusion", "exclusion"];
  const prims: Primitive[] = ["noul", "score"];
  return {
    name: String(input.name ?? "Compiled protocol").slice(0, 120),
    description: String(input.description ?? "").slice(0, 600),
    criteria: (input.criteria ?? []).slice(0, 20).map((c) => {
      const primitive: Primitive = prims.includes(c.primitive) ? c.primitive : "noul";
      const levels = primitive === "score" && Array.isArray(c.levels) && c.levels.length >= 2 ? c.levels.map(String).slice(0, 6) : null;
      const metLevels =
        levels && Array.isArray(c.metLevels)
          ? c.metLevels.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < levels.length)
          : null;
      return {
        name: String(c.name ?? "Criterion").slice(0, 80),
        kind: kinds.includes(c.kind) ? c.kind : "inclusion",
        primitive,
        question: String(c.question ?? "").slice(0, 600),
        trueDescription: primitive === "noul" && c.trueDescription ? String(c.trueDescription).slice(0, 400) : null,
        falseDescription: primitive === "noul" && c.falseDescription ? String(c.falseDescription).slice(0, 400) : null,
        levels,
        metLevels: metLevels && metLevels.length > 0 ? metLevels : levels ? [levels.length - 1] : null,
        weight: Number.isFinite(c.weight) ? Math.min(1, Math.max(0, Number(c.weight))) : 1,
      };
    }),
  };
}

export interface RunAggregates {
  noteCount: number;
  eligible: number;
  ineligible: number;
  review: number;
  elapsedMs: number | null;
  p50: number | null;
  p99: number | null;
  flipped: number;
  flippedByCriterion: { name: string; count: number }[];
  mostUncertainCriterion: { name: string; uncertainCount: number } | null;
  threshold: number;
  trigger: string;
}

/** Writes a 2-3 sentence summary from aggregates only. Note text never reaches this call. */
export async function summarizeRun(agg: RunAggregates): Promise<string> {
  const c = client();
  const response = await c.messages.create({
    model,
    max_tokens: 1024,
    system:
      "You write a two to three sentence plain-language summary of a clinical trial pre-screening run for a research coordinator. You receive only aggregate counts, never patient data. Be specific with the numbers given, name the criterion driving uncertainty or flips when present, and do not speculate beyond the aggregates. No headings, no bullet points.",
    messages: [{ role: "user", content: JSON.stringify(agg) }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to summarize this run.");
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
