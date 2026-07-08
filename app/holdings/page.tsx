import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { calculateOwnerUnits, calculateTotalUnits } from '@/lib/accounting/pool';
import { HoldingsPageClient } from './_components/HoldingsPageClient';

export default async function HoldingsPage() {
  const analytics = await getPortfolioAnalytics();

  const totalUnits = calculateTotalUnits(analytics.transactions as any);
  const ownerUnitsMap = calculateOwnerUnits(analytics.transactions as any);

  return (
    <>
      <section className="page-header">
        <h2>Holdings</h2>
        <p>Owner-level positions and cash splits calculated from the dynamic unit pool ledger. Shows true economic net worth fractions.</p>
      </section>

      <HoldingsPageClient
        owners={analytics.owners}
        holdings={analytics.holdings}
        ownerSummary={analytics.ownerSummary}
        prices={analytics.prices}
        assets={analytics.assets}
        totalUnits={totalUnits}
        ownerUnitsMap={ownerUnitsMap}
      />
    </>
  );
}
