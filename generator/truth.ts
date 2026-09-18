// Deterministic truth sampling. Pure function of (seed, count) — no LLM, no
// I/O. This is stage 1 of the two-stage generator: it decides every clinical
// fact and which "hard cases" the rendering stage must weave in; stage 2
// (render.ts) only ever writes prose consistent with what's decided here.
import type { HardCase, NoteTruth, Sex } from "../shared/types.js";
import {
  COMORBIDITY_BOOST,
  DIAGNOSES,
  DISCONTINUATION_REASONS,
  type DiagnosisKey,
  FAMILY_CONFOUNDER_BY_CONDITION,
  FAMILY_HISTORY,
  FORMATS,
  MEDS,
  type MedKey,
  NEGATIONS_BY_CONDITION,
  NEGATIONS_GENERAL,
  type NoteFormat,
  PROCEDURES,
  RESOLUTION_NOTES,
} from "./data.js";
import { daysAgo, monthsAgo, monthsBefore, yearsAgo } from "./dates.js";
import { Rng } from "./rng.js";

export interface GeneratedPatient {
  id: string;
  format: NoteFormat;
  truth: NoteTruth;
}

type Diagnosis = NoteTruth["diagnoses"][number];
type Med = NoteTruth["meds"][number];
type Lab = NoteTruth["labs"][number];
type Procedure = NoteTruth["procedures"][number];
type Cohort = "t2dm_eligible" | "t2dm_ineligible" | "other";
type IneligibleReason = "age_out" | "a1c_low" | "a1c_high" | "not_on_metformin" | "renal_fail" | "t1dm_or_dka" | "pancreatitis_hx" | "mtc_family" | "recent_glp1_insulin";

const INELIGIBLE_REASONS: IneligibleReason[] = ["age_out", "a1c_low", "a1c_high", "not_on_metformin", "renal_fail", "t1dm_or_dka", "pancreatitis_hx", "mtc_family", "recent_glp1_insulin"];

const GENERAL_CANDIDATES: DiagnosisKey[] = ["htn", "hyperlipidemia", "obesity", "cad", "copd", "depression", "anxiety", "hypothyroid", "gerd", "oa", "afib"];
const BASE_PROB: Partial<Record<DiagnosisKey, number>> = {
  htn: 0.35,
  hyperlipidemia: 0.3,
  obesity: 0.3,
  cad: 0.12,
  copd: 0.1,
  depression: 0.15,
  anxiety: 0.15,
  hypothyroid: 0.12,
  gerd: 0.2,
  oa: 0.18,
  afib: 0.08,
};

function diag(key: DiagnosisKey, onset: string, active = true): Diagnosis {
  const spec = DIAGNOSES[key];
  return { code: spec.code, name: spec.name, onset, active };
}

function medRec(key: MedKey, rng: Rng, start: string, stop: string | null = null): Med {
  return { name: rng.pick(MEDS[key]), start, stop };
}

function labRec(name: string, value: number, unit: string, date: string): Lab {
  return { name, value, unit, date };
}

function procRec(name: string, date: string): Procedure {
  return { name, date };
}

function onsetYearsAgo(rng: Rng, age: number, desiredMax: number): string {
  const maxYears = Math.max(1, Math.min(desiredMax, age - 18));
  return yearsAgo(rng.int(1, maxYears));
}

function isProtectedMed(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("metformin") || lower.includes("insulin") || ["semaglutide", "dulaglutide", "liraglutide", "tirzepatide"].some((n) => lower.includes(n));
}

interface BuildState {
  cohort: Cohort;
  age: number;
  diagnoses: Diagnosis[];
  meds: Med[];
  labs: Lab[];
  procedures: Procedure[];
  selected: Set<DiagnosisKey>;
  labDate: string;
  hasStatin: boolean;
  hasSsri: boolean;
  hasBetaBlocker: boolean;
  /** Index into diagnoses[] that must not be flipped inactive by the historical_finding hard case (the defining diabetes diagnosis). -1 means no protection. */
  protectedIndex: number;
}

interface BuildStateExt extends BuildState {
  forceMtcFamily?: boolean;
}

