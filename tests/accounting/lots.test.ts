import { describe, expect, it } from 'vitest';
import { buildFifoLots } from '@/lib/accounting/lots';
import type { LedgerTransaction } from '@/lib/types/domain';

describe('buildFifoLots', () => {
  it('reduces earliest lots first on sale', () => {
    const txs: LedgerTransaction[] = [
      { id: 'b1', type: 'BUY', tradeDate: '2021-01-01T00:00:00.000Z', assetId: 'aapl', quantity: 10, grossAmount: 1000, allocations: [{ ownerId: 'omar', percentage: 1, amount: 1000, quantity: 10 }] },
      { id: 'b2', type: 'BUY', tradeDate: '2021-02-01T00:00:00.000Z', assetId: 'aapl', quantity: 10, grossAmount: 2000, allocations: [{ ownerId: 'omar', percentage: 1, amount: 2000, quantity: 10 }] },
      { id: 's1', type: 'SELL', tradeDate: '2021-03-01T00:00:00.000Z', assetId: 'aapl', quantity: 12, grossAmount: 2400, allocations: [{ ownerId: 'omar', percentage: 1, amount: 2400, quantity: 12 }] },
    ];

    const lots = buildFifoLots(txs);
    expect(lots[0].remainingQuantity).toBe(0);
    expect(lots[1].remainingQuantity).toBe(8);
    expect(lots[0].realizedGainLoss).toBe(1000);
  });

  it('adjusts lot quantities correctly on stock splits', () => {
    const txs: LedgerTransaction[] = [
      { id: 'b1', type: 'BUY', tradeDate: '2021-01-01T00:00:00.000Z', assetId: 'aapl', quantity: 10, grossAmount: 1000, allocations: [{ ownerId: 'omar', percentage: 1, amount: 1000, quantity: 10 }] },
      { id: 'sp1', type: 'SPLIT', tradeDate: '2021-02-01T00:00:00.000Z', assetId: 'aapl', quantity: 4, grossAmount: 0, allocations: [{ ownerId: 'omar', percentage: 1, amount: 0, quantity: 4 }] },
      { id: 's1', type: 'SELL', tradeDate: '2021-03-01T00:00:00.000Z', assetId: 'aapl', quantity: 15, grossAmount: 1500, allocations: [{ ownerId: 'omar', percentage: 1, amount: 1500, quantity: 15 }] },
    ];

    const lots = buildFifoLots(txs);
    // After 4-for-1 split, initial lot has 40 shares, cost basis is still $1000
    expect(lots[0].originalQuantity).toBe(40);
    expect(lots[0].remainingQuantity).toBe(25); // 40 - 15 sold = 25
    expect(lots[0].costBasis).toBeCloseTo(625); // 1000 - (1000/40 * 15) = 625
    expect(lots[0].realizedGainLoss).toBeCloseTo(1125);
  });
});

