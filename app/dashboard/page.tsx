import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { calculateNetCash } from '@/lib/accounting/pool';
import DashboardPageClient from './_components/DashboardPageClient';

export default async function DashboardPage() {
  const analytics = await getPortfolioAnalytics();

  const totalValue = analytics.totals.marketValue;
  const cashBalance = calculateNetCash(analytics.transactions as any);
  const cashDrag = totalValue > 0 ? cashBalance / totalValue : 0.0;
  const usdAssetId = analytics.assets.find((a) => a.symbol === 'USD')?.id;

  // Group allocations for Recharts chart
  const assetMap = new Map(analytics.assets.map((a) => [a.id, a]));
  const typeValueMap: Record<string, number> = {
    Stocks: 0,
    ETFs: 0,
    Crypto: 0,
    Cash: 0,
  };

  for (const h of analytics.holdings) {
    const asset = assetMap.get(h.assetId);
    if (!asset) continue;

    if (asset.type === 'STOCK') {
      typeValueMap.Stocks += h.marketValue;
    } else if (asset.type === 'ETF') {
      typeValueMap.ETFs += h.marketValue;
    } else if (asset.type === 'CRYPTO') {
      typeValueMap.Crypto += h.marketValue;
    } else if (asset.type === 'CASH') {
      typeValueMap.Cash += h.marketValue;
    }
  }

  const chartData = [
    { name: 'Stocks', value: typeValueMap.Stocks },
    { name: 'ETFs', value: typeValueMap.ETFs },
    { name: 'Crypto', value: typeValueMap.Crypto },
    { name: 'Cash', value: typeValueMap.Cash },
  ];

  // Calculate Beat Rate on decisions
  const ratedDecisions = analytics.decisionRows;
  const beatCount = ratedDecisions.filter((d: any) => d.excessReturnPct > 0).length;
  const beatRate = ratedDecisions.length > 0 ? beatCount / ratedDecisions.length : 0.0;

  return (
    <>
      <section className="page-header">
        <h2>Dashboard</h2>
        <p>Live pooled portfolio ledger powered by unitized accounting, historical benchmarks, and SQLite price caching.</p>
      </section>

      <DashboardPageClient
        analytics={analytics as any}
        cashBalance={cashBalance}
        cashDrag={cashDrag}
        usdAssetId={usdAssetId}
        chartData={chartData}
        beatRate={beatRate}
      />
    </>
  );
}
