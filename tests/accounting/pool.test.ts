import { describe, expect, it } from 'vitest';
import {
  calculatePortfolioValue,
  calculateTotalUnits,
  calculateOwnerUnits,
  calculateNetCash,
  calculateAssetQuantities,
  getOwnerShares,
  TransactionInput,
} from '../../lib/accounting/pool';

describe('Unitized Pool Math Engine', () => {
  it('correctly calculates units and value on simple cash deposits', () => {
    const txs: TransactionInput[] = [
      {
        id: 'tx1',
        type: 'DEPOSIT',
        tradeDate: '2021-01-01T00:00:00.000Z',
        grossAmount: 10000,
        allocations: [
          { ownerId: 'partner-1', percentage: 1.0, amount: 10000, quantity: 10000 },
        ],
      },
      {
        id: 'tx2',
        type: 'DEPOSIT',
        tradeDate: '2021-02-01T00:00:00.000Z',
        grossAmount: 5000,
        allocations: [
          { ownerId: 'partner-2', percentage: 1.0, amount: 5000, quantity: 5000 },
        ],
      },
    ];

    const totalUnits = calculateTotalUnits(txs);
    expect(totalUnits).toBe(15000);

    const ownerUnits = calculateOwnerUnits(txs);
    expect(ownerUnits['partner-1']).toBe(10000);
    expect(ownerUnits['partner-2']).toBe(5000);

    const netCash = calculateNetCash(txs);
    expect(netCash).toBe(15000);

    const shares = getOwnerShares(txs, ['partner-1', 'partner-2', 'partner-3']);
    expect(shares['partner-1']).toBeCloseTo(0.666667);
    expect(shares['partner-2']).toBeCloseTo(0.333333);
    expect(shares['partner-3']).toBe(0);
  });

  it('correctly adjusts NAVPU and owner percentages after asset value changes', () => {
    // 1. Partner 1 deposits $10,000
    // 2. Partner 2 deposits $8,000
    // 3. Buy 50 AMZN at $100 ($5,000)
    // 4. Asset value changes (AMZN goes to $130, market value $6,500)
    // 5. Partner 3 deposits $6,000
    const txs: TransactionInput[] = [
      {
        id: 'd1',
        type: 'DEPOSIT',
        tradeDate: '2021-01-01T00:00:00.000Z',
        grossAmount: 10000,
        allocations: [{ ownerId: 'partner-1', percentage: 1.0, amount: 10000, quantity: 10000 }],
      },
      {
        id: 'd2',
        type: 'DEPOSIT',
        tradeDate: '2021-02-01T00:00:00.000Z',
        grossAmount: 8000,
        allocations: [{ ownerId: 'partner-2', percentage: 1.0, amount: 8000, quantity: 8000 }],
      },
      {
        id: 'b1',
        type: 'BUY',
        tradeDate: '2021-03-12T00:00:00.000Z',
        assetSymbol: 'AMZN',
        quantity: 50,
        price: 100,
        grossAmount: 5000,
        allocations: [
          { ownerId: 'partner-1', percentage: 10000 / 18000, amount: 5000 * (10000 / 18000), quantity: 50 * (10000 / 18000) },
          { ownerId: 'partner-2', percentage: 8000 / 18000, amount: 5000 * (8000 / 18000), quantity: 50 * (8000 / 18000) },
        ],
      },
    ];

    // Valuation before Partner 3's deposit (AMZN at $130)
    // Cash balance is: $10k + $8k - $5k = $13k
    // AMZN is: 50 * $130 = $6,500
    // Total value: $19,500
    const prices = { AMZN: 130 };
    const valueBefore = calculatePortfolioValue(txs, prices);
    expect(valueBefore).toBe(19500);

    const totalUnitsBefore = calculateTotalUnits(txs);
    expect(totalUnitsBefore).toBe(18000);

    const navpuBefore = valueBefore / totalUnitsBefore; // 19500 / 18000 = 1.083333
    expect(navpuBefore).toBeCloseTo(1.083333);

    // Partner 3 deposits $6,000 on '2023-09-15'
    const partner3Units = 6000 / navpuBefore; // 6000 / 1.083333 = 5538.46
    const txsWithPartner3: TransactionInput[] = [
      ...txs,
      {
        id: 'd3',
        type: 'DEPOSIT',
        tradeDate: '2023-09-15T00:00:00.000Z',
        grossAmount: 6000,
        allocations: [{ ownerId: 'partner-3', percentage: 1.0, amount: 6000, quantity: partner3Units }],
      },
    ];

    const totalUnitsAfter = calculateTotalUnits(txsWithPartner3);
    expect(totalUnitsAfter).toBeCloseTo(18000 + partner3Units);

    const finalShares = getOwnerShares(txsWithPartner3, ['partner-1', 'partner-2', 'partner-3']);
    expect(finalShares['partner-1']).toBeCloseTo(10000 / (18000 + partner3Units)); // ~42.48%
    expect(finalShares['partner-2']).toBeCloseTo(8000 / (18000 + partner3Units));  // ~34.00%
    expect(finalShares['partner-3']).toBeCloseTo(partner3Units / (18000 + partner3Units));  // ~25.53%
  });

  it('correctly handles non-cash asset quantities', () => {
    const txs: TransactionInput[] = [
      {
        id: 'b1',
        type: 'BUY',
        tradeDate: '2021-01-01T00:00:00.000Z',
        assetSymbol: 'AAPL',
        quantity: 10,
        grossAmount: 1000,
        allocations: [],
      },
      {
        id: 's1',
        type: 'SPLIT',
        tradeDate: '2021-02-01T00:00:00.000Z',
        assetSymbol: 'AAPL',
        quantity: 4, // 4-for-1 split
        grossAmount: 0,
        allocations: [],
      },
      {
        id: 'b2',
        type: 'BUY',
        tradeDate: '2021-03-01T00:00:00.000Z',
        assetSymbol: 'AAPL',
        quantity: 5,
        grossAmount: 600,
        allocations: [],
      },
    ];

    const quantities = calculateAssetQuantities(txs);
    expect(quantities.AAPL).toBe(45); // (10 * 4) + 5 = 45 shares
  });
});
