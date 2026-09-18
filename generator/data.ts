// Static pools the truth sampler draws from. Kept separate from the sampling
// logic in truth.ts so the probability/comorbidity code stays readable.

export interface DiagnosisSpec {
  code: string;
  name: string;
}

export const DIAGNOSES = {
  t2dm: { code: "E11.9", name: "Type 2 diabetes mellitus" },
  t2dm_ckd: { code: "E11.22", name: "Type 2 diabetes mellitus with diabetic chronic kidney disease" },
  t2dm_neuropathy: { code: "E11.42", name: "Type 2 diabetes mellitus with diabetic polyneuropathy" },
  t1dm: { code: "E10.9", name: "Type 1 diabetes mellitus" },
  dka: { code: "E10.10", name: "Type 1 diabetes mellitus with ketoacidosis" },
  htn: { code: "I10", name: "Essential hypertension" },
  ckd3a: { code: "N18.31", name: "Chronic kidney disease, stage 3a" },
  ckd3b: { code: "N18.32", name: "Chronic kidney disease, stage 3b" },
  ckd4: { code: "N18.4", name: "Chronic kidney disease, stage 4" },
  cad: { code: "I25.10", name: "Coronary artery disease" },
  copd: { code: "J44.9", name: "Chronic obstructive pulmonary disease" },
  depression: { code: "F33.1", name: "Major depressive disorder, recurrent, moderate" },
  hyperlipidemia: { code: "E78.5", name: "Hyperlipidemia" },
  obesity: { code: "E66.9", name: "Obesity" },
  osa: { code: "G47.33", name: "Obstructive sleep apnea" },
  oa: { code: "M19.90", name: "Osteoarthritis, unspecified site" },
  gerd: { code: "K21.9", name: "Gastroesophageal reflux disease" },
  hypothyroid: { code: "E03.9", name: "Hypothyroidism" },
  anxiety: { code: "F41.1", name: "Generalized anxiety disorder" },
  afib: { code: "I48.91", name: "Atrial fibrillation" },
  pancreatitis: { code: "K85.90", name: "Acute pancreatitis" },
} satisfies Record<string, DiagnosisSpec>;

export type DiagnosisKey = keyof typeof DIAGNOSES;

export const MEDS = {
  metformin: ["metformin 500 mg BID", "metformin 1000 mg BID", "metformin ER 1000 mg daily"],
  sulfonylurea: ["glipizide 5 mg daily", "glimepiride 2 mg daily"],
  sglt2: ["empagliflozin 10 mg daily", "dapagliflozin 10 mg daily"],
  glp1: ["semaglutide 1 mg weekly", "dulaglutide 1.5 mg weekly", "liraglutide 1.8 mg daily", "tirzepatide 5 mg weekly"],
  insulin: ["insulin glargine 20 units nightly", "insulin glargine 30 units nightly", "insulin detemir 24 units nightly"],
  acei_arb: ["lisinopril 10 mg daily", "lisinopril 20 mg daily", "losartan 50 mg daily"],
  ccb: ["amlodipine 5 mg daily", "amlodipine 10 mg daily"],
  thiazide: ["hydrochlorothiazide 25 mg daily"],
  statin: ["atorvastatin 20 mg daily", "atorvastatin 40 mg daily", "rosuvastatin 10 mg daily"],
  aspirin: ["aspirin 81 mg daily"],
  betablocker: ["metoprolol succinate 50 mg daily", "metoprolol tartrate 25 mg BID"],
  inhaler: ["albuterol inhaler PRN", "tiotropium 18 mcg inhaled daily"],
  ssri: ["sertraline 100 mg daily", "escitalopram 10 mg daily"],
  levothyroxine: ["levothyroxine 75 mcg daily", "levothyroxine 100 mcg daily"],
  ppi: ["omeprazole 20 mg daily"],
  doac: ["apixaban 5 mg BID"],
  nsaid: ["naproxen 500 mg BID PRN"],
} satisfies Record<string, string[]>;

export type MedKey = keyof typeof MEDS;

export const PROCEDURES: Record<string, string[]> = {
  cad: ["cardiac catheterization", "percutaneous coronary intervention", "coronary artery bypass graft"],
  pancreatitis: ["laparoscopic cholecystectomy"],
  osa: ["polysomnography (sleep study)"],
  copd: ["pulmonary function testing (spirometry)"],
  oa: ["knee arthroscopy"],
  afib: ["electrical cardioversion"],
  general: ["colonoscopy (screening)", "routine dental cleaning"],
};

export const FAMILY_HISTORY = [
  "father with coronary artery disease",
  "mother with type 2 diabetes",
  "mother with breast cancer",
  "father with colon cancer",
  "sibling with hypertension",
  "mother with hypothyroidism",
  "father with stroke",
  "maternal grandmother with Alzheimer's disease",
  "sibling with asthma",
  "father with medullary thyroid carcinoma",
] as const;

/** Family history phrase reused as the "family confounder" hard case: it names the same condition family as the patient's own diagnosis. */
export const FAMILY_CONFOUNDER_BY_CONDITION: Partial<Record<DiagnosisKey, string>> = {
  t2dm: "mother with type 2 diabetes",
  t2dm_ckd: "mother with type 2 diabetes",
  cad: "father with coronary artery disease",
  hyperlipidemia: "father with coronary artery disease",
};

export const NEGATIONS_GENERAL = ["denies tobacco use", "denies alcohol use", "no known drug allergies", "denies illicit drug use"] as const;

export const NEGATIONS_BY_CONDITION: Partial<Record<DiagnosisKey, readonly string[]>> = {
  t2dm: ["denies polyuria, polydipsia, or polyphagia", "denies hypoglycemic episodes"],
  cad: ["denies chest pain", "denies exertional dyspnea"],
  copd: ["denies hemoptysis"],
  ckd3a: ["denies hematuria", "denies lower extremity edema"],
  ckd3b: ["denies hematuria", "denies lower extremity edema"],
  ckd4: ["denies hematuria", "denies lower extremity edema"],
  pancreatitis: ["denies recurrent abdominal pain"],
  depression: ["denies suicidal ideation"],
};

export const DISCONTINUATION_REASONS = ["GI intolerance", "hyperkalemia", "insurance formulary change", "patient preference", "hypoglycemia", "elevated liver enzymes", "cost"] as const;

export const RESOLUTION_NOTES = ["resolved after treatment, now inactive", "in remission", "quiescent, no recurrence since", "resolved status post cholecystectomy"] as const;

export const FORMATS = ["soap", "discharge_summary", "terse", "dictated"] as const;
export type NoteFormat = (typeof FORMATS)[number];

/** Comorbidity boosts: selecting the key condition multiplies the listed conditions' base probability. */
export const COMORBIDITY_BOOST: Partial<Record<DiagnosisKey, Partial<Record<DiagnosisKey, number>>>> = {
  htn: { hyperlipidemia: 1.8, cad: 1.6, ckd3a: 1.4, obesity: 1.3 },
  cad: { htn: 1.8, hyperlipidemia: 2.0, afib: 1.4 },
  obesity: { osa: 2.2, htn: 1.4, hyperlipidemia: 1.3, gerd: 1.3 },
  hyperlipidemia: { cad: 1.6, htn: 1.4 },
  depression: { anxiety: 1.8 },
  anxiety: { depression: 1.8 },
};
