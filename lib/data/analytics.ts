import { BenchmarkType } from '@prisma/client';
import { buildFifoLots } from '@/lib/accounting/lots';
import { computeHoldings, summarizeByOwner } from '@/lib/accounting/holdings';
import { getAssets, getLedgerTransactions, getOwners } from '@/lib/data/ledger';
import { scoreTransactionDecision } from '@/lib/scoring/decisionScore';
import { YahooFinanceMarketDataProvider } from '@/lib/market-data/provider';
import type { PriceMap } from '@/lib/types/domain';
import { prisma } from '@/lib/db/prisma';
import { calculateTotalUnits } from '@/lib/accounting/pool';
import type { TransactionInput } from '@/lib/accounting/pool';

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
        notes: tx.notes,
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

function toInputTx(tx: any, symbol?: string | null): TransactionInput {
  return {
    id: tx.id,
    type: tx.type as any,
    tradeDate: tx.tradeDate.toISOString(),
    assetId: tx.assetId,
    assetSymbol: symbol ?? null,
    quantity: tx.quantity == null ? null : Number(tx.quantity),
    price: tx.price == null ? null : Number(tx.price),
    grossAmount: Number(tx.grossAmount),
    fee: tx.fee == null ? null : Number(tx.fee),
    allocations: tx.allocations.map((a: any) => ({
      ownerId: a.ownerId,
      percentage: Number(a.percentage),
      amount: Number(a.amount),
      quantity: a.quantity == null ? null : Number(a.quantity),
    })),
  };
}

export async function getPerformanceChartData(): Promise<any[]> {
  const transactions = await prisma.transaction.findMany({
    include: { allocations: true, asset: true },
    orderBy: { tradeDate: 'asc' },
  });

  if (transactions.length === 0) return [];

  const provider = new YahooFinanceMarketDataProvider();
  const assets = await prisma.asset.findMany();
  const usdAssetId = assets.find((a) => a.symbol === 'USD')?.id;
  const owners = await prisma.owner.findMany();
  const ownerIds = owners.map((o) => o.id);

  // Collect chronological unique month-end dates + inception
  const datePoints: string[] = [];
  const firstTxDate = transactions[0].tradeDate.toISOString().slice(0, 10);
  datePoints.push(firstTxDate);

  const monthEnds = new Map<string, string>();
  for (const tx of transactions) {
    const yyyymm = tx.tradeDate.toISOString().slice(0, 7);
    const dateStr = tx.tradeDate.toISOString().slice(0, 10);
    monthEnds.set(yyyymm, dateStr);
  }

  for (const dateStr of monthEnds.values()) {
    if (!datePoints.includes(dateStr)) {
      datePoints.push(dateStr);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (!datePoints.includes(todayStr)) {
    datePoints.push(todayStr);
  }

  datePoints.sort();

  const chartData: any[] = [];
  let navpu_0 = 10.0;
  let spy_0 = 1.0;
  let inceptionResolved = false;

  for (const dateStr of datePoints) {
    const targetDate = new Date(dateStr + 'T23:59:59.999Z');
    const txsUpToDate = transactions
      .filter((tx) => tx.tradeDate <= targetDate)
      .map((tx) => toInputTx(tx, tx.asset?.symbol));

    if (txsUpToDate.length === 0) continue;

    const prices: Record<string, number> = {};
    await Promise.all(
      assets.map(async (asset) => {
        if (asset.symbol === 'USD') {
          prices[asset.id] = 1.0;
        } else {
          try {
            const hist = await provider.getHistoricalClose(asset.symbol, dateStr);
            prices[asset.id] = hist ? hist.close : 0.0;
          } catch {
            prices[asset.id] = 0.0;
          }
        }
      })
    );

    const holdings = computeHoldings(txsUpToDate as any, prices, ownerIds, usdAssetId);
    const totalVal = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalUnits = calculateTotalUnits(txsUpToDate);
    const navpu = totalUnits > 0 ? totalVal / totalUnits : 10.0;

    let spyPrice = 1.0;
    try {
      const spyHist = await provider.getHistoricalClose('SPY', dateStr);
      spyPrice = spyHist ? spyHist.close : 1.0;
    } catch {
      spyPrice = 1.0;
    }

    if (!inceptionResolved) {
      navpu_0 = navpu;
      spy_0 = spyPrice;
      inceptionResolved = true;
    }

    const portfolioReturn = navpu_0 > 0 ? (navpu - navpu_0) / navpu_0 : 0.0;
    const spyReturn = spy_0 > 0 ? (spyPrice - spy_0) / spy_0 : 0.0;

    chartData.push({
      date: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      portfolioReturn: portfolioReturn * 100,
      spyReturn: spyReturn * 100,
    });
  }

  return chartData;
}
