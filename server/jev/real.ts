import { RateLimitError, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Criterion } from "../../shared/types.js";
import { buildQuestions, toAnswer, toEntry, type RawJevAnswer } from "./questions.js";
import { RateLimited, type EvaluateResult, type JevClient, type NoteState } from "./types.js";

const RATE_HEADER = /^(x-)?ratelimit|^retry-after/i;

export class RealJevClient implements JevClient {
  readonly mode = "live" as const;
  readonly model: string;
  private readonly client: TypeSafeClient;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new TypeSafeClient({
      apiKey,
      defaultModel: model,
      logLevel: "error",
      // The SDK already retries 429/5xx with backoff and honors Retry-After.
      // Keep its retries modest; the runner adds a global pause on 429 so the
      // whole pool backs off together instead of 50 workers retrying at once.
      retry: { maxRetries: 2, backoffInitialMs: 250, backoffMaxMs: 4000 },
      timeout: 15_000,
    });
  }

  async evaluate(_noteId: string, state: NoteState, criteria: readonly Criterion[], signal?: AbortSignal): Promise<EvaluateResult> {
    const questions = buildQuestions(criteria);
    const t0 = performance.now();
    try {
      const { data, response } = await this.client
        .systemOne({ state: toEntry(state), questions, model: this.model }, signal ? { signal } : {})
        .withResponse();
      const latencyMs = performance.now() - t0;
      const rateLimitHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        if (RATE_HEADER.test(k)) rateLimitHeaders[k] = v;
      });
      const answers: EvaluateResult["answers"] = {};
      for (const c of criteria) {
        const raw = (data.answers as Record<string, RawJevAnswer | undefined>)[c.id];
        if (!raw) continue;
        answers[c.id] = toAnswer(c, raw, latencyMs);
      }
      return { answers, latencyMs, inputTokens: data.usage.input_tokens, model: data.model, rateLimitHeaders };
    } catch (err) {
      if (err instanceof RateLimitError) {
        throw new RateLimited(err.retryAfterMs ?? 1000, err.message);
      }
      throw err;
    }
  }
}
