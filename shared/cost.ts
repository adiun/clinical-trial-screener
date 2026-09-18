// Jev 1.13 list price from https://docs.typesafe.ai/models : $0.042 per million
// input tokens; output tokens are free. Kept in one place so the estimate is
// easy to correct when pricing moves.
export const JEV_USD_PER_MILLION_INPUT_TOKENS = 0.042;

export function estimateJevCostUsd(inputTokens: number): number {
  return (inputTokens / 1_000_000) * JEV_USD_PER_MILLION_INPUT_TOKENS;
}
