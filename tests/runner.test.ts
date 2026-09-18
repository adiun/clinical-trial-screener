import { describe, expect, it } from "vitest";
import { Store } from "../server/db.js";
import { MockJevClient } from "../server/jev/mock.js";
import { DEFAULT_CRITERIA, DEFAULT_PROTOCOL } from "../server/protocol.js";
import { Runner } from "../server/runner.js";
import { SseHub } from "../server/sse.js";
import type { SseEvent } from "../shared/types.js";
import fs from "node:fs";

function fixtureNotes(count: number) {
  const lines = fs
    .readFileSync(new URL("./fixtures/notes.sample.jsonl", import.meta.url), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as { id: string; text: string; format: string; truth: never });
  return Array.from({ length: count }, (_, i) => ({ ...lines[i % lines.length]!, id: `T-${i}` }));
}

function setup(opts: { rateLimitRate?: number } = {}) {
  const store = new Store(":memory:");
  store.upsertProtocol(DEFAULT_PROTOCOL);
  store.replaceCriteria(DEFAULT_PROTOCOL.id, DEFAULT_CRITERIA);
  store.replaceNotes(fixtureNotes(60));
  const hub = new SseHub();
  const events: SseEvent[] = [];
  const original = hub.send.bind(hub);
  hub.send = (ev: SseEvent) => {
    events.push(ev);
    original(ev);
  };
  const jev = new MockJevClient({ minLatencyMs: 0, maxLatencyMs: 2, ...opts });
  const runner = new Runner(store, jev, hub, 8);
  return { store, runner, events };
}

describe("Runner", () => {
  it("streams one note event per note and records percentiles", async () => {
    const { store, runner, events } = setup();
    const stats = await runner.run(store.getProtocol(DEFAULT_PROTOCOL.id)!, { threshold: 0.6, trigger: "run" });
    expect(events.filter((e) => e.type === "note")).toHaveLength(60);
    expect(stats.apiCalls).toBe(60);
    expect(stats.p50).not.toBeNull();
    expect(stats.errors).toBe(0);
    expect(store.decisionsForRun(stats.runId)).toHaveLength(60 * DEFAULT_CRITERIA.length);
  });

  it("serves a second run entirely from cache", async () => {
    const { store, runner, events } = setup();
    const protocol = store.getProtocol(DEFAULT_PROTOCOL.id)!;
    await runner.run(protocol, { threshold: 0.6, trigger: "run" });
    events.length = 0;
    const stats = await runner.run(protocol, { threshold: 0.6, trigger: "run" });
    expect(stats.apiCalls).toBe(0);
    expect(stats.cachedNotes).toBe(60);
    const start = events.find((e) => e.type === "run-start");
    expect(start && start.type === "run-start" ? start.toAsk : -1).toBe(0);
  });

  it("re-asks only the edited criterion", async () => {
    const { store, runner, events } = setup();
    await runner.run(store.getProtocol(DEFAULT_PROTOCOL.id)!, { threshold: 0.6, trigger: "run" });
    store.updateCriterion("c_metformin", { question: "is the patient on metformin today?" });
    events.length = 0;
    const stats = await runner.run(store.getProtocol(DEFAULT_PROTOCOL.id)!, { threshold: 0.6, trigger: "edit" });
    const start = events.find((e) => e.type === "run-start");
    expect(start && start.type === "run-start" ? start.criterionIds : []).toEqual(["c_metformin"]);
    expect(stats.apiCalls).toBe(60);
    const note = events.find((e) => e.type === "note");
    if (!note || note.type !== "note") throw new Error("no note event");
    expect(note.answers["c_metformin"]?.cached).toBe(false);
    expect(note.answers["c_t2d"]?.cached).toBe(true);
  });

  it("pauses the pool on simulated 429s and still finishes every note", async () => {
    const { store, runner, events } = setup({ rateLimitRate: 0.2 });
    const stats = await runner.run(store.getProtocol(DEFAULT_PROTOCOL.id)!, { threshold: 0.6, trigger: "run" });
    expect(events.filter((e) => e.type === "note")).toHaveLength(60);
    expect(stats.rateLimitPauses).toBeGreaterThan(0);
    expect(stats.errors).toBe(0);
    expect(events.some((e) => e.type === "rate-limit")).toBe(true);
  }, 20_000);
});
