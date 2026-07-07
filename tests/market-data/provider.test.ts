import { describe, expect, it } from 'vitest';
import { normalizeSymbol } from '../../lib/market-data/provider';

describe('Market Data Symbol Normalizer', () => {
  it('correctly maps standard stock symbols and crypto symbols to Yahoo tickers', () => {
    expect(normalizeSymbol('AMZN')).toBe('AMZN');
    expect(normalizeSymbol('AAPL')).toBe('AAPL');
    expect(normalizeSymbol('btc')).toBe('BTC-USD');
    expect(normalizeSymbol('ETH  ')).toBe('ETH-USD');
    expect(normalizeSymbol('SPY')).toBe('SPY');
  });
});
