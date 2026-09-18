// The default protocol: a type 2 diabetes outpatient trial modeled on common
// GLP-1 receptor agonist add-on study designs. Nine criteria; two are graded
// (Score), the rest are yes/no (Noul). Questions are phrased so that "yes" or
// a high level means the condition holds, and each names the exact condition
// so Jev reads it literally.
import type { CriterionInput } from "../shared/types.js";

export const DEFAULT_PROTOCOL_ID = "t2d-default";

export const DEFAULT_PROTOCOL = {
  id: DEFAULT_PROTOCOL_ID,
  name: "T2D add-on therapy trial (synthetic default)",
  description:
    "Adults with type 2 diabetes on stable metformin with inadequate glycemic control, adequate renal function, and no GLP-1 class contraindications.",
};

const AGE_MIN = 18;
const AGE_MAX = 75;

export const DEFAULT_CRITERIA: CriterionInput[] = [
  {
    id: "c_t2d",
    name: "Type 2 diabetes diagnosis",
    kind: "inclusion",
    primitive: "noul",
    question: "does the patient have a documented diagnosis of type 2 diabetes mellitus?",
    trueDescription: "The note names type 2 diabetes, T2DM, or an equivalent (e.g. ICD-10 E11) as a diagnosis of this patient.",
    falseDescription: "No type 2 diabetes diagnosis is documented, or only type 1 diabetes, prediabetes, or gestational diabetes is mentioned.",
    levels: null,
    metLevels: null,
    weight: 1,
  },
  {
    id: "c_age",
    name: `Age ${AGE_MIN} to ${AGE_MAX}`,
    kind: "inclusion",
    primitive: "noul",
    question: `is the patient's age at least ${AGE_MIN} years and at most ${AGE_MAX} years? Use \`patient.age\` when present, otherwise the age stated in the note.`,
    trueDescription: `Age is stated and falls between ${AGE_MIN} and ${AGE_MAX} inclusive.`,
    falseDescription: `Age is stated and is under ${AGE_MIN} or over ${AGE_MAX}, or no age is stated anywhere.`,
    levels: null,
    metLevels: null,
    weight: 0.6,
  },
  {
    id: "c_a1c",
    name: "HbA1c 7.0% to 10.0%",
    kind: "inclusion",
    primitive: "score",
    question: "what is the patient's most recent hemoglobin A1c (HbA1c) level as documented in the note?",
    trueDescription: null,
    falseDescription: null,
    levels: [
      "No HbA1c value is documented in the note",
      "HbA1c below 7.0%",
      "HbA1c from 7.0% up to and including 8.4%",
      "HbA1c from 8.5% up to and including 10.0%",
      "HbA1c above 10.0%",
    ],
    metLevels: [2, 3],
    weight: 1,
  },
  {
    id: "c_metformin",
    name: "On metformin",
    kind: "inclusion",
    primitive: "noul",
    question: "is the patient currently taking metformin (including combination products that contain metformin)?",
    trueDescription: "Metformin appears in the current medication list or the note says the patient takes it now.",
    falseDescription: "Metformin is absent, was stopped, or is only mentioned as a past or future option.",
    levels: null,
    metLevels: null,
    weight: 0.8,
  },
  {
    id: "c_renal",
    name: "eGFR 45 or higher",
    kind: "inclusion",
    primitive: "score",
    question: "what is the patient's most recent estimated glomerular filtration rate (eGFR) as documented in the note?",
    trueDescription: null,
    falseDescription: null,
    levels: [
      "No eGFR or creatinine clearance value is documented",
      "eGFR 60 or higher (normal or mildly decreased kidney function)",
      "eGFR from 45 up to 59 (mild to moderate decrease)",
      "eGFR from 30 up to 44 (moderate to severe decrease)",
      "eGFR below 30, or the patient is on dialysis",
    ],
    metLevels: [1, 2],
    weight: 0.8,
  },
  {
    id: "c_t1d_dka",
    name: "Type 1 diabetes or DKA history",
    kind: "exclusion",
    primitive: "noul",
    question: "does the patient have type 1 diabetes, or any documented history of diabetic ketoacidosis (DKA)?",
    trueDescription: "Type 1 diabetes, T1DM, LADA, or a past DKA episode is documented for this patient.",
    falseDescription: "Neither type 1 diabetes nor DKA appears in the note.",
    levels: null,
    metLevels: null,
    weight: 1,
  },
  {
    id: "c_pancreatitis",
    name: "Pancreatitis history",
    kind: "exclusion",
    primitive: "noul",
    question: "does the patient have any documented history of acute or chronic pancreatitis?",
    trueDescription: "Pancreatitis of any kind appears in the patient's diagnoses or history.",
    falseDescription: "Pancreatitis is not mentioned, or is explicitly denied.",
    levels: null,
    metLevels: null,
    weight: 1,
  },
  {
    id: "c_mtc",
    name: "MTC or MEN2 (personal or family)",
    kind: "exclusion",
    primitive: "noul",
    question:
      "does the patient have a personal or family history of medullary thyroid carcinoma (MTC) or multiple endocrine neoplasia type 2 (MEN2)?",
    trueDescription: "MTC or MEN2 appears in the patient's own diagnoses or in the family history.",
    falseDescription: "Neither condition is mentioned for the patient or their family.",
    levels: null,
    metLevels: null,
    weight: 1,
  },
  {
    id: "c_glp1_insulin",
    name: "Recent GLP-1 RA or insulin",
    kind: "exclusion",
    primitive: "noul",
    question:
      "is the patient currently taking, or has the patient taken within roughly the last 3 months, any GLP-1 receptor agonist (such as semaglutide, liraglutide, dulaglutide, exenatide, tirzepatide) or any insulin?",
    trueDescription: "A GLP-1 receptor agonist or an insulin is in the current medication list or was recently used.",
    falseDescription: "No GLP-1 receptor agonist or insulin is current or recent.",
    levels: null,
    metLevels: null,
    weight: 0.9,
  },
];
