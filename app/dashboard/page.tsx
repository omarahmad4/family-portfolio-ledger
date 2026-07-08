import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, pct, signedMoney } from '@/lib/format';
import { calculateNetCash } from '@/lib/accounting/pool';
import AllocationChart from './_components/AllocationChart';

export default async function DashboardPage() {
  const analytics = await getPortfolioAnalytics();

  const totalValue = analytics.totals.marketValue;
  const costBasis = analytics.totals.costBasis;
  const netGains = analytics.totals.unrealizedGainLoss;
  const totalReturn = analytics.totals.unrealizedReturnPct;

  // Calculate Net Cash and Cash Drag %
  const cashBalance = calculateNetCash(analytics.transactions as any);
  const cashDrag = totalValue > 0 ? cashBalance / totalValue : 0.0;

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
        <p>Live family portfolio ledger powered by unitized accounting, historical benchmarks, and SQLite price caching.</p>
      </section>

      {/* Main KPI & Chart Grid */}
      <section className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: 20 }}>
        {/* KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Total portfolio value (NAV)</h3>
            <div className="metric" style={{ fontSize: '32px' }}>{money(totalValue)}</div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Net unrealized return</h3>
            <div className={`metric ${netGains >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '32px' }}>
              {signedMoney(netGains)} <span style={{ fontSize: '18px', fontWeight: 500 }}>({pct(totalReturn)})</span>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Total capital invested</h3>
            <div className="metric" style={{ fontSize: '26px', color: '#cbd5e1' }}>{money(costBasis)}</div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Cash drag %</h3>
            <div className="metric" style={{ fontSize: '26px', color: cashDrag > 0.15 ? '#f59e0b' : '#38bdf8' }}>
              {pct(cashDrag)} <span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>({money(cashBalance)} idle)</span>
            </div>
          </div>
        </div>

        {/* Recharts Donut Exposure chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
          <h3 style={{ margin: 0 }}>Portfolio Exposure</h3>
          <AllocationChart data={chartData} />
        </div>
      </section>

      {/* Owner Value summary */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h3>Value by Family Member</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Market Value</th>
              <th>Capital Invested</th>
              <th>Net Gains/Losses</th>
              <th>Unrealized Return</th>
            </tr>
          </thead>
          <tbody>
            {analytics.ownerSummary.map((row) => {
              const owner = analytics.owners.find((candidate) => candidate.id === row.ownerId);
              return (
                <tr key={row.ownerId}>
                  <td style={{ fontWeight: 600 }}>{owner?.name ?? row.ownerId}</td>
                  <td>{money(row.marketValue)}</td>
                  <td>{money(row.costBasis)}</td>
                  <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                    {signedMoney(row.unrealizedGainLoss)}
                  </td>
                  <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                    {pct(row.unrealizedReturnPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Bottom quick stats */}
      <section className="grid">
        <div className="card">
          <h3>Decision Beat Rate</h3>
          <div className="metric" style={{ color: beatRate >= 0.5 ? '#10b981' : '#f59e0b' }}>
            {pct(beatRate)} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>vs SPY benchmark</span>
          </div>
        </div>
        <div className="card">
          <h3>Asset classes held</h3>
          <div className="metric">{analytics.holdings.filter(h => h.assetId !== usdAssetId).length} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>active positions</span></div>
        </div>
        <div className="card">
          <h3>Ledger transactions</h3>
          <div className="metric">{analytics.transactions.length} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>total events</span></div>
        </div>
      </section>
    </>
  );
}
