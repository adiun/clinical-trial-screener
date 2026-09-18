import { describe, expect, it } from "vitest";
import { buildQuestions, buildState, toAnswer } from "../server/jev/questions.js";
import { DEFAULT_CRITERIA } from "../server/protocol.js";
import { criterionHash } from "../shared/hash.js";
import type { Criterion } from "../shared/types.js";

const criteria: Criterion[] = DEFAULT_CRITERIA.map((c, i) => ({ ...c, id: c.id ?? `c${i}`, position: i, hash: criterionHash(c) }));

describe("question building", () => {
  it("builds one question per criterion with the right primitive", () => {
    const q = buildQuestions(criteria);
    expect(Object.keys(q)).toHaveLength(criteria.length);
    expect(q["c_t2d"]?.type).toBe("noul");
    expect(q["c_a1c"]?.type).toBe("score");
    const a1c = q["c_a1c"];
    expect(a1c && a1c.type === "score" ? a1c.criteria.length : 0).toBe(5);
  });
  it("passes Noul true/false descriptions as criteria", () => {
    const q = buildQuestions(criteria)["c_t2d"];
    expect(q && q.type === "noul" && q.criteria && "true" in q.criteria).toBe(true);
  });
  it("state is the note text plus parsed demographics and nothing else", () => {
    expect(buildState("note", null, null)).toEqual({ note: "note" });
    expect(buildState("note", 62, "M")).toEqual({ note: "note", patient: { age: 62, sex: "M" } });
    expect(Object.keys(buildState("note", 62, "M"))).not.toContain("truth");
  });
});

describe("answer conversion", () => {
  it("derives Noul confidence from probability", () => {
    const a = toAnswer(criteria[0]!, { type: "noul", noul: 0.9 }, 5);
    expect(a.p).toBeCloseTo(0.9);
    expect(a.c).toBeCloseTo(0.8);
    expect(a.criterionHash).toBe(criteria[0]!.hash);
  });
  it("sums Score mass over met levels and keeps Jev's confidence", () => {
    const a1c = criteria.find((c) => c.id === "c_a1c")!;
    const a = toAnswer(a1c, { type: "score", score: 2.4, confidence: 0.7, probabilities: { "0": 0.05, "1": 0.05, "2": 0.5, "3": 0.35, "4": 0.05 } }, 5);
    expect(a.p).toBeCloseTo(0.85);
    expect(a.c).toBeCloseTo(0.7);
  });
});
