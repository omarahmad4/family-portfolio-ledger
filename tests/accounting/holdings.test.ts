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
      { ownerId: 'partner-1', percentage: 0.5, amount: 500, quantity: 5 },
      { ownerId: 'partner-2', percentage: 0.5, amount: 500, quantity: 5 },
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
    allocations: [{ ownerId: 'partner-1', percentage: 1, amount: 2000, quantity: 10 }],
  },
];

describe('computeHoldings', () => {
  it('computes owner-level holdings and summary values', () => {
    const holdings = computeHoldings(txs, { amzn: 300 });
    const partner1 = holdings.find((h) => h.ownerId === 'partner-1' && h.assetId === 'amzn');
    const partner2 = holdings.find((h) => h.ownerId === 'partner-2' && h.assetId === 'amzn');

    expect(partner1?.quantity).toBe(15);
    expect(partner1?.costBasis).toBe(2500);
    expect(partner1?.marketValue).toBe(4500);
    expect(partner2?.quantity).toBe(5);
    expect(partner2?.marketValue).toBe(1500);

    const summary = summarizeByOwner(holdings);
    expect(summary.find((s) => s.ownerId === 'partner-1')?.marketValue).toBe(4500);
  });
});
