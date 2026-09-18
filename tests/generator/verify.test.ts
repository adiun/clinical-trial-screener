import { describe, expect, it } from "vitest";
import type { NoteTruth } from "../../shared/types.js";
import { deterministicCheck } from "../../generator/verify.js";

function truth(overrides: Partial<NoteTruth> = {}): NoteTruth {
  return {
    age: 58,
    sex: "F",
    diagnoses: [{ code: "E11.9", name: "Type 2 diabetes mellitus", onset: "2015-03-10", active: true }],
    meds: [{ name: "metformin 1000 mg BID", start: "2016-02-01", stop: null }],
    labs: [{ name: "HbA1c", value: 8.2, unit: "%", date: "2026-06-01" }],
    procedures: [],
    familyHistory: [],
    ...overrides,
  };
}

describe("deterministicCheck", () => {
  it("passes when every lab value and med name token appear in the text", () => {
    const text = "58 y/o F with T2DM on metformin 1000 mg BID. HbA1c 8.2% on 06/01/2026.";
    const result = deterministicCheck(text, truth());
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("flags a missing lab value", () => {
    const text = "Patient on metformin 1000 mg BID. No labs mentioned.";
    const result = deterministicCheck(text, truth());
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["lab HbA1c=8.2"]);
  });

  it("flags a missing medication", () => {
    const text = "HbA1c 8.2% today. Diet-controlled diabetes.";
    const result = deterministicCheck(text, truth());
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["med metformin 1000 mg BID"]);
  });

  it("matches the med's drug-name token case-insensitively without requiring the exact dose string", () => {
    const text = "Continues Metformin as before. HbA1c 8.2 stable.";
    const result = deterministicCheck(text, truth());
    expect(result.ok).toBe(true);
  });

  it("reports every missing fact, not just the first", () => {
    const text = "Patient seen for routine follow-up. No specifics documented.";
    const result = deterministicCheck(text, truth());
    expect(result.missing).toHaveLength(2);
  });

  it("passes trivially when truth has no labs or meds", () => {
    const result = deterministicCheck("Healthy patient, no active issues.", truth({ labs: [], meds: [] }));
    expect(result.ok).toBe(true);
  });

  it("treats duplicate labs of the same type independently", () => {
    const t = truth({
      meds: [],
      labs: [
        { name: "HbA1c", value: 8.9, unit: "%", date: "2026-01-01" },
        { name: "HbA1c", value: 8.2, unit: "%", date: "2026-06-01" },
      ],
    });
    const bothPresent = "A1c improved from 8.9% in January to 8.2% by June.";
    expect(deterministicCheck(bothPresent, t).ok).toBe(true);

    const onlyOne = "A1c 8.2% at the June visit.";
    const result = deterministicCheck(onlyOne, t);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["lab HbA1c=8.9"]);
  });
});
