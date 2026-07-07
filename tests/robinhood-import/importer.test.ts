import { describe, expect, it } from 'vitest';
import { normalizeRobinhoodRow } from '../../lib/robinhood-import/normalize';

describe('Robinhood CSV Parser Normalization', () => {
  const mockAssets = [{ id: 'a1', symbol: 'AMZN' }];
  const defaultAllocations = [{ ownerId: 'omar', percentage: 1.0 }];

  it('correctly maps stock BUY rows from Robinhood format', () => {
    const rawRow = {
      'Symbol': 'AMZN',
      'Activity Type': 'Buy',
      'Trade Date': '2021-03-12',
      'Quantity': '10',
      'Price': '$100.00',
      'Amount': '$1,000.00',
    };

    const norm = normalizeRobinhoodRow(rawRow, {
      accountId: 'acc1',
      defaultAllocations,
      assetLookup: (sym) => mockAssets.find((a) => a.symbol === sym),
    });

    expect(norm).not.toBeNull();
    expect(norm!.type).toBe('BUY');
    expect(norm!.tradeDate).toBe(new Date('2021-03-12').toISOString());
    expect(norm!.assetId).toBe('a1');
    expect(norm!.quantity).toBe(10);
    expect(norm!.price).toBe(100);
    expect(norm!.grossAmount).toBe(1000);
  });

  it('correctly parses deposits with single owner allocation', () => {
    const rawRow = {
      'Activity Type': 'Deposit',
      'Trade Date': '2021-01-01',
      'Amount': '$5,000.00',
    };

    const norm = normalizeRobinhoodRow(rawRow, {
      accountId: 'acc1',
      defaultAllocations,
      assetLookup: () => undefined,
    });

    expect(norm).not.toBeNull();
    expect(norm!.type).toBe('DEPOSIT');
    expect(norm!.assetId).toBeUndefined();
    expect(norm!.grossAmount).toBe(5000);
    expect(norm!.allocations[0].ownerId).toBe('omar');
    expect(norm!.allocations[0].percentage).toBe(1.0);
  });

  it('returns null on malformed or missing trade dates', () => {
    const rawRow = {
      'Symbol': 'AMZN',
      'Activity Type': 'Buy',
      'Trade Date': 'invalid-date-string',
      'Amount': '100',
    };

    const norm = normalizeRobinhoodRow(rawRow, {
      accountId: 'acc1',
      defaultAllocations,
      assetLookup: () => undefined,
    });

    expect(norm).toBeNull();
  });
});
