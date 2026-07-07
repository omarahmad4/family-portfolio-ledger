import { describe, expect, it } from 'vitest';
import { computeHoldings, summarizeByOwner } from '@/lib/accounting/holdings';
import type { LedgerTransaction } from '@/lib/types/domain';

const txs: LedgerTransaction[] = [
  {
    id: 't1',
    type: 'BUY',
    tradeDate: '2021-01-01T00:00:00.000Z',
    assetId: 'amzn',
    quantity: 10,
    price: 100,
    grossAmount: 1000,
    allocations: [
      { ownerId: 'omar', percentage: 0.5, amount: 500, quantity: 5 },
      { ownerId: 'mom', percentage: 0.5, amount: 500, quantity: 5 },
    ],
  },
  {
    id: 't2',
    type: 'BUY',
    tradeDate: '2021-02-01T00:00:00.000Z',
    assetId: 'amzn',
    quantity: 10,
    price: 200,
    grossAmount: 2000,
    allocations: [{ ownerId: 'omar', percentage: 1, amount: 2000, quantity: 10 }],
  },
];

describe('computeHoldings', () => {
  it('computes owner-level holdings and summary values', () => {
    const holdings = computeHoldings(txs, { amzn: 300 });
    const omar = holdings.find((h) => h.ownerId === 'omar' && h.assetId === 'amzn');
    const mom = holdings.find((h) => h.ownerId === 'mom' && h.assetId === 'amzn');

    expect(omar?.quantity).toBe(15);
    expect(omar?.costBasis).toBe(2500);
    expect(omar?.marketValue).toBe(4500);
    expect(mom?.quantity).toBe(5);
    expect(mom?.marketValue).toBe(1500);

    const summary = summarizeByOwner(holdings);
    expect(summary.find((s) => s.ownerId === 'omar')?.marketValue).toBe(4500);
  });
});
