// Prompt construction for the rendering (stage 2) and verification passes.
// Kept separate from render.ts/verify.ts so the wording can be tuned without
// touching the batching/retry mechanics.
import type { HardCase, NoteTruth } from "../shared/types.js";
import type { GeneratedPatient } from "./truth.js";

export const RENDER_SYSTEM = `You write realistic, synthetic clinical notes for testing a clinical-trial eligibility screener. Every note is entirely synthetic — no real patient data exists anywhere in this system.

For each patient you are given a JSON "facts" object (age, sex, diagnoses, medications, labs, procedures, family history) and the note format to use. Rules:

1. Include every fact in "facts" somewhere in the note, in terms a clinician would actually write (e.g. spell out lab values with units, medication names with doses, diagnosis names or their everyday equivalent).
2. Invent no clinical facts that are not in "facts": no new diagnoses, medications, labs, procedures, or family history beyond what's given. You may add non-clinical filler (social history boilerplate, review-of-systems boilerplate, a chief complaint, disposition/plan language) as long as it introduces no new diagnosis, medication, or lab.
3. Each patient carries a short list of "instructions" — specific things to phrase naturally in the note (a negation, a discontinued medication with its reason, a historical/resolved finding, a family-history fact, a stale or trended lab value). Weave each one in naturally; do not quote the instruction verbatim or label it.
4. Vary voice, sentence length, and abbreviation density across patients in the same batch — some notes should be clipped and abbreviation-heavy, others more narrative.
5. Write in the assigned format:
   - "soap": Subjective / Objective / Assessment / Plan sections.
   - "discharge_summary": hospital discharge summary style (admission reason, hospital course, discharge diagnoses, discharge medications, follow-up).
   - "terse": a short, clipped outpatient clinic note, heavy on abbreviations, minimal prose.
   - "dictated": first-person dictated prose, as if transcribed from a clinician's voice memo, with natural filler phrases ("um", "let's see") kept minimal but the sentence structure conversational rather than templated.

Return only the note text for each patient via the provided schema. Do not include the "facts" JSON or the instructions in your output.`;

function hardCaseInstruction(hc: HardCase): string {
  switch (hc.type) {
    case "discontinued_med":
      return `Mention that ${hc.detail}.`;
    case "historical_finding":
      return `Present this as a resolved or historical finding, not a current active problem: ${hc.detail}.`;
    case "family_confounder":
      return `Include this family-history fact so it clearly reads as about a relative, never the patient: ${hc.detail}.`;
    case "stale_lab":
      return `Reference this lab value while making its age apparent (e.g. state or imply when it was drawn): ${hc.detail}.`;
    case "duplicate_lab":
      return `Mention both lab values, e.g. as a trend over time: ${hc.detail}.`;
    case "negation":
      return `Include an explicit negation using language like: "${hc.detail}".`;
  }
}

export interface RenderSpec {
  id: string;
  format: string;
  facts: Omit<NoteTruth, "hardCases">;
  instructions: string[];
}

export function stripHardCases(truth: NoteTruth): Omit<NoteTruth, "hardCases"> {
  const { hardCases: _hardCases, ...facts } = truth;
  return facts;
}

export function toRenderSpec(patient: GeneratedPatient): RenderSpec {
  return {
    id: patient.id,
    format: patient.format,
    facts: stripHardCases(patient.truth),
    instructions: (patient.truth.hardCases ?? []).map(hardCaseInstruction),
  };
}

export const RENDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["notes"],
  properties: {
    notes: {
      type: "array",
      description: "Exactly one entry per patient given in the input, same count and ids.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: {
          id: { type: "string", description: "Must exactly match the patient id given in the input." },
          text: { type: "string", description: "The complete note text only." },
        },
      },
    },
  },
} as const;

export function renderUserMessage(specs: RenderSpec[]): string {
  return `Write one note per patient below. Return them via the schema, id-matched.\n\n${JSON.stringify(specs, null, 2)}`;
}

export const VERIFY_SYSTEM = `You audit synthetic clinical notes against their ground-truth facts for a clinical-trial eligibility screener test dataset. For each note, decide whether the note text introduces any diagnosis, medication, or lab that is NOT present in the given "facts" — inventing clinical information the note shouldn't contain. Family history, denied/negated symptoms, and filler (social history, ROS boilerplate) are fine and are not hallucinations. Only flag a genuinely new diagnosis, medication, or lab attributed to the patient that has no basis in "facts".`;

export const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "hallucinated", "details"],
        properties: {
          id: { type: "string" },
          hallucinated: { type: "boolean", description: "true if the note introduces a diagnosis, medication, or lab not in facts." },
          details: { type: "string", description: "One short sentence: what was invented, or empty string if none." },
        },
      },
    },
  },
} as const;

export interface VerifyItem {
  id: string;
  facts: Omit<NoteTruth, "hardCases">;
  text: string;
}

export function verifyUserMessage(items: VerifyItem[]): string {
  return `Audit each note below against its facts.\n\n${JSON.stringify(items, null, 2)}`;
}
