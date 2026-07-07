import { ImportPreviewer } from '@/app/imports/_components/ImportPreviewer';
import { getOwners } from '@/lib/data/ledger';

export default async function ImportsPage() {
  const owners = await getOwners();
  return (
    <>
      <section className="page-header">
        <h2>Imports</h2>
        <p>Paste a Robinhood-style CSV export, normalize it, and inspect rows before committing them. Commit-to-ledger is intentionally not automatic yet.</p>
      </section>
      <section className="card">
        <h3>CSV preview</h3>
        <ImportPreviewer owners={owners} />
      </section>
    </>
  );
}
