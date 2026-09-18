import { describe, expect, it } from "vitest";
import { DEFAULT_TRUTH, buildEvalReport, truthEligible } from "../server/eval.js";
import { DEFAULT_CRITERIA } from "../server/protocol.js";
import { criterionHash } from "../shared/hash.js";
import type { Criterion, NoteTruth } from "../shared/types.js";

const criteria: Criterion[] = DEFAULT_CRITERIA.map((c, i) => ({ ...c, id: c.id ?? `c${i}`, position: i, hash: criterionHash(c) }));

const eligibleTruth: NoteTruth = {
  age: 58,
  sex: "F",
  diagnoses: [{ code: "E11.9", name: "Type 2 diabetes mellitus", onset: "2015-01-01", active: true }],
  meds: [{ name: "metformin 1000 mg BID", start: "2016-01-01", stop: null }],
  labs: [
    { name: "HbA1c", value: 8.2, unit: "%", date: "2026-06-01" },
    { name: "eGFR", value: 72, unit: "mL/min/1.73m2", date: "2026-06-01" },
  ],
  procedures: [],
  familyHistory: [],
};

describe("truth functions", () => {
  it("evaluates the eligible fixture as eligible", () => {
    expect(truthEligible(criteria, eligibleTruth, DEFAULT_TRUTH)).toBe(true);
  });
  it("excludes on family history of MTC", () => {
    const t = { ...eligibleTruth, familyHistory: ["Mother: medullary thyroid carcinoma"] };
    expect(DEFAULT_TRUTH["c_mtc"]!(t)).toBe(true);
    expect(truthEligible(criteria, t, DEFAULT_TRUTH)).toBe(false);
  });
  it("returns null when a needed lab is missing", () => {
    const t = { ...eligibleTruth, labs: eligibleTruth.labs.filter((l) => l.name !== "HbA1c") };
    expect(DEFAULT_TRUTH["c_a1c"]!(t)).toBeNull();
    expect(truthEligible(criteria, t, DEFAULT_TRUTH)).toBeNull();
  });
  it("fails on eGFR below 45", () => {
    const t = { ...eligibleTruth, labs: [eligibleTruth.labs[0]!, { name: "eGFR", value: 38, unit: "", date: "2026-06-01" }] };
    expect(truthEligible(criteria, t, DEFAULT_TRUTH)).toBe(false);
  });
});

describe("eval report", () => {
  it("scores per-criterion accuracy and buckets calibration", () => {
    const answers = {
      n1: Object.fromEntries(
        criteria.map((c) => {
          const holds = DEFAULT_TRUTH[c.id]!(eligibleTruth) === true;
          const p = holds ? 0.95 : 0.05;
          return [c.id, { criterionHash: c.hash, p, c: 0.9, raw: { type: "noul" as const, noul: p }, latencyMs: 1, cached: false }];
        }),
      ),
    };
    const report = buildEvalReport(criteria, [{ id: "n1", truth: eligibleTruth }], answers, 0.6);
    expect(report.available).toBe(true);
    for (const row of report.perCriterion) expect(row.accuracy === null || row.accuracy === 1).toBe(true);
    expect(report.noteAccuracy).toMatchObject({ decided: 1, correct: 1 });
    const top = report.calibration[4]!;
    expect(top.n).toBe(criteria.length);
    expect(top.accuracy).toBe(1);
  });
  it("reports unavailable when no criterion has a truth function", () => {
    const foreign = [{ ...criteria[0]!, id: "x_unknown" }];
    expect(buildEvalReport(foreign, [], {}, 0.6).available).toBe(false);
  });
});
