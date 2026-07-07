export interface HistoricalPrice {
  symbol: string;
  date: string;
  close: number;
}

export interface MarketDataProvider {
  getLatestPrice(symbol: string): Promise<number>;
  getHistoricalClose(symbol: string, date: string): Promise<HistoricalPrice | null>;
}

export class MockMarketDataProvider implements MarketDataProvider {
  constructor(private readonly prices: Record<string, number>) {}

  async getLatestPrice(symbol: string): Promise<number> {
    const price = this.prices[symbol.toUpperCase()];
    if (price == null) throw new Error(`Missing mock price for ${symbol}`);
    return price;
  }

  async getHistoricalClose(symbol: string, date: string): Promise<HistoricalPrice | null> {
    const price = this.prices[symbol.toUpperCase()];
    if (price == null) return null;
    return { symbol: symbol.toUpperCase(), date, close: price };
  }
}
