import { describe, expect, it } from 'vitest';
import { computeHoldings, summarizeByOwner } from '@/lib/accounting/holdings';
import type { LedgerTransaction } from '@/lib/types/domain';

const txs: LedgerTransaction[] = [
  // 1. Partner 1 deposits $10,000
  {
    id: 'd1',
    type: 'DEPOSIT',
    tradeDate: '2021-01-01T00:00:00.000Z',
    grossAmount: 10000,
    allocations: [
      { ownerId: 'partner-1', percentage: 1.0, amount: 10000, quantity: 10000 },
    ],
  },
  // 2. Partner 2 deposits $10,000
  {
    id: 'd2',
    type: 'DEPOSIT',
    tradeDate: '2021-02-01T00:00:00.000Z',
    grossAmount: 10000,
    allocations: [
      { ownerId: 'partner-2', percentage: 1.0, amount: 10000, quantity: 10000 },
    ],
  },
  // 3. Pool buys 20 shares of amzn for $2,000 (no partner allocations saved)
  {
    id: 'b1',
    type: 'BUY',
    tradeDate: '2021-03-01T00:00:00.000Z',
    assetId: 'amzn',
    quantity: 20,
    price: 100,
    grossAmount: 2000,
    allocations: [],
  },
];

describe('computeHoldings', () => {
  it('computes owner-level holdings based on current pool units share', () => {
    const holdings = computeHoldings(txs, { amzn: 150 }, ['partner-1', 'partner-2']);
    const partner1 = holdings.find((h) => h.ownerId === 'partner-1' && h.assetId === 'amzn');
    const partner2 = holdings.find((h) => h.ownerId === 'partner-2' && h.assetId === 'amzn');

    // Both partners have 50% pool share, so they should get 10 shares of amzn each (worth $1500)
    expect(partner1?.quantity).toBe(10);
    expect(partner1?.costBasis).toBe(1000);
    expect(partner1?.marketValue).toBe(1500);

    expect(partner2?.quantity).toBe(10);
    expect(partner2?.costBasis).toBe(1000);
    expect(partner2?.marketValue).toBe(1500);

    const summary = summarizeByOwner(holdings);
    expect(summary.find((s) => s.ownerId === 'partner-1')?.marketValue).toBe(1500);
  });
});
