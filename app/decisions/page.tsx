import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, number, pct } from '@/lib/format';

export default async function DecisionsPage() {
  const analytics = await getPortfolioAnalytics();

  return (
    <>
      <section className="page-header">
        <h2>Decision grading</h2>
        <p>Each buy lot is treated as a decision/cohort. V1 uses a placeholder benchmark until benchmark snapshots are imported.</p>
      </section>
      <section className="card">
        <h3>Decision scorecards</h3>
        <table className="table">
          <thead><tr><th>Grade</th><th>Owner</th><th>Asset</th><th>Opened</th><th>Original Qty</th><th>Remaining Qty</th><th>Current + Realized</th><th>Actual Return</th><th>Excess vs Benchmark</th></tr></thead>
          <tbody>
            {analytics.decisionRows.map((row) => <tr key={row.id}><td><span className={`grade grade-${row.grade.toLowerCase()}`}>{row.grade}</span></td><td>{row.ownerName}</td><td>{row.symbol}</td><td>{new Date(row.openedAt).toLocaleDateString()}</td><td>{number(row.originalQuantity)}</td><td>{number(row.remainingQuantity)}</td><td>{money(row.currentValue)}</td><td className={row.actualReturnPct >= 0 ? 'positive' : 'negative'}>{pct(row.actualReturnPct)}</td><td className={row.excessReturnPct >= 0 ? 'positive' : 'negative'}>{pct(row.excessReturnPct)}</td></tr>)}
          </tbody>
        </table>
      </section>
    </>
  );
}
