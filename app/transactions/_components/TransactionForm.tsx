'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Owner = { id: string; name: string };
type Asset = { id: string; symbol: string; name: string };
type Account = { id: string; name: string };

const txTypes = ['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'];

export function TransactionForm({ owners, assets, accounts }: { owners: Owner[]; assets: Asset[]; accounts: Account[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState('BUY');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(owners.map((o) => o.id));

  const equalPct = useMemo(() => selectedOwners.length ? 1 / selectedOwners.length : 0, [selectedOwners.length]);

  async function onSubmit(formData: FormData) {
    setMessage(null);
    const payload = {
      accountId: String(formData.get('accountId')),
      assetId: String(formData.get('assetId')) || null,
      type,
      tradeDate: String(formData.get('tradeDate')),
      quantity: formData.get('quantity') ? Number(formData.get('quantity')) : null,
      price: formData.get('price') ? Number(formData.get('price')) : null,
      grossAmount: Number(formData.get('grossAmount')),
      fee: formData.get('fee') ? Number(formData.get('fee')) : 0,
      notes: String(formData.get('notes') ?? ''),
      allocations: selectedOwners.map((ownerId) => ({ ownerId, percentage: equalPct })),
    };

    const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Could not save transaction.');
      return;
    }
    setMessage('Transaction saved.');
    startTransition(() => router.refresh());
  }

  function toggleOwner(ownerId: string) {
    setSelectedOwners((current) => current.includes(ownerId) ? current.filter((id) => id !== ownerId) : [...current, ownerId]);
  }

  return (
    <form action={onSubmit} className="form-grid">
      <label>Account<select name="accountId" required>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Type<select value={type} onChange={(e) => setType(e.target.value)}>{txTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Asset<select name="assetId"><option value="">Cash/no asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} — {asset.name}</option>)}</select></label>
      <label>Trade date<input name="tradeDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      <label>Quantity<input name="quantity" type="number" min="0" step="any" placeholder="e.g. 12.5" /></label>
      <label>Price<input name="price" type="number" min="0" step="any" placeholder="e.g. 185.25" /></label>
      <label>Gross amount<input name="grossAmount" type="number" min="0" step="0.01" required placeholder="e.g. 5000" /></label>
      <label>Fee<input name="fee" type="number" min="0" step="0.01" defaultValue="0" /></label>
      <label className="wide">Notes<input name="notes" placeholder="Why did you make this decision?" /></label>
      <fieldset className="wide allocation-box">
        <legend>Allocate equally across selected owners</legend>
        {owners.map((owner) => <label key={owner.id} className="checkbox-row"><input type="checkbox" checked={selectedOwners.includes(owner.id)} onChange={() => toggleOwner(owner.id)} /> {owner.name} {selectedOwners.includes(owner.id) ? `(${Math.round(equalPct * 10000) / 100}%)` : ''}</label>)}
      </fieldset>
      <div className="wide"><button className="button" type="submit" disabled={isPending || selectedOwners.length === 0}>Save transaction</button>{message && <span className="form-message">{message}</span>}</div>
    </form>
  );
}