function buildT2dmEligible(rng: Rng): BuildState {
  const age = rng.int(18, 75);
  const state: BuildState = { cohort: "t2dm_eligible", age, diagnoses: [], meds: [], labs: [], procedures: [], selected: new Set(), labDate: "", hasStatin: false, hasSsri: false, hasBetaBlocker: false, protectedIndex: 0 };
  const onset = onsetYearsAgo(rng, age, 12);
  state.diagnoses.push(diag("t2dm", onset));
  state.selected.add("t2dm");
  const visitDaysAgo = rng.int(0, 120);
  state.labDate = daysAgo(visitDaysAgo + rng.int(0, 7));
  state.labs.push(labRec("HbA1c", rng.range(7.0, 10.0, 1), "%", state.labDate));
  state.labs.push(labRec("eGFR", rng.range(45, 110, 0), "mL/min/1.73m2", state.labDate));
  state.labs.push(labRec("Creatinine", rng.range(0.7, 1.3, 2), "mg/dL", state.labDate));
  state.meds.push(medRec("metformin", rng, onset));
  return state;
}

function buildT2dmIneligible(rng: Rng): BuildStateExt {
  const reason = rng.pick(INELIGIBLE_REASONS);
  const age = reason === "age_out" ? rng.int(76, 90) : rng.int(18, 75);
  const state: BuildStateExt = { cohort: "t2dm_ineligible", age, diagnoses: [], meds: [], labs: [], procedures: [], selected: new Set(), labDate: "", hasStatin: false, hasSsri: false, hasBetaBlocker: false, protectedIndex: 0 };
  const onset = onsetYearsAgo(rng, age, 15);
  const visitDaysAgo = rng.int(0, 120);
  state.labDate = daysAgo(visitDaysAgo + rng.int(0, 7));

  if (reason === "t1dm_or_dka") {
    const isDka = rng.bool(0.4);
    state.diagnoses.push(diag(isDka ? "dka" : "t1dm", onset));
    state.selected.add(isDka ? "dka" : "t1dm");
    state.meds.push(medRec("insulin", rng, onset));
    state.labs.push(labRec("HbA1c", rng.range(7.0, 10.5, 1), "%", state.labDate));
    state.labs.push(labRec("eGFR", rng.range(60, 110, 0), "mL/min/1.73m2", state.labDate));
    state.labs.push(labRec("Creatinine", rng.range(0.7, 1.2, 2), "mg/dL", state.labDate));
    return state;
  }

  const isRenal = reason === "renal_fail";
  state.diagnoses.push(diag(isRenal ? "t2dm_ckd" : "t2dm", onset));
  state.selected.add(isRenal ? "t2dm_ckd" : "t2dm");

  const a1c = reason === "a1c_low" ? rng.range(5.5, 6.9, 1) : reason === "a1c_high" ? rng.range(10.1, 13.5, 1) : rng.range(7.0, 10.0, 1);
  state.labs.push(labRec("HbA1c", a1c, "%", state.labDate));

  if (isRenal) {
    const egfr = rng.range(15, 44, 0);
    state.diagnoses.push(diag(egfr < 30 ? "ckd4" : "ckd3b", onset));
    state.labs.push(labRec("eGFR", egfr, "mL/min/1.73m2", state.labDate));
    state.labs.push(labRec("Creatinine", rng.range(1.5, 3.0, 2), "mg/dL", state.labDate));
  } else {
    state.labs.push(labRec("eGFR", rng.range(45, 110, 0), "mL/min/1.73m2", state.labDate));
    state.labs.push(labRec("Creatinine", rng.range(0.7, 1.3, 2), "mg/dL", state.labDate));
  }

  if (reason === "not_on_metformin") {
    state.meds.push(medRec(rng.bool() ? "sulfonylurea" : "sglt2", rng, onset));
  } else {
    state.meds.push(medRec("metformin", rng, onset));
  }

  if (reason === "recent_glp1_insulin") {
    state.meds.push(medRec(rng.bool() ? "glp1" : "insulin", rng, daysAgo(rng.int(10, 60))));
  }

  if (reason === "pancreatitis_hx") {
    const pancreatitisOnset = onsetYearsAgo(rng, age, Math.min(6, age - 18 || 1));
    state.diagnoses.push(diag("pancreatitis", pancreatitisOnset, false));
  }

  if (reason === "mtc_family") {
    state.forceMtcFamily = true;
  }

  return state;
}

