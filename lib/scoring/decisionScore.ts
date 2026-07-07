/**
 * @file decisionScore.ts
 * @description Decision grading engine. Evaluates the performance of a buy decision (transaction cohort)
 * against a benchmark (e.g., SPY or QQQ) by tracking both remaining holdings and historically realized trims.
 */

import { BenchmarkType } from '@prisma/client';
import { buildFifoLots } from '../accounting/lots';
import type { LedgerTransaction } from '../types/domain';
import type { MarketDataProvider } from '../market-data/provider';

export type DecisionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DecisionScoreResult {
  actualValue: number;
  benchmarkValue: number;
  actualReturnPct: number;
  benchmarkReturnPct: number;
  excessReturnPct: number;
  grade: DecisionGrade;
}

function pct(current: number, initial: number): number {
  if (initial === 0) return 0;
  return (current - initial) / initial;
}

/**
 * Assigns a grade based on the excess return percentage (alpha) relative to the benchmark.
 */
export function gradeExcessReturn(excessReturnPct: number): DecisionGrade {
  if (excessReturnPct >= 0.20) return 'A';   // Beat benchmark by >= 20%
  if (excessReturnPct >= 0.05) return 'B';   // Beat benchmark by 5% to 20%
  if (excessReturnPct >= -0.05) return 'C';  // Aligned with benchmark within +/- 5%
  if (excessReturnPct >= -0.20) return 'D';  // Underperformed benchmark by 5% to 20%
  return 'F';                               // Underperformed by > 20%
}

/**
 * Grades a single BUY transaction decision against a chosen benchmark.
 * Resolves opportunity cost for both active holdings and historically realized sales.
 * 
 * @param tx The BUY transaction to score
 * @param allTransactions All ledger transactions
 * @param provider Pricing data provider
 * @param benchmark Benchmark index symbol (SPY, QQQ)
 */
export async function scoreTransactionDecision(
  tx: LedgerTransaction,
  allTransactions: LedgerTransaction[],
  provider: MarketDataProvider,
  benchmark: BenchmarkType
): Promise<DecisionScoreResult | null> {
  if (tx.type !== 'BUY' || !tx.assetId) {
    return null;
  }

  // 1. Build lots to match trims/sells chronologically
  const lots = buildFifoLots(allTransactions);
  const matchingLots = lots.filter((lot) => lot.sourceTransactionId === tx.id);
  if (matchingLots.length === 0) {
    return null;
  }

  const buyDate = tx.tradeDate.split('T')[0];
  const assetSymbol = tx.assetId; // assetId acts as ticker in standard transactions

  // 2. Fetch prices at buy date
  const assetPriceBuy = tx.price ?? (tx.grossAmount / (tx.quantity ?? 1));
  const benchmarkClose = await provider.getHistoricalClose(benchmark.toString(), buyDate);
  const benchmarkPriceBuy = benchmarkClose ? benchmarkClose.close : 1.0;

  // 3. Fetch latest current prices
  const assetPriceCurrent = await provider.getLatestPrice(assetSymbol);
  const benchmarkPriceCurrent = await provider.getLatestPrice(benchmark.toString());

  let totalInvested = 0;
  let totalActualValue = 0;
  let totalBenchmarkValue = 0;

  for (const lot of matchingLots) {
    const invested = lot.originalCostBasis;
    totalInvested += invested;

    // A. Actual Value (remaining position + actual proceeds from trims)
    const valActive = lot.remainingQuantity * assetPriceCurrent;
    const valRealized = lot.realizedProceeds;
    totalActualValue += (valActive + valRealized);

    // B. Benchmark Equivalent Value
    // Value of remaining benchmark units
    const unitsRemaining = lot.costBasis / benchmarkPriceBuy;
    const valBenchmarkActive = unitsRemaining * benchmarkPriceCurrent;

    // Value of realized benchmark units at their respective sell dates
    let valBenchmarkRealized = 0;
    for (const sale of lot.sales) {
      // Find benchmark price on sell date
      const sellDate = sale.sellDate.split('T')[0];
      const benchmarkCloseSell = await provider.getHistoricalClose(benchmark.toString(), sellDate);
      const benchmarkPriceSell = benchmarkCloseSell ? benchmarkCloseSell.close : benchmarkPriceCurrent;

      const costBasisSold = sale.quantity * (lot.originalCostBasis / lot.originalQuantity);
      const unitsSold = costBasisSold / benchmarkPriceBuy;
      const benchmarkProceeds = unitsSold * benchmarkPriceSell;
      valBenchmarkRealized += benchmarkProceeds;
    }

    totalBenchmarkValue += (valBenchmarkActive + valBenchmarkRealized);
  }

  if (totalInvested === 0) return null;

  const actualReturnPct = pct(totalActualValue, totalInvested);
  const benchmarkReturnPct = pct(totalBenchmarkValue, totalInvested);
  const excessReturnPct = actualReturnPct - benchmarkReturnPct;

  return {
    actualValue: totalActualValue,
    benchmarkValue: totalBenchmarkValue,
    actualReturnPct,
    benchmarkReturnPct,
    excessReturnPct,
    grade: gradeExcessReturn(excessReturnPct),
  };
}
