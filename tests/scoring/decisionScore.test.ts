import { describe, expect, it } from 'vitest';
import { BenchmarkType } from '@prisma/client';
import { gradeExcessReturn, scoreTransactionDecision } from '../../lib/scoring/decisionScore';
import type { LedgerTransaction } from '../../lib/types/domain';
import type { MarketDataProvider } from '../../lib/market-data/provider';

class MockProvider implements MarketDataProvider {
  constructor(
    private readonly latestPrices: Record<string, number>,
    private readonly historicalPrices: Record<string, number>
  ) {}

  async getLatestPrice(symbol: string): Promise<number> {
    return this.latestPrices[symbol.toUpperCase()] ?? 0;
  }

  async getHistoricalClose(symbol: string, date: string): Promise<{ symbol: string; date: string; close: number } | null> {
    const key = `${symbol.toUpperCase()}:${date}`;
    const close = this.historicalPrices[key] ?? 100; // default to 100 to avoid nulls
    return { symbol: symbol.toUpperCase(), date, close };
  }
}

describe('Decision Scoring Engine', () => {
  it('correctly grades excess returns based on threshold brackets', () => {
    expect(gradeExcessReturn(0.06)).toBe('A');
    expect(gradeExcessReturn(0.02)).toBe('B');
    expect(gradeExcessReturn(-0.02)).toBe('B');
    expect(gradeExcessReturn(-0.10)).toBe('C');
    expect(gradeExcessReturn(-0.20)).toBe('D');
    expect(gradeExcessReturn(-0.30)).toBe('F');
  });

  it('correctly scores an active buy decision against a benchmark index', async () => {
    // Omar buys 10 AAPL at $100 ($1,000 invested) on '2021-01-01'.
    // Benchmark index (SPY) was at $200 at buy date.
    // Benchmark units = 1000 / 200 = 5 units SPY.
    const buyTx: LedgerTransaction = {
      id: 'tx_buy',
      type: 'BUY',
      tradeDate: '2021-01-01T00:00:00.000Z',
      assetId: 'AAPL',
      quantity: 10,
      price: 100,
      grossAmount: 1000,
      allocations: [{ ownerId: 'omar', percentage: 1.0, amount: 1000, quantity: 10 }],
    };

    // Current State:
    // AAPL has gone to $150 ($1,500 value, +50% return).
    // SPY benchmark has gone to $250 ($250 * 5 units = $1,250 value, +25% return).
    // Excess return = 50% - 25% = 25% (+0.25, Grade A).
    const latest = { AAPL: 150, SPY: 250 };
    const historical = { 'SPY:2021-01-01': 200 };
    const provider = new MockProvider(latest, historical);

    const result = await scoreTransactionDecision(buyTx, [buyTx], provider, BenchmarkType.SPY);
    expect(result).not.toBeNull();
    expect(result!.actualReturnPct).toBeCloseTo(0.50);
    expect(result!.benchmarkReturnPct).toBeCloseTo(0.25);
    expect(result!.excessReturnPct).toBeCloseTo(0.25);
    expect(result!.grade).toBe('A');
  });
});
