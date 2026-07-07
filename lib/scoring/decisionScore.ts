export type DecisionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DecisionScoreInput {
  investedAmount: number;
  currentValue: number;
  benchmarkCurrentValue: number;
}

export interface DecisionScoreResult {
  actualReturnPct: number;
  benchmarkReturnPct: number;
  excessReturnPct: number;
  grade: DecisionGrade;
}

function pct(current: number, initial: number): number {
  if (initial === 0) return 0;
  return (current - initial) / initial;
}

export function gradeExcessReturn(excessReturnPct: number): DecisionGrade {
  if (excessReturnPct >= 0.2) return 'A';
  if (excessReturnPct >= 0.05) return 'B';
  if (excessReturnPct >= -0.05) return 'C';
  if (excessReturnPct >= -0.2) return 'D';
  return 'F';
}

export function scoreDecision(input: DecisionScoreInput): DecisionScoreResult {
  const actualReturnPct = pct(input.currentValue, input.investedAmount);
  const benchmarkReturnPct = pct(input.benchmarkCurrentValue, input.investedAmount);
  const excessReturnPct = actualReturnPct - benchmarkReturnPct;

  return {
    actualReturnPct,
    benchmarkReturnPct,
    excessReturnPct,
    grade: gradeExcessReturn(excessReturnPct),
  };
}
