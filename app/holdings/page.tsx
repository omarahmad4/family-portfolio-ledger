import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, number, pct, signedMoney } from '@/lib/format';
import { calculateOwnerUnits, calculateTotalUnits } from '@/lib/accounting/pool';

export default async function HoldingsPage() {
  const analytics = await getPortfolioAnalytics();
  const assetById = new Map(analytics.assets.map((asset) => [asset.id, asset]));

  // Calculate outstanding units context
  const totalUnits = calculateTotalUnits(analytics.transactions as any);
  const ownerUnitsMap = calculateOwnerUnits(analytics.transactions as any);

  return (
    <>
      <section className="page-header">
        <h2>Holdings</h2>
        <p>Owner-level positions and cash splits calculated from the dynamic unit pool ledger. Shows true economic net worth fractions.</p>
      </section>

      {/* Render one section per family member */}
      {analytics.owners.map((owner) => {
        // Find holdings for this specific owner
        const ownerHoldings = analytics.holdings.filter((h) => h.ownerId === owner.id);
        const ownerSummaryRow = analytics.ownerSummary.find((s) => s.ownerId === owner.id);

        const unitsOwned = ownerUnitsMap[owner.id] ?? 0;
        const netWorthShare = totalUnits > 0 ? unitsOwned / totalUnits : 0.0;

        if (ownerHoldings.length === 0) {
          return null;
        }

        const totalValue = ownerSummaryRow?.marketValue ?? 0;
        const totalCostBasis = ownerSummaryRow?.costBasis ?? 0;
        const totalGain = ownerSummaryRow?.unrealizedGainLoss ?? 0;
        const totalPct = ownerSummaryRow?.unrealizedReturnPct ?? 0;

        return (
          <section key={owner.id} data-testid="owner-section" className="card" style={{ marginBottom: 24 }}>
            {/* Header bar with owner specific KPIs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text)', fontWeight: 700 }}>
                  {owner.name}&apos;s Ledger Portfolio
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Holds {number(unitsOwned)} pool units ({pct(netWorthShare)} net worth share)
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  {money(totalValue)}
                </span>
                <div style={{ fontSize: '12px' }} className={totalGain >= 0 ? 'positive' : 'negative'}>
                  {signedMoney(totalGain)} ({pct(totalPct)})
                </div>
              </div>
            </div>

            {/* Owner positions table */}
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>Cost Basis</th>
                  <th>Gain/Loss</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                {ownerHoldings.map((row) => {
                  const asset = assetById.get(row.assetId);
                  const isCash = asset?.type === 'CASH';

                  return (
                    <tr key={row.assetId}>
                      <td style={{ fontWeight: 600 }}>
                        {asset?.symbol ?? row.assetId}
                        {!isCash && (
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                            {asset?.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          background: isCash ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.06)',
                          color: isCash ? '#38bdf8' : 'var(--text)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 500
                        }}>
                          {asset?.type}
                        </span>
                      </td>
                      <td>{isCash ? '—' : number(row.quantity)}</td>
                      <td>{isCash ? '—' : money(analytics.prices[row.assetId] ?? 0)}</td>
                      <td style={{ fontWeight: 500 }}>{money(row.marketValue)}</td>
                      <td>{money(row.costBasis)}</td>
                      {isCash ? (
                        <td style={{ color: 'var(--muted)' }}>—</td>
                      ) : (
                        <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                          {signedMoney(row.unrealizedGainLoss)}
                        </td>
                      )}
                      {isCash ? (
                        <td style={{ color: 'var(--muted)' }}>—</td>
                      ) : (
                        <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                          {pct(row.unrealizedReturnPct)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}
