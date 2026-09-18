import { describe, expect, it } from "vitest";
import type { Answer, Criterion } from "../shared/types.js";
import { countStatuses, criterionStatus, eligibilityScore, flippedNotes, noteStatus, noulConfidence, scoreMetProbability } from "../shared/rollup.js";

const crit = (id: string, kind: Criterion["kind"], hash = "h" + id): Criterion => ({
  id,
  position: 0,
  name: id,
  kind,
  primitive: "noul",
  question: "q",
  trueDescription: null,
  falseDescription: null,
  levels: null,
  metLevels: null,
  weight: 1,
  hash,
});

const ans = (p: number, hash: string, c = noulConfidence(p)): Answer => ({
  criterionHash: hash,
  p,
  c,
  raw: { type: "noul", noul: p },
  latencyMs: 10,
  cached: false,
});

describe("criterionStatus", () => {
  it("is pending without an answer", () => {
    expect(criterionStatus(undefined, 0.6)).toBe("pending");
  });
  it("is uncertain when confidence is below the threshold", () => {
    expect(criterionStatus(ans(0.7, "h"), 0.6)).toBe("uncertain"); // c = 0.4
    expect(criterionStatus(ans(0.7, "h"), 0.3)).toBe("met");
  });
  it("decides by probability once confident", () => {
    expect(criterionStatus(ans(0.95, "h"), 0.6)).toBe("met");
    expect(criterionStatus(ans(0.05, "h"), 0.6)).toBe("not_met");
  });
});

describe("noteStatus", () => {
  const inc = crit("inc", "inclusion");
  const exc = crit("exc", "exclusion");

  it("is eligible when inclusions are met and exclusions are not", () => {
    const s = noteStatus([inc, exc], { inc: ans(0.95, "hinc"), exc: ans(0.05, "hexc") }, 0.6);
    expect(s.status).toBe("eligible");
    expect(s.criteria).toEqual({ inc: "met", exc: "not_met" });
  });
  it("is ineligible when an inclusion fails", () => {
    expect(noteStatus([inc, exc], { inc: ans(0.05, "hinc"), exc: ans(0.05, "hexc") }, 0.6).status).toBe("ineligible");
  });
  it("is ineligible when an exclusion is met", () => {
    expect(noteStatus([inc, exc], { inc: ans(0.95, "hinc"), exc: ans(0.95, "hexc") }, 0.6).status).toBe("ineligible");
  });
  it("needs review when any criterion is uncertain and nothing failed", () => {
    expect(noteStatus([inc, exc], { inc: ans(0.95, "hinc"), exc: ans(0.6, "hexc") }, 0.6).status).toBe("review");
  });
  it("a confident failure outranks an uncertain criterion", () => {
    expect(noteStatus([inc, exc], { inc: ans(0.6, "hinc"), exc: ans(0.95, "hexc") }, 0.6).status).toBe("ineligible");
  });
  it("is pending while any criterion lacks a live answer", () => {
    expect(noteStatus([inc, exc], { inc: ans(0.95, "hinc") }, 0.6).status).toBe("pending");
  });
  it("treats an answer for a stale criterion hash as pending", () => {
    const s = noteStatus([inc, exc], { inc: ans(0.95, "OLD"), exc: ans(0.05, "hexc") }, 0.6);
    expect(s.criteria.inc).toBe("pending");
    expect(s.status).toBe("pending");
  });
  it("re-rolls from the same probabilities when the threshold moves", () => {
    const answers = { inc: ans(0.8, "hinc"), exc: ans(0.05, "hexc") }; // inc c = 0.6
    expect(noteStatus([inc, exc], answers, 0.5).status).toBe("eligible");
    expect(noteStatus([inc, exc], answers, 0.7).status).toBe("review");
  });
});

describe("countStatuses and flips", () => {
  const inc = crit("inc", "inclusion");
  const exc = crit("exc", "exclusion");
  it("counts each status", () => {
    const c = countStatuses([
      { status: "eligible", criteria: {} },
      { status: "eligible", criteria: {} },
      { status: "review", criteria: {} },
    ]);
    expect(c).toEqual({ eligible: 2, ineligible: 0, review: 1, pending: 0 });
  });
  it("names the criterion that flipped a note", () => {
    const before = { n1: noteStatus([inc, exc], { inc: ans(0.95, "hinc"), exc: ans(0.05, "hexc") }, 0.6) };
    const after = { n1: noteStatus([inc, exc], { inc: ans(0.95, "hinc"), exc: ans(0.95, "hexc") }, 0.6) };
    const flips = flippedNotes([inc, exc], before, after);
    expect(flips).toEqual([{ noteId: "n1", from: "eligible", to: "ineligible", criterionId: "exc" }]);
  });
  it("ignores notes whose status did not change", () => {
    const snap = { n1: noteStatus([inc], { inc: ans(0.95, "hinc") }, 0.6) };
    expect(flippedNotes([inc], snap, snap)).toEqual([]);
  });
});

describe("score helpers", () => {
  it("sums probability mass over met levels", () => {
    expect(scoreMetProbability({ "0": 0.1, "1": 0.2, "2": 0.7 }, [1, 2])).toBeCloseTo(0.9);
    expect(scoreMetProbability({ "0": 0.1, "1": 0.2, "2": 0.7 }, [0])).toBeCloseTo(0.1);
  });
  it("derives Noul confidence from distance to 0.5", () => {
    expect(noulConfidence(0.5)).toBe(0);
    expect(noulConfidence(1)).toBe(1);
    expect(noulConfidence(0.25)).toBeCloseTo(0.5);
  });
  it("computes a weighted eligibility score", () => {
    const inc = crit("inc", "inclusion");
    const exc = crit("exc", "exclusion");
    expect(eligibilityScore([inc, exc], { inc: ans(1, "hinc"), exc: ans(0, "hexc") })).toBe(1);
    expect(eligibilityScore([inc, exc], { inc: ans(1, "hinc"), exc: ans(1, "hexc") })).toBe(0.5);
  });
});

describe("flips ignore first landings", () => {
  const inc = crit("inc", "inclusion");
  it("does not count pending to decided as a flip", () => {
    const before = { n1: noteStatus([inc], undefined, 0.6) };
    const after = { n1: noteStatus([inc], { inc: ans(0.95, "hinc") }, 0.6) };
    expect(before.n1.status).toBe("pending");
    expect(flippedNotes([inc], before, after)).toEqual([]);
  });
});
