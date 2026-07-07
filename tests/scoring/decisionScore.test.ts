import { describe, expect, it } from 'vitest';
import { scoreDecision } from '@/lib/scoring/decisionScore';

describe('scoreDecision', () => {
  it('grades excess return vs benchmark', () => {
    const result = scoreDecision({ investedAmount: 1000, currentValue: 1500, benchmarkCurrentValue: 1200 });
    expect(result.actualReturnPct).toBe(0.5);
    expect(result.benchmarkReturnPct).toBe(0.2);
    expect(result.excessReturnPct).toBeCloseTo(0.3);
    expect(result.grade).toBe('A');
  });
});
