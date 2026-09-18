import type { Answer, Criterion } from "../../shared/types.js";

/** What Jev sees for one note. Never contains `truth`. */
export interface NoteState {
  note: string;
  patient?: { age?: number; sex?: "M" | "F" };
}

export interface EvaluateResult {
  /** Answers keyed by criterion id. */
  answers: Record<string, Answer>;
  latencyMs: number;
  inputTokens: number;
  model: string;
  /** Rate-limit related headers observed on this response, if any. */
  rateLimitHeaders: Record<string, string>;
}

export class RateLimited extends Error {
  constructor(public readonly retryAfterMs: number, message = "rate limited") {
    super(message);
    this.name = "RateLimited";
  }
}

/**
 * The single seam between the app and Jev. The real client and the mock
 * implement this so the runner cannot tell them apart.
 */
export interface EvaluateOptions {
  /**
   * Whether the transport may retry a failed request (429, 5xx, network)
   * before reporting it. Off means one attempt: the failure surfaces at once
   * instead of adding seconds of backoff to the run.
   */
  retries: boolean;
}

export interface JevClient {
  readonly mode: "mock" | "live";
  readonly model: string;
  /** One systemOne call for one note, asking exactly the given criteria. */
  evaluate(noteId: string, state: NoteState, criteria: readonly Criterion[], signal?: AbortSignal, opts?: EvaluateOptions): Promise<EvaluateResult>;
}
