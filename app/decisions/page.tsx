import { getPortfolioAnalytics } from '@/lib/data/analytics';
import { DecisionsPageClient } from './_components/DecisionsPageClient';

export default async function DecisionsPage() {
  const analytics = await getPortfolioAnalytics();

  return (
    <>
      <section className="page-header">
        <h2>Decision Scoring</h2>
        <p>Evaluates each purchase cohort (decision) against the benchmark index (SPY) on the trade date. Tracks opportunity cost for active lots and trims.</p>
      </section>

      <DecisionsPageClient 
        initialDecisionRows={analytics.decisionRows} 
      />
    </>
  );
}
