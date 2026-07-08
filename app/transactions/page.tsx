import { TransactionForm } from '@/app/transactions/_components/TransactionForm';
import { getHydratedTransactions, getReferenceData } from '@/lib/data/ledger';
import { TransactionsListClient } from '@/app/transactions/_components/TransactionsListClient';

export default async function TransactionsPage() {
  const [{ owners, assets, accounts }, transactions] = await Promise.all([getReferenceData(), getHydratedTransactions()]);

  return (
    <>
      <section className="page-header">
        <h2>Transactions</h2>
        <p>Add real ledger entries and split them across partners. V1 currently supports equal splits in the UI; custom percentages are the next obvious upgrade.</p>
      </section>

      <section className="card">
        <h3>Add transaction</h3>
        <TransactionForm owners={owners} assets={assets} accounts={accounts} />
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Ledger</h3>
        <TransactionsListClient transactions={transactions} />
      </section>
    </>
  );
}