function buildOther(rng: Rng): BuildState {
  const age = rng.int(18, 90);
  const visitDaysAgo = rng.int(0, 120);
  const state: BuildState = { cohort: "other", age, diagnoses: [], meds: [], labs: [], procedures: [], selected: new Set(), labDate: daysAgo(visitDaysAgo + rng.int(0, 7)), hasStatin: false, hasSsri: false, hasBetaBlocker: false, protectedIndex: -1 };
  return state;
}

function rollComorbidities(rng: Rng, state: BuildState): DiagnosisKey[] {
  const chosen: DiagnosisKey[] = [];
  for (const key of GENERAL_CANDIDATES) {
    if (state.selected.has(key)) continue;
    let p = BASE_PROB[key] ?? 0.1;
    for (const s of state.selected) {
      const boost = COMORBIDITY_BOOST[s]?.[key];
      if (boost) p *= boost;
    }
    p = Math.min(p, 0.9);
    if (rng.bool(p)) {
      chosen.push(key);
      state.selected.add(key);
    }
  }
  return chosen;
}

function attachComorbidity(key: DiagnosisKey, rng: Rng, state: BuildState): void {
  const onset = onsetYearsAgo(rng, state.age, 10);
  switch (key) {
    case "htn":
      state.diagnoses.push(diag("htn", onset));
      state.meds.push(medRec(rng.pick(["acei_arb", "ccb", "thiazide"] as const), rng, onset));
      break;
    case "hyperlipidemia":
      state.diagnoses.push(diag("hyperlipidemia", onset));
      if (!state.hasStatin) {
        state.meds.push(medRec("statin", rng, onset));
        state.hasStatin = true;
      }
      state.labs.push(labRec("LDL", rng.range(100, 190, 0), "mg/dL", state.labDate));
      break;
    case "obesity":
      state.diagnoses.push(diag("obesity", onset));
      break;
    case "cad":
      state.diagnoses.push(diag("cad", onset));
      state.meds.push(medRec("aspirin", rng, onset));
      if (!state.hasBetaBlocker) {
        state.meds.push(medRec("betablocker", rng, onset));
        state.hasBetaBlocker = true;
      }
      if (!state.hasStatin) {
        state.meds.push(medRec("statin", rng, onset));
        state.hasStatin = true;
      }
      if (rng.bool(0.3)) state.procedures.push(procRec(rng.pick(PROCEDURES.cad ?? []), monthsAgo(rng.int(2, 30))));
      break;
    case "copd":
      state.diagnoses.push(diag("copd", onset));
      state.meds.push(medRec("inhaler", rng, onset));
      if (rng.bool(0.25)) state.procedures.push(procRec((PROCEDURES.copd ?? [])[0] ?? "spirometry", monthsAgo(rng.int(1, 24))));
      break;
    case "depression":
      state.diagnoses.push(diag("depression", onset));
      if (!state.hasSsri) {
        state.meds.push(medRec("ssri", rng, onset));
        state.hasSsri = true;
      }
      break;
    case "anxiety":
      state.diagnoses.push(diag("anxiety", onset));
      if (!state.hasSsri) {
        state.meds.push(medRec("ssri", rng, onset));
        state.hasSsri = true;
      }
      break;
    case "hypothyroid":
      state.diagnoses.push(diag("hypothyroid", onset));
      state.meds.push(medRec("levothyroxine", rng, onset));
      break;
    case "gerd":
      state.diagnoses.push(diag("gerd", onset));
      state.meds.push(medRec("ppi", rng, onset));
      break;
    case "oa":
      state.diagnoses.push(diag("oa", onset));
      if (rng.bool(0.5)) state.meds.push(medRec("nsaid", rng, onset));
      if (rng.bool(0.2)) state.procedures.push(procRec((PROCEDURES.oa ?? [])[0] ?? "knee arthroscopy", monthsAgo(rng.int(1, 36))));
      break;
    case "afib":
      state.diagnoses.push(diag("afib", onset));
      state.meds.push(medRec("doac", rng, onset));
      if (!state.hasBetaBlocker) {
        state.meds.push(medRec("betablocker", rng, onset));
        state.hasBetaBlocker = true;
      }
      if (rng.bool(0.2)) state.procedures.push(procRec((PROCEDURES.afib ?? [])[0] ?? "cardioversion", monthsAgo(rng.int(1, 24))));
      break;
    default:
      break;
  }
}

