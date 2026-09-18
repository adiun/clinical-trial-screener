import type { AppState, ClaudeStatus, Criterion, CriterionInput, EvalReport, Protocol } from "../../shared/types.js";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!res.ok) throw new ApiError(body.error ?? `${res.status} ${res.statusText}`, res.status);
  return body;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  state: () => request<AppState>("/api/state"),
  run: (threshold: number, trigger: "run" | "edit", force = false) =>
    request<{ ok: boolean }>("/api/run", { method: "POST", body: JSON.stringify({ threshold, trigger, force }) }),
  cancel: () => request<{ ok: boolean }>("/api/run/cancel", { method: "POST" }),
  importNotes: () => request<{ ok: boolean; imported?: number; skipped?: number; error?: string }>("/api/import", { method: "POST" }),
  updateCriterion: (id: string, patch: Partial<CriterionInput>) =>
    request<Criterion>(`/api/criteria/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  addCriterion: (input: CriterionInput) => request<Criterion>("/api/criteria", { method: "POST", body: JSON.stringify(input) }),
  deleteCriterion: (id: string) => request<{ ok: boolean }>(`/api/criteria/${encodeURIComponent(id)}`, { method: "DELETE" }),
  resetProtocol: () => request<Protocol>("/api/protocol/reset", { method: "POST" }),
  /** Cold start: clears the answer cache, all runs, and restores the default protocol. */
  resetAll: () => request<AppState>("/api/reset", { method: "POST" }),
  evalReport: (threshold: number) => request<EvalReport>(`/api/eval?threshold=${threshold}`),
  claudeStatus: () => request<ClaudeStatus>("/api/claude/status"),
  claudeCredentials: (apiKey: string | undefined, model: string | undefined) =>
    request<{ configured: boolean; model: string }>("/api/claude/credentials", { method: "POST", body: JSON.stringify({ apiKey, model }) }),
  claudeForget: () => request<{ configured: boolean }>("/api/claude/credentials", { method: "DELETE" }),
  compile: (description: string) => request<Protocol>("/api/claude/compile", { method: "POST", body: JSON.stringify({ description }) }),
  summary: (runId: string) => request<{ summary: string }>("/api/claude/summary", { method: "POST", body: JSON.stringify({ runId }) }),
  decisions: (runId: string) => request<{ decisions: unknown[] }>(`/api/runs/${encodeURIComponent(runId)}/decisions`),
};
