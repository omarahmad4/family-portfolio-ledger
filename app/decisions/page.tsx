import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, number, pct } from '@/lib/format';

export default async function DecisionsPage() {
  const analytics = await getPortfolioAnalytics();

  const decisionRows = analytics.decisionRows;

  // Calculate high-level decision KPIs
  const totalDecisions = decisionRows.length;
  const beatCount = decisionRows.filter((d: any) => d.excessReturnPct > 0).length;
  const beatRate = totalDecisions > 0 ? beatCount / totalDecisions : 0.0;

  // GPA calculation
  const gpaValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const totalGPA = decisionRows.reduce((acc, r: any) => acc + (gpaValues[r.grade] ?? 0), 0);
  const avgGPA = totalDecisions > 0 ? totalGPA / totalDecisions : 0.0;

  const getLetterGPA = (gpa: number) => {
    if (gpa >= 3.5) return 'A';
    if (gpa >= 2.5) return 'B';
    if (gpa >= 1.5) return 'C';
    if (gpa >= 0.5) return 'D';
    return 'F';
  };

  const overallAlpha = totalDecisions > 0 
    ? decisionRows.reduce((acc, r: any) => acc + r.excessReturnPct, 0) / totalDecisions 
    : 0.0;

  return (
    <>
      <section className="page-header">
        <h2>Decision Scoring</h2>
        <p>Evaluates each purchase cohort (decision) against the benchmark index (SPY) on the trade date. Tracks opportunity cost for active lots and trims.</p>
      </section>

      {/* Decision KPIs */}
      <section className="grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Average Portfolio Grade</h3>
          <div className="metric" style={{ color: avgGPA >= 2.5 ? '#10b981' : '#fde68a' }}>
            {avgGPA.toFixed(2)} / 4.00 <span style={{ fontSize: '18px', fontWeight: 500 }}>({getLetterGPA(avgGPA)})</span>
          </div>
        </div>
        <div className="card">
          <h3>Alpha Beat Rate</h3>
          <div className="metric" style={{ color: beatRate >= 0.5 ? '#10b981' : '#f59e0b' }}>
            {pct(beatRate)} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>of cohorts outperform SPY</span>
          </div>
        </div>
        <div className="card">
          <h3>Average Excess Return (Alpha)</h3>
          <div className={`metric ${overallAlpha >= 0 ? 'positive' : 'negative'}`}>
            {overallAlpha >= 0 ? '+' : ''}{pct(overallAlpha)}
          </div>
        </div>
      </section>

      {/* Decision Table */}
      <section className="card">
        <h3>Decision Scorecards</h3>
        {decisionRows.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            No BUY decisions found in the database. Please add transactions or import a CSV to populate.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Asset</th>
                <th>Trade Date</th>
                <th>Original Qty</th>
                <th>Staged Cost</th>
                <th>Current Value</th>
                <th>Actual Return</th>
                <th>SPY Return</th>
                <th>Excess Return</th>
              </tr>
            </thead>
            <tbody>
              {decisionRows.map((row: any) => {
                const actualVal = row.actualValue ?? 0;
                const invested = row.grossAmount ?? 0;
                const actReturn = row.actualReturnPct ?? 0;
                const bmkReturn = row.benchmarkReturnPct ?? 0;
                const excess = row.excessReturnPct ?? 0;

                return (
                  <tr key={row.id}>
                    <td>
                      <span className={`grade grade-${row.grade.toLowerCase()}`}>
                        {row.grade}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.symbol}</td>
                    <td>{new Date(row.tradeDate).toLocaleDateString()}</td>
                    <td>{number(row.quantity)}</td>
                    <td>{money(invested)}</td>
                    <td style={{ fontWeight: 500 }}>{money(actualVal)}</td>
                    <td className={actReturn >= 0 ? 'positive' : 'negative'}>
                      {pct(actReturn)}
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{pct(bmkReturn)}</td>
                    <td className={excess >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                      {excess >= 0 ? '+' : ''}{pct(excess)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
