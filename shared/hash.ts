// FNV-1a 64-bit hash over the fields that change what Jev is asked.
// Pure and dependency-free so it runs identically in Node and the browser.

export interface HashableCriterion {
  primitive: "noul" | "score";
  question: string;
  trueDescription: string | null;
  falseDescription: string | null;
  levels: string[] | null;
  metLevels: number[] | null;
}

export function criterionHash(c: HashableCriterion): string {
  const payload = JSON.stringify([
    c.primitive,
    c.question.trim(),
    c.trueDescription?.trim() ?? null,
    c.falseDescription?.trim() ?? null,
    c.levels?.map((l) => l.trim()) ?? null,
    c.metLevels ? [...c.metLevels].sort((a, b) => a - b) : null,
  ]);
  return fnv1a64(payload);
}

export function fnv1a64(input: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}
