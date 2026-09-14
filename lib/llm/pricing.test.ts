import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from './pricing';

describe('estimateCostUsd', () => {
  it('Haiku 요금 계산 (프롬프트 $1/1M, 완료 $5/1M)', () => {
    const cost = estimateCostUsd('anthropic/claude-haiku-4.5', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(6, 6);
  });

  it('Sonnet 요금 계산 (프롬프트 $2/1M, 완료 $10/1M)', () => {
    const cost = estimateCostUsd('anthropic/claude-sonnet-5', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(12, 6);
  });

  it('토큰 0개면 비용 0', () => {
    expect(estimateCostUsd('anthropic/claude-haiku-4.5', 0, 0)).toBe(0);
  });

  it('모르는 모델이면 null 반환', () => {
    expect(estimateCostUsd('unknown/model', 100, 100)).toBeNull();
  });
});
