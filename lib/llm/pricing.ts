// OpenRouter 요금표를 수동으로 반영한 값 (2026-09 기준, USD / 100만 토큰).
// 프로모션 등으로 실제 가격이 바뀔 수 있어 근사치로만 사용할 것.
const MODEL_PRICING_PER_MILLION_TOKENS: Record<string, { prompt: number; completion: number }> = {
  'anthropic/claude-haiku-4.5': { prompt: 1, completion: 5 },
  'anthropic/claude-sonnet-5': { prompt: 2, completion: 10 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = MODEL_PRICING_PER_MILLION_TOKENS[model];

  if (!pricing) {
    return null;
  }

  return (inputTokens * pricing.prompt + outputTokens * pricing.completion) / 1_000_000;
}
