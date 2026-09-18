// Canned plain-English trial descriptions for the Claude compiler. Each one is
// written against the conditions, meds, and labs the synthetic notes actually
// contain (T2DM, hypertension, CKD, CAD, COPD, depression, hyperlipidemia,
// obesity, OSA), so every prompt yields a mixed eligible/ineligible split.

export interface CannedPrompt {
  id: string;
  label: string;
  text: string;
}

export const CANNED_PROMPTS: readonly CannedPrompt[] = [
  {
    id: "t2d-glp1",
    label: "T2D GLP-1 add-on (default)",
    text: "Adults 18 to 75 with type 2 diabetes on stable metformin, HbA1c between 7.0 and 10.0 percent, eGFR at least 45. Exclude type 1 diabetes or any history of DKA, pancreatitis, personal or family history of medullary thyroid carcinoma or MEN2, and anyone on a GLP-1 receptor agonist or insulin in the last 3 months.",
  },
  {
    id: "t2d-sglt2",
    label: "T2D SGLT2 inhibitor, CKD focus",
    text: "Adults with type 2 diabetes and chronic kidney disease, eGFR between 25 and 60, on an ACE inhibitor or ARB. HbA1c under 11 percent. Exclude anyone already on an SGLT2 inhibitor (empagliflozin, dapagliflozin, canagliflozin), on dialysis, with type 1 diabetes, or with a history of recurrent urinary tract infections or genital mycotic infections.",
  },
  {
    id: "htn-resistant",
    label: "Resistant hypertension",
    text: "Adults 30 to 80 with hypertension on at least three antihypertensive medications including a diuretic, with a most recent systolic blood pressure of 140 or higher. Exclude eGFR below 30, pregnancy, known secondary hypertension, and current use of a mineralocorticoid receptor antagonist such as spironolactone or eplerenone.",
  },
  {
    id: "ldl-statin",
    label: "High LDL despite statin",
    text: "Adults with LDL cholesterol at or above 100 mg/dL while on a moderate or high intensity statin (atorvastatin 40 or 80, rosuvastatin 20 or 40). Include patients with documented coronary artery disease or diabetes. Exclude anyone already on ezetimibe or a PCSK9 inhibitor, with a history of statin intolerance or myopathy, or with active liver disease.",
  },
  {
    id: "copd-exac",
    label: "COPD with exacerbations",
    text: "Adults 40 and older with COPD who are current or former smokers and have had at least one exacerbation in the past year. Must be on a long-acting bronchodilator. Exclude a diagnosis of asthma, current use of daily oral prednisone, home oxygen, or any lung cancer history.",
  },
  {
    id: "depression-ssri",
    label: "Depression, SSRI non-response",
    text: "Adults 18 to 65 with major depressive disorder currently taking an SSRI such as sertraline, escitalopram, or fluoxetine for at least 8 weeks who still report depressive symptoms. Exclude bipolar disorder, any psychotic disorder, active suicidal ideation, current substance use disorder, and pregnancy or breastfeeding.",
  },
  {
    id: "obesity-weight",
    label: "Obesity weight management",
    text: "Adults with a BMI of 30 or higher, or a BMI of 27 or higher with at least one weight-related comorbidity such as type 2 diabetes, hypertension, hyperlipidemia, or obstructive sleep apnea. Exclude prior bariatric surgery, current or recent GLP-1 receptor agonist use, history of pancreatitis, personal or family history of medullary thyroid carcinoma, and an eating disorder diagnosis.",
  },
  {
    id: "cad-secondary",
    label: "CAD secondary prevention",
    text: "Adults with established coronary artery disease, defined as a prior myocardial infarction, PCI, stent, or CABG, who are on aspirin and a statin. Exclude anyone on a P2Y12 inhibitor such as clopidogrel or ticagrelor, with a history of intracranial hemorrhage, with atrial fibrillation on anticoagulation, or with eGFR below 30.",
  },
  {
    id: "osa-cpap",
    label: "OSA on CPAP, residual sleepiness",
    text: "Adults 18 to 70 with obstructive sleep apnea who use CPAP and still report daytime sleepiness. BMI under 45. Exclude narcolepsy, current use of a stimulant such as modafinil or armodafinil, uncontrolled hypertension with systolic over 160, and shift work.",
  },
  {
    id: "ckd-anemia",
    label: "CKD stage 3-4 anemia",
    text: "Adults with chronic kidney disease stage 3 or 4, eGFR from 15 to 59, not on dialysis, with a documented hemoglobin below 11 g/dL. Exclude any erythropoiesis-stimulating agent in the last 12 weeks, a red blood cell transfusion in the last 8 weeks, active cancer, and uncontrolled hypertension.",
  },
  {
    id: "elderly-polypharmacy",
    label: "Older adults, polypharmacy",
    text: "Patients aged 65 or older taking five or more daily chronic medications, with at least two of hypertension, type 2 diabetes, hyperlipidemia, or depression. Exclude a documented diagnosis of dementia, residence in a nursing facility, eGFR below 30, and any active cancer treatment.",
  },
];
