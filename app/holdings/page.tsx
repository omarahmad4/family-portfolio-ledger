import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { money, number, pct, signedMoney } from '@/lib/format';

export default async function HoldingsPage() {
  const analytics = await getPortfolioAnalytics();
  const assetById = new Map(analytics.assets.map((asset) => [asset.id, asset]));
  const ownerById = new Map(analytics.owners.map((owner) => [owner.id, owner]));

  return (
    <>
      <section className="page-header">
        <h2>Holdings</h2>
        <p>Owner-level positions calculated from the ledger. This is the first accounting view that should replace the manual sheet.</p>
      </section>
      <section className="card">
        <h3>Current holdings</h3>
        <table className="table">
          <thead><tr><th>Owner</th><th>Asset</th><th>Qty</th><th>Price</th><th>Market Value</th><th>Cost Basis</th><th>Gain/Loss</th><th>Return</th></tr></thead>
          <tbody>
            {analytics.holdings.map((row) => {
              const asset = assetById.get(row.assetId);
              return <tr key={`${row.ownerId}-${row.assetId}`}><td>{ownerById.get(row.ownerId)?.name ?? row.ownerId}</td><td>{asset?.symbol ?? row.assetId}</td><td>{number(row.quantity)}</td><td>{money(analytics.prices[row.assetId] ?? 0)}</td><td>{money(row.marketValue)}</td><td>{money(row.costBasis)}</td><td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>{signedMoney(row.unrealizedGainLoss)}</td><td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>{pct(row.unrealizedReturnPct)}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
