// Ground-truth eligibility for the default protocol, computed from the `truth`
// object that ships with each synthetic note. This module is the only reader
// of `truth`. It never touches Jev or Claude.
import type { Answer, CalibrationBucket, Criterion, EvalCriterionRow, EvalReport, NoteTruth } from "../shared/types.js";
import { criterionStatus, noteStatus } from "../shared/rollup.js";

/** Per-criterion truth: true = condition holds, false = does not, null = truth cannot say. */
export type TruthFn = (truth: NoteTruth) => boolean | null;

const dx = (t: NoteTruth, re: RegExp, activeOnly = false) =>
  t.diagnoses.some((d) => (!activeOnly || d.active) && (re.test(d.name) || re.test(d.code)));
const med = (t: NoteTruth, re: RegExp, currentOnly = true) => t.meds.some((m) => re.test(m.name) && (!currentOnly || m.stop === null));
const latestLab = (t: NoteTruth, re: RegExp) => {
  const labs = t.labs.filter((l) => re.test(l.name)).sort((a, b) => (a.date < b.date ? 1 : -1));
  return labs[0] ?? null;
};

export const DEFAULT_TRUTH: Record<string, TruthFn> = {
  c_t2d: (t) => dx(t, /type\s*2|t2dm|\bE11/i),
  c_age: (t) => t.age >= 18 && t.age <= 75,
  c_a1c: (t) => {
    const lab = latestLab(t, /a1c|hba1c|hemoglobin a1c|glycated/i);
    if (!lab) return null;
    return lab.value >= 7.0 && lab.value <= 10.0;
  },
  c_metformin: (t) => med(t, /metformin|glucophage|janumet|glucovance|xigduo|synjardy/i),
  c_renal: (t) => {
    const lab = latestLab(t, /egfr|gfr|glomerular/i);
    if (!lab) return null;
    return lab.value >= 45;
  },
  c_t1d_dka: (t) => dx(t, /type\s*1|t1dm|\bE10|ketoacidosis|dka|lada/i),
  c_pancreatitis: (t) => dx(t, /pancreatitis|\bK85|\bK86\.[01]/i),
  c_mtc: (t) =>
    dx(t, /medullary thyroid|\bC73|men\s*2|multiple endocrine neoplasia/i) ||
    t.familyHistory.some((f) => /medullary thyroid|mtc|men\s*2|multiple endocrine neoplasia/i.test(f)),
  c_glp1_insulin: (t) => {
    const re = /semaglutide|ozempic|wegovy|rybelsus|liraglutide|victoza|saxenda|dulaglutide|trulicity|exenatide|byetta|bydureon|tirzepatide|mounjaro|zepbound|lixisenatide|insulin|lantus|glargine|humalog|lispro|novolog|aspart|levemir|detemir|tresiba|degludec|nph|humulin|novolin|toujeo|basaglar/i;
    return t.meds.some((m) => re.test(m.name) && (m.stop === null || withinDays(m.stop, 90)));
  },
};

function withinDays(iso: string, days: number): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

/** Truth-based note eligibility: all inclusions hold, no exclusion holds; null when any needed truth is unknown. */
export function truthEligible(criteria: readonly Criterion[], truth: NoteTruth, fns: Record<string, TruthFn>): boolean | null {
  let unknown = false;
  for (const c of criteria) {
    const fn = fns[c.id];
    if (!fn) return null;
    const holds = fn(truth);
    if (holds === null) {
      unknown = true;
      continue;
    }
    if (c.kind === "inclusion" && !holds) return false;
    if (c.kind === "exclusion" && holds) return false;
  }
  return unknown ? null : true;
}

export function buildEvalReport(
  criteria: readonly Criterion[],
  truths: readonly { id: string; truth: NoteTruth }[],
  answers: Record<string, Record<string, Answer>>,
  threshold: number,
  fns: Record<string, TruthFn> = DEFAULT_TRUTH,
): EvalReport {
  const covered = criteria.filter((c) => fns[c.id]);
  if (covered.length === 0) {
    return {
      available: false,
      reason: "No ground-truth function matches the current criteria. The evaluation panel covers the shipped default protocol's criterion ids.",
      perCriterion: [],
      calibration: [],
      noteAccuracy: { decided: 0, correct: 0, review: 0, accuracy: null },
    };
  }

  const perCriterion: EvalCriterionRow[] = covered.map((c) => ({
    criterionId: c.id,
    name: c.name,
    decided: 0,
    correct: 0,
    uncertain: 0,
    noTruth: 0,
    accuracy: null,
  }));
  const rowById = new Map(perCriterion.map((r) => [r.criterionId, r]));

  const buckets: CalibrationBucket[] = [0.5, 0.6, 0.7, 0.8, 0.9].map((lo) => ({ lo, hi: lo + 0.1, n: 0, accuracy: null, meanConfidence: null }));
  const bucketAcc = buckets.map(() => ({ correct: 0, confSum: 0 }));

  const noteAcc = { decided: 0, correct: 0, review: 0, accuracy: null as number | null };

  for (const { id: noteId, truth } of truths) {
    const noteAnswers = answers[noteId];
    for (const c of covered) {
      const row = rowById.get(c.id)!;
      const fn = fns[c.id]!;
      const actual = fn(truth);
      if (actual === null) {
        row.noTruth++;
        continue;
      }
      const a = noteAnswers?.[c.id];
      const live = a && a.criterionHash === c.hash ? a : undefined;
      if (!live) continue;
      const status = criterionStatus(live, threshold);
      if (status === "uncertain") {
        row.uncertain++;
      } else if (status !== "pending") {
        row.decided++;
        if ((status === "met") === actual) row.correct++;
      }
      // Calibration uses the argmax prediction regardless of threshold.
      const predicted = live.p >= 0.5;
      const stated = Math.max(live.p, 1 - live.p);
      const idx = Math.min(4, Math.max(0, Math.floor((stated - 0.5) / 0.1)));
      const b = buckets[idx]!;
      b.n++;
      bucketAcc[idx]!.confSum += stated;
      if (predicted === actual) bucketAcc[idx]!.correct++;
    }

    const actualNote = truthEligible(covered, truth, fns);
    if (actualNote !== null && noteAnswers) {
      const snap = noteStatus(covered, noteAnswers, threshold);
      if (snap.status === "review") noteAcc.review++;
      else if (snap.status !== "pending") {
        noteAcc.decided++;
        if ((snap.status === "eligible") === actualNote) noteAcc.correct++;
      }
    }
  }

  for (const r of perCriterion) r.accuracy = r.decided > 0 ? r.correct / r.decided : null;
  buckets.forEach((b, i) => {
    const acc = bucketAcc[i]!;
    b.accuracy = b.n > 0 ? acc.correct / b.n : null;
    b.meanConfidence = b.n > 0 ? acc.confSum / b.n : null;
  });
  noteAcc.accuracy = noteAcc.decided > 0 ? noteAcc.correct / noteAcc.decided : null;

  return { available: true, perCriterion, calibration: buckets, noteAccuracy: noteAcc };
}