function finalizeVitals(rng: Rng, state: BuildState): void {
  const hasHtn = state.selected.has("htn");
  const hasObesity = state.selected.has("obesity");
  const bmi = hasObesity ? rng.range(30, 45, 1) : rng.range(19, 29, 1);
  state.labs.push(labRec("BMI", bmi, "kg/m2", state.labDate));
  const sbp = hasHtn ? rng.range(132, 162, 0) : rng.range(108, 128, 0);
  const dbp = hasHtn ? rng.range(82, 98, 0) : rng.range(66, 82, 0);
  state.labs.push(labRec("SBP", sbp, "mmHg", state.labDate));
  state.labs.push(labRec("DBP", dbp, "mmHg", state.labDate));

  if (state.cohort === "other") {
    if (rng.bool(0.25)) {
      state.labs.push(labRec("eGFR", rng.range(60, 110, 0), "mL/min/1.73m2", state.labDate));
      state.labs.push(labRec("Creatinine", rng.range(0.6, 1.2, 2), "mg/dL", state.labDate));
    }
    if (rng.bool(0.15)) {
      state.labs.push(labRec("HbA1c", rng.range(5.2, 6.4, 1), "%", state.labDate));
    }
  }
}

function buildFamilyHistory(rng: Rng, selected: Set<DiagnosisKey>, forceConfounder: boolean, forceMtc: boolean): string[] {
  const entries: string[] = [];
  const pool = FAMILY_HISTORY.filter((f) => f !== "father with medullary thyroid carcinoma");
  const n = rng.int(0, 2);
  entries.push(...rng.sample(pool, n));
  if (forceConfounder) {
    for (const key of selected) {
      const phrase = FAMILY_CONFOUNDER_BY_CONDITION[key];
      if (phrase && !entries.includes(phrase)) {
        entries.push(phrase);
        break;
      }
    }
  }
  if (forceMtc && !entries.includes("father with medullary thyroid carcinoma")) {
    entries.push("father with medullary thyroid carcinoma");
  }
  return entries;
}

function tryDiscontinueMed(rng: Rng, meds: Med[]): HardCase | null {
  const candidates = meds.filter((m) => m.stop === null && !isProtectedMed(m.name));
  if (candidates.length === 0) return null;
  const target = rng.pick(candidates);
  target.stop = daysAgo(rng.int(30, 500));
  const reason = rng.pick(DISCONTINUATION_REASONS);
  return { type: "discontinued_med", detail: `${target.name} discontinued ${target.stop} due to ${reason}` };
}

function tryHistoricalFinding(rng: Rng, diagnoses: Diagnosis[], protectedIndex: number): HardCase | null {
  const candidates = diagnoses.filter((d, idx) => idx !== protectedIndex && d.active);
  if (candidates.length === 0) return null;
  const target = rng.pick(candidates);
  target.active = false;
  const note = rng.pick(RESOLUTION_NOTES);
  return { type: "historical_finding", detail: `${target.name} — ${note}` };
}

function tryStaleLab(rng: Rng, labs: Lab[]): HardCase | null {
  if (labs.length === 0) return null;
  const target = rng.pick(labs);
  target.date = monthsAgo(rng.int(13, 20));
  return { type: "stale_lab", detail: `${target.name} ${target.value}${target.unit} from ${target.date} is the most recent value on file` };
}

