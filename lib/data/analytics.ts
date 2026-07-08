import { BenchmarkType } from '@prisma/client';
import { buildFifoLots } from '@/lib/accounting/lots';
import { computeHoldings, summarizeByOwner } from '@/lib/accounting/holdings';
import { getAssets, getLedgerTransactions, getOwners } from '@/lib/data/ledger';
import { scoreTransactionDecision } from '@/lib/scoring/decisionScore';
import { YahooFinanceMarketDataProvider } from '@/lib/market-data/provider';
import type { PriceMap } from '@/lib/types/domain';

export async function getPortfolioAnalytics() {
  const [owners, assets, transactions] = await Promise.all([
    getOwners(),
    getAssets(),
    getLedgerTransactions(),
  ]);

  const provider = new YahooFinanceMarketDataProvider();

  // 1. Resolve Prices Map dynamically using the caching provider
  const prices: PriceMap = {};
  await Promise.all(
    assets.map(async (asset) => {
      if (asset.symbol === 'USD') {
        prices[asset.id] = 1.0;
      } else {
        try {
          // This calls yahoo-finance2 or retrieves from prisma cache
          const latest = await provider.getLatestPrice(asset.symbol);
          prices[asset.id] = latest;
        } catch (err) {
          console.warn(`Could not resolve latest price for ${asset.symbol}`, err);
          prices[asset.id] = 0.0;
        }
      }
    })
  );

  const usdAssetId = assets.find((a) => a.symbol === 'USD')?.id;
  const holdings = computeHoldings(transactions, prices, owners.map((o) => o.id), usdAssetId);
  const ownerSummary = summarizeByOwner(holdings);
  const lots = buildFifoLots(transactions);

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

  // 2. Resolve Dynamic Decision Grading Cohorts
  const buyTransactions = transactions.filter((t) => t.type === 'BUY');
  const scoredDecisions = await Promise.all(
    buyTransactions.map(async (tx) => {
      const score = await scoreTransactionDecision(tx, transactions, provider, BenchmarkType.SPY);
      const symbol = tx.assetId ? assetById.get(tx.assetId)?.symbol ?? 'Unknown' : 'Unknown';
      return {
        id: tx.id,
        tradeDate: tx.tradeDate,
        symbol,
        grossAmount: tx.grossAmount,
        quantity: tx.quantity ?? 0,
        price: tx.price ?? 0,
        ...score,
      };
    })
  );

  // Clean up any null scores and sort by excess alpha descending
  const decisionRows = scoredDecisions.filter((s) => s.grade != null).sort((a: any, b: any) => b.excessReturnPct - a.excessReturnPct);

  const totals = ownerSummary.reduce(
    (acc, row) => {
      acc.marketValue += row.marketValue;
      acc.costBasis += row.costBasis;
      acc.unrealizedGainLoss += row.unrealizedGainLoss;
      return acc;
    },
    { marketValue: 0, costBasis: 0, unrealizedGainLoss: 0 }
  );

  return {
    owners,
    assets,
    transactions,
    prices,
    holdings,
    ownerSummary,
    lots,
    decisionRows,
    totals: {
      ...totals,
      unrealizedReturnPct: totals.costBasis === 0 ? null : totals.unrealizedGainLoss / totals.costBasis,
    },
  };
}
