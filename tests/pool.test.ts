import { describe, expect, it } from "vitest";
import { PauseGate, runPool } from "../server/pool.js";

describe("runPool", () => {
  it("never exceeds the concurrency bound and processes every item", async () => {
    let inFlight = 0;
    let peak = 0;
    const seen: number[] = [];
    await runPool(Array.from({ length: 40 }, (_, i) => i), { concurrency: 5 }, async (item) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2 + Math.random() * 5));
      seen.push(item);
      inFlight--;
    });
    expect(peak).toBeLessThanOrEqual(5);
    expect(seen.sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i));
  });

  it("pauses every lane while the gate is closed", async () => {
    const gate = new PauseGate();
    const starts: number[] = [];
    const t0 = Date.now();
    gate.pause(60);
    await runPool([1, 2, 3], { concurrency: 3, gate }, async () => {
      starts.push(Date.now() - t0);
    });
    for (const s of starts) expect(s).toBeGreaterThanOrEqual(55);
    expect(gate.pauseCount).toBe(1);
  });

  it("stops picking up new items once aborted", async () => {
    const ac = new AbortController();
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6], { concurrency: 1, signal: ac.signal }, async (item) => {
      done.push(item);
      if (item === 2) ac.abort();
    });
    expect(done).toEqual([1, 2]);
  });
});
