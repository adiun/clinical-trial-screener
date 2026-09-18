// Anthropic list pricing, $ per million tokens (cached 2026-06-24 via the
// claude-api skill). Kept in one place so the estimate is easy to correct.
export const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function emptyUsage(): UsageTotals {
  return { inputTokens: 0, outputTokens: 0, costUsd: 0 };
}

export function addUsage(totals: UsageTotals, model: string, inputTokens: number, outputTokens: number): void {
  totals.inputTokens += inputTokens;
  totals.outputTokens += outputTokens;
  const price = PRICING[model] ?? PRICING["claude-sonnet-5"];
  if (!price) return;
  totals.costUsd += (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