function tryDuplicateLab(rng: Rng, labs: Lab[]): HardCase | null {
  if (labs.length === 0) return null;
  const base = rng.pick(labs);
  const drift = rng.range(-0.15, 0.15, 2);
  const priorValue = Math.max(0, Math.round(base.value * (1 + drift) * 10) / 10);
  // Always further back than base.date, even if a prior hard case (e.g. stale_lab) already moved it —
  // otherwise a collision can produce a "prior" reading that's chronologically after the "current" one.
  const priorDate = monthsBefore(base.date, rng.int(3, 9));
  labs.push(labRec(base.name, priorValue, base.unit, priorDate));
  return { type: "duplicate_lab", detail: `${base.name} trended from ${priorValue}${base.unit} (${priorDate}) to ${base.value}${base.unit} (${base.date})` };
}

function pickNegation(rng: Rng, selected: Set<DiagnosisKey>): HardCase {
  const specific: string[] = [];
  for (const key of selected) {
    const pool = NEGATIONS_BY_CONDITION[key];
    if (pool) specific.push(...pool);
  }
  const phrase = specific.length && rng.bool(0.75) ? rng.pick(specific) : rng.pick(NEGATIONS_GENERAL);
  return { type: "negation", detail: phrase };
}

function assignHardCases(rng: Rng, state: BuildStateExt): { hardCases: HardCase[]; familyConfounder: boolean } {
  const hardCases: HardCase[] = [];
  let familyConfounder = false;

  if (rng.bool(0.3)) {
    const hc = tryDiscontinueMed(rng, state.meds);
    if (hc) hardCases.push(hc);
  }
  if (rng.bool(0.25)) {
    const hc = tryHistoricalFinding(rng, state.diagnoses, state.protectedIndex);
    if (hc) hardCases.push(hc);
  }
  const confounderKey = [...state.selected].find((k) => k in FAMILY_CONFOUNDER_BY_CONDITION);
  if (confounderKey && rng.bool(0.3)) {
    familyConfounder = true;
    hardCases.push({ type: "family_confounder", detail: `family history includes ${FAMILY_CONFOUNDER_BY_CONDITION[confounderKey]}, echoing the patient's own diagnosis` });
  }
  if (rng.bool(0.25)) {
    const hc = tryStaleLab(rng, state.labs);
    if (hc) hardCases.push(hc);
  }
  if (rng.bool(0.25)) {
    const hc = tryDuplicateLab(rng, state.labs);
    if (hc) hardCases.push(hc);
  }
  if (rng.bool(0.35)) {
    hardCases.push(pickNegation(rng, state.selected));
  }

  return { hardCases, familyConfounder };
}

function buildPatient(index: number, rng: Rng): GeneratedPatient {
  const id = `N-${String(index + 1).padStart(4, "0")}`;
  const sex: Sex = rng.bool() ? "F" : "M";
  const cohort = rng.pickWeighted<Cohort>([
    { item: "t2dm_eligible", weight: 34 },
    { item: "t2dm_ineligible", weight: 33 },
    { item: "other", weight: 33 },
  ]);

  const state: BuildStateExt = cohort === "t2dm_eligible" ? buildT2dmEligible(rng) : cohort === "t2dm_ineligible" ? buildT2dmIneligible(rng) : buildOther(rng);

  for (const key of rollComorbidities(rng, state)) attachComorbidity(key, rng, state);
  finalizeVitals(rng, state);

  const { hardCases, familyConfounder } = assignHardCases(rng, state);
  const familyHistory = buildFamilyHistory(rng, state.selected, familyConfounder, state.forceMtcFamily === true);

  const format = rng.pick(FORMATS);

  return {
    id,
    format,
    truth: {
      age: state.age,
      sex,
      diagnoses: state.diagnoses,
      meds: state.meds,
      labs: state.labs,
      procedures: state.procedures,
      familyHistory,
      hardCases,
    },
  };
}

/** Same (seed, count) always yields byte-identical truth. */
export function generateTruths(count: number, seed: number): GeneratedPatient[] {
  const rng = new Rng(seed);
  const patients: GeneratedPatient[] = [];
  for (let i = 0; i < count; i++) patients.push(buildPatient(i, rng));
  return patients;
}
