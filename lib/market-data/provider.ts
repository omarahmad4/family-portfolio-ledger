/**
 * @file provider.ts
 * @description Market data provider implementing the MarketDataProvider interface.
 * Connects to yahoo-finance2 and caching tables (Prisma) to fetch and store prices.
 */

import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { prisma } from '../db/prisma';

export interface HistoricalPrice {
  symbol: string;
  date: string;
  close: number;
}

export interface MarketDataProvider {
  getLatestPrice(symbol: string): Promise<number>;
  getHistoricalClose(symbol: string, date: string): Promise<HistoricalPrice | null>;
}

/**
 * Normalizes asset symbols to standard Yahoo Finance tickers.
 * E.g., crypto assets BTC and ETH are mapped to BTC-USD and ETH-USD.
 */
export function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  if (upper === 'BTC' || upper === 'ETH') {
    return `${upper}-USD`;
  }
  return upper;
}

export class YahooFinanceMarketDataProvider implements MarketDataProvider {
  /**
   * Fetches the latest price for a given symbol.
   * Leverages a 5-minute database cache to prevent rate limiting.
   */
  async getLatestPrice(symbol: string): Promise<number> {
    const normalized = normalizeSymbol(symbol);
    const upperSymbol = symbol.toUpperCase().trim();

    // 1. Resolve Asset ID
    const asset = await prisma.asset.findFirst({
      where: { symbol: upperSymbol },
    });
    if (!asset) {
      throw new Error(`Asset with symbol ${upperSymbol} not found in database.`);
    }

    // 2. Check 5-minute Cache for Quote (placeholder date '2000-01-01' for quotes)
    const quoteDate = new Date('2000-01-01T00:00:00.000Z');
    const cached = await prisma.price.findUnique({
      where: {
        assetId_date_source: {
          assetId: asset.id,
          date: quoteDate,
          source: 'yahoo-quote',
        },
      },
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (cached && cached.createdAt > fiveMinutesAgo) {
      return Number(cached.close);
    }

    // 3. Cache Miss - Query Yahoo Finance Quote
    let latestPrice: number;
    try {
      const quote = await yahooFinance.quote(normalized);
      const price = quote.regularMarketPrice ?? quote.regularMarketPreviousClose;
      if (price == null) {
        throw new Error(`No quote price returned from Yahoo Finance for ${normalized}`);
      }
      latestPrice = price;
    } catch (err) {
      console.warn(`Yahoo Finance quote query failed for ${normalized}. Falling back to cached price if available.`, err);
      if (cached) {
        return Number(cached.close);
      }
      throw err;
    }

    // 4. Update Database Cache
    await prisma.price.upsert({
      where: {
        assetId_date_source: {
          assetId: asset.id,
          date: quoteDate,
          source: 'yahoo-quote',
        },
      },
      create: {
        assetId: asset.id,
        date: quoteDate,
        close: latestPrice,
        source: 'yahoo-quote',
      },
      update: {
        close: latestPrice,
        createdAt: new Date(), // Reset TTL timestamp
      },
    });

    return latestPrice;
  }

  /**
   * Fetches the historical close price for a symbol on a specific date (YYYY-MM-DD).
   * Checks database first. If missing, queries historical ranges and caches the result.
   */
  async getHistoricalClose(symbol: string, date: string): Promise<HistoricalPrice | null> {
    const normalized = normalizeSymbol(symbol);
    const upperSymbol = symbol.toUpperCase().trim();
    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // 1. Resolve Asset ID
    const asset = await prisma.asset.findFirst({
      where: { symbol: upperSymbol },
    });
    if (!asset) {
      return null;
    }

    // 2. Check Database Cache
    const cached = await prisma.price.findFirst({
      where: {
        assetId: asset.id,
        date: targetDate,
        source: { in: ['yahoo', 'seed', 'manual'] },
      },
    });

    if (cached) {
      return {
        symbol: upperSymbol,
        date,
        close: Number(cached.close),
      };
    }

    // 3. Cache Miss - Query Yahoo Finance Historical Close
    // Query a 4-day window in case the target date falls on a weekend or holiday
    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate.getTime() + 4 * 24 * 60 * 60 * 1000);

    let historicalClose: number | null = null;
    try {
      const result = await yahooFinance.historical(normalized, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
      });

      if (result && result.length > 0) {
        // Grab the first available price inside our target window
        historicalClose = result[0].close ?? null;
      }
    } catch (err) {
      console.warn(`Yahoo Finance historical query failed for ${normalized} on date ${date}`, err);
    }

    if (historicalClose == null) {
      return null;
    }

    // 4. Save to Database Cache
    await prisma.price.upsert({
      where: {
        assetId_date_source: {
          assetId: asset.id,
          date: targetDate,
          source: 'yahoo',
        },
      },
      create: {
        assetId: asset.id,
        date: targetDate,
        close: historicalClose,
        source: 'yahoo',
      },
      update: {
        close: historicalClose,
      },
    });

    return {
      symbol: upperSymbol,
      date,
      close: historicalClose,
    };
  }
}
