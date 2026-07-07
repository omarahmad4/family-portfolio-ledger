import { buildFifoLots } from '@/lib/accounting/lots';
import { computeHoldings, summarizeByOwner } from '@/lib/accounting/holdings';
import { getAssets, getLedgerTransactions, getLatestPrices, getOwners } from '@/lib/data/ledger';
import { scoreDecision } from '@/lib/scoring/decisionScore';

export async function getPortfolioAnalytics() {
  const [owners, assets, transactions, prices] = await Promise.all([
    getOwners(),
    getAssets(),
    getLedgerTransactions(),
    getLatestPrices(),
  ]);

  const holdings = computeHoldings(transactions, prices);
  const ownerSummary = summarizeByOwner(holdings);
  const lots = buildFifoLots(transactions);

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

  const decisionRows = lots
    .filter((lot) => lot.originalQuantity > 0)
    .map((lot) => {
      const currentPrice = prices[lot.assetId] ?? 0;
      const currentValue = lot.remainingQuantity * currentPrice + lot.realizedProceeds;
      const investedAmount = lot.originalCostBasis;
      // V1 placeholder benchmark: assumes SPY-like benchmark compounded to 35% total since buy.
      // Replace with BenchmarkSnapshot lookup once benchmark imports are wired.
      const benchmarkCurrentValue = Math.max(investedAmount, investedAmount * 1.35);
      const score = scoreDecision({ investedAmount: Math.max(investedAmount, 0.0001), currentValue, benchmarkCurrentValue });
      return {
        ...lot,
        ownerName: ownerById.get(lot.ownerId)?.name ?? 'Unknown',
        symbol: assetById.get(lot.assetId)?.symbol ?? 'Unknown',
        currentPrice,
        currentValue,
        ...score,
      };
    })
    .sort((a, b) => b.excessReturnPct - a.excessReturnPct);

  const totals = ownerSummary.reduce(
    (acc, row) => {
      acc.marketValue += row.marketValue;
      acc.costBasis += row.costBasis;
      acc.unrealizedGainLoss += row.unrealizedGainLoss;
      return acc;
    },
    { marketValue: 0, costBasis: 0, unrealizedGainLoss: 0 },
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
