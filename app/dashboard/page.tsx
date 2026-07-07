import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, pct, signedMoney } from '@/lib/format';

export default async function DashboardPage() {
  const analytics = await getPortfolioAnalytics();
  const bestDecision = analytics.decisionRows[0];

  return (
    <>
      <section className="page-header">
        <h2>Dashboard</h2>
        <p>Live local dashboard powered by Prisma, SQLite seed data, FIFO lots, and owner-level accounting.</p>
      </section>

      <section className="grid">
        <div className="card"><h3>Total portfolio value</h3><div className="metric">{money(analytics.totals.marketValue)}</div></div>
        <div className="card"><h3>Total unrealized gain</h3><div className={`metric ${analytics.totals.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}`}>{signedMoney(analytics.totals.unrealizedGainLoss)}</div></div>
        <div className="card"><h3>Best decision vs placeholder benchmark</h3><div className="metric">{bestDecision ? `${bestDecision.symbol} ${bestDecision.grade}` : '—'}</div></div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Value by owner</h3>
        <table className="table">
          <thead><tr><th>Owner</th><th>Value</th><th>Cost Basis</th><th>Gain/Loss</th><th>Return</th></tr></thead>
          <tbody>
            {analytics.ownerSummary.map((row) => {
              const owner = analytics.owners.find((candidate) => candidate.id === row.ownerId);
              return <tr key={row.ownerId}><td>{owner?.name ?? row.ownerId}</td><td>{money(row.marketValue)}</td><td>{money(row.costBasis)}</td><td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>{signedMoney(row.unrealizedGainLoss)}</td><td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>{pct(row.unrealizedReturnPct)}</td></tr>;
            })}
          </tbody>
        </table>
      </section>

      <section className="grid" style={{ marginTop: 18 }}>
        <div className="card"><h3>Tracked holdings</h3><div className="metric">{analytics.holdings.length}</div></div>
        <div className="card"><h3>Open lots/cohorts</h3><div className="metric">{analytics.lots.filter((lot) => lot.remainingQuantity > 0).length}</div></div>
        <div className="card"><h3>Ledger transactions</h3><div className="metric">{analytics.transactions.length}</div></div>
      </section>
    </>
  );
}
