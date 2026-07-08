'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Owner = { id: string; name: string };

type PreviewRow = {
  id: string;
  type: string;
  tradeDate: string;
  assetId?: string;
  quantity?: number;
  price?: number;
  grossAmount: number;
  allocations: Array<{ ownerId: string; percentage: number; amount: number; quantity?: number }>;
};

export function ImportPreviewer({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(owners.map((owner) => owner.id));
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function previewCsv() {
    setMessage(null);
    const res = await fetch('/api/imports/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, allocationOwnerIds: selectedOwners }) });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Could not preview CSV.');
      return;
    }
    setPreview(data.normalized ?? []);
    setMessage(`Previewed ${data.normalized?.length ?? 0} normalized rows from ${data.rowCount ?? 0} CSV rows.`);
  }

  async function commitImport() {
    setMessage(null);
    setIsImporting(true);
    try {
      const res = await fetch('/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv,
          accountId: 'main-brokerage',
          defaultOwnerId: selectedOwners[0] || 'partner-1',
          allocationOwnerIds: selectedOwners,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? 'Could not commit import.');
        return;
      }
      setMessage(`Imported ${data.importedCount} rows successfully, skipped ${data.skippedCount} duplicates.`);
      setPreview([]);
      setCsv('');
      router.refresh();
    } catch (err: any) {
      setMessage(err.message ?? 'Import error occurred.');
    } finally {
      setIsImporting(false);
    }
  }

  function toggleOwner(ownerId: string) {
    setSelectedOwners((current) => current.includes(ownerId) ? current.filter((id) => id !== ownerId) : [...current, ownerId]);
  }

  return (
    <div>
      <div className="allocation-box" style={{ marginBottom: 12 }}>
        <strong>Default allocation for preview</strong>
        {owners.map((owner) => <label key={owner.id} className="checkbox-row"><input type="checkbox" checked={selectedOwners.includes(owner.id)} onChange={() => toggleOwner(owner.id)} /> {owner.name}</label>)}
      </div>
      <textarea className="csv-box" data-testid="csv-textarea" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'Paste Robinhood CSV text here. Example:\nTrade Date,Activity Type,Symbol,Quantity,Price,Amount\n2024-01-01,Buy,AAPL,10,180,1800'} />
      <p>
        <button className="button" data-testid="btn-preview" type="button" onClick={previewCsv} disabled={isImporting || !csv.trim() || selectedOwners.length === 0}>
          Preview normalized rows
        </button>
        <button
          className="button"
          data-testid="btn-commit"
          type="button"
          onClick={commitImport}
          disabled={isImporting || !csv.trim() || selectedOwners.length === 0}
          style={{ marginLeft: 12, background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          {isImporting ? 'Importing...' : 'Commit to ledger'}
        </button>
        {message && <span className="form-message">{message}</span>}
      </p>
      {preview.length > 0 && <table className="table"><thead><tr><th>Date</th><th>Type</th><th>Asset ID</th><th>Qty</th><th>Price</th><th>Amount</th><th>Allocations</th></tr></thead><tbody>{preview.map((row) => <tr key={row.id}><td>{new Date(row.tradeDate).toLocaleDateString()}</td><td>{row.type}</td><td>{row.assetId ?? 'Unmapped'}</td><td>{row.quantity ?? '—'}</td><td>{row.price ?? '—'}</td><td>{row.grossAmount}</td><td>{row.allocations.map((a) => `${Math.round(a.percentage * 100)}%`).join(', ')}</td></tr>)}</tbody></table>}
    </div>
  );
}
