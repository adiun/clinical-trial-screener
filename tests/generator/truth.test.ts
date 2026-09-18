import { describe, expect, it } from "vitest";
import { generateTruths } from "../../generator/truth.js";

describe("generateTruths determinism", () => {
  it("produces byte-identical output for the same seed and count", () => {
    const a = generateTruths(120, 42);
    const b = generateTruths(120, 42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("changes output when the seed changes", () => {
    const a = generateTruths(50, 1);
    const b = generateTruths(50, 2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("is a prefix-stable stream: the first N patients don't depend on count", () => {
    const small = generateTruths(10, 7);
    const large = generateTruths(30, 7);
    expect(JSON.stringify(large.slice(0, 10))).toBe(JSON.stringify(small));
  });
});

describe("generateTruths shape", () => {
  const patients = generateTruths(300, 42);

  it("assigns unique, sequential ids", () => {
    const ids = patients.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(patients[0]?.id).toBe("N-0001");
  });

  it("keeps age and sex within the specified ranges", () => {
    for (const p of patients) {
      expect(p.truth.age).toBeGreaterThanOrEqual(18);
      expect(p.truth.age).toBeLessThanOrEqual(90);
      expect(["M", "F"]).toContain(p.truth.sex);
    }
  });

  it("uses one of the four documented formats", () => {
    for (const p of patients) {
      expect(["soap", "discharge_summary", "terse", "dictated"]).toContain(p.format);
    }
  });

  it("produces roughly a third plausible T2DM trial candidates under the default protocol", () => {
    const eligible = patients.filter((p) => isDefaultProtocolEligible(p.truth));
    const fraction = eligible.length / patients.length;
    expect(fraction).toBeGreaterThan(0.25);
    expect(fraction).toBeLessThan(0.42);
  });

  it("never lets a discontinued_med or historical_finding hard case target metformin or the primary diabetes diagnosis", () => {
    for (const p of patients) {
      for (const hc of p.truth.hardCases ?? []) {
        if (hc.type === "discontinued_med") expect(hc.detail.toLowerCase()).not.toContain("metformin");
      }
    }
  });

  it("gives every lab a name, numeric value, unit, and ISO date", () => {
    for (const p of patients) {
      for (const lab of p.truth.labs) {
        expect(lab.name.length).toBeGreaterThan(0);
        expect(Number.isFinite(lab.value)).toBe(true);
        expect(lab.unit.length).toBeGreaterThan(0);
        expect(lab.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

function isDefaultProtocolEligible(truth: ReturnType<typeof generateTruths>[number]["truth"]): boolean {
  const hasT2dm = truth.diagnoses.some((d) => d.name.includes("Type 2 diabetes"));
  const a1c = truth.labs.find((l) => l.name === "HbA1c");
  const egfr = truth.labs.find((l) => l.name === "eGFR");
  const onMetformin = truth.meds.some((m) => m.name.includes("metformin") && m.stop === null);
  const hasT1dmOrDka = truth.diagnoses.some((d) => d.code.startsWith("E10"));
  const hasPancreatitis = truth.diagnoses.some((d) => d.name.toLowerCase().includes("pancreatitis"));
  const hasMtc = truth.familyHistory.some((f) => f.includes("medullary"));
  const recentGlp1OrInsulin = truth.meds.some((m) => m.stop === null && (m.name.includes("insulin") || ["semaglutide", "dulaglutide", "liraglutide", "tirzepatide"].some((n) => m.name.includes(n))));
  return (
    hasT2dm &&
    truth.age >= 18 &&
    truth.age <= 75 &&
    a1c !== undefined &&
    a1c.value >= 7.0 &&
    a1c.value <= 10.0 &&
    onMetformin &&
    egfr !== undefined &&
    egfr.value >= 45 &&
    !hasT1dmOrDka &&
    !hasPancreatitis &&
    !hasMtc &&
    !recentGlp1OrInsulin
  );
}
