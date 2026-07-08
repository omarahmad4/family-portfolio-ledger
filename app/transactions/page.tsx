import { TransactionForm } from '@/app/transactions/_components/TransactionForm';
import { getHydratedTransactions, getReferenceData } from '@/lib/data/ledger';
import { money, number } from '@/lib/format';

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

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
        <table className="table">
          <thead><tr><th>Date</th><th>Type</th><th>Asset</th><th>Qty</th><th>Amount</th><th>Owners</th><th>Notes</th></tr></thead>
          <tbody>
            {transactions.map((tx) => <tr key={tx.id}><td>{tx.tradeDate.toLocaleDateString()}</td><td>{tx.type}</td><td>{tx.asset?.symbol ?? 'Cash'}</td><td>{tx.quantity == null ? '—' : number(toNumber(tx.quantity))}</td><td>{money(toNumber(tx.grossAmount))}</td><td>{tx.allocations.length > 0 ? tx.allocations.map((a) => `${a.owner.name} ${Math.round(toNumber(a.percentage) * 100)}%`).join(', ') : 'Pool'}</td><td>{tx.notes ?? '—'}</td></tr>)}
          </tbody>
        </table>
      </section>
    </>
  );
}
