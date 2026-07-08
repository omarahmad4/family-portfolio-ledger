/**
 * @file ImportPreviewer.tsx
 * @description Client-side component for CSV pasting, interactive preview, and partner allocation selection.
 * For DEPOSIT and WITHDRAWAL transactions, it renders an owner dropdown selector to assign the cash flow.
 * Once finalized, the previewed transactions are submitted directly to the commit API.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Owner = { id: string; name: string };

type PreviewRow = {
  id: string;
  type: string;
  tradeDate: string;
  assetId?: string;
  assetSymbol?: string;
  quantity?: number;
  price?: number;
  grossAmount: number;
  allocations: Array<{ ownerId: string; percentage: number; amount: number; quantity?: number }>;
};

/**
 * Interactive previewer for brokerage CSV ledger integrations.
 * 
 * @param props Props containing the database owners list.
 */
export function ImportPreviewer({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(owners.map((owner) => owner.id));
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Submits the raw CSV to the preview API to extract normalized rows.
   */
  async function previewCsv() {
    setMessage(null);
    const res = await fetch('/api/imports/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, allocationOwnerIds: selectedOwners })
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Could not preview CSV.');
      return;
    }
    
    // For deposits/withdrawals, default to the first selected owner with 100% allocation
    const normalized = (data.normalized ?? []).map((row: PreviewRow) => {
      if (row.type === 'DEPOSIT' || row.type === 'WITHDRAWAL') {
        const ownerId = selectedOwners[0] || owners[0]?.id || '';
        return {
          ...row,
          allocations: [{ ownerId, percentage: 1.0, amount: row.grossAmount }]
        };
      }
      return row;
    });

    setPreview(normalized);
    setMessage(`Previewed ${normalized.length} normalized rows from ${data.rowCount ?? 0} CSV rows.`);
  }

  /**
   * Commits the finalized transactions list from the preview state to the ledger database.
   */
  async function commitImport() {
    setMessage(null);
    setIsImporting(true);
    try {
      const res = await fetch('/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: preview
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

  /**
   * Updates the selected owner for a deposit or withdrawal row.
   * 
   * @param rowId The CUID or ID of the preview row.
   * @param ownerId The CUID of the owner.
   */
  function updateRowOwner(rowId: string, ownerId: string) {
    setPreview((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          allocations: [{ ownerId, percentage: 1.0, amount: row.grossAmount }]
        };
      })
    );
  }

  /**
   * Toggles selected default owners.
   * 
   * @param ownerId The owner CUID.
   */
  function toggleOwner(ownerId: string) {
    setSelectedOwners((current) => current.includes(ownerId) ? current.filter((id) => id !== ownerId) : [...current, ownerId]);
  }

  return (
    <div>
      <div className="allocation-box" style={{ marginBottom: 12 }}>
        <strong>Default owner for cash flows during preview</strong>
        {owners.map((owner) => (
          <label key={owner.id} className="checkbox-row">
            <input type="checkbox" checked={selectedOwners.includes(owner.id)} onChange={() => toggleOwner(owner.id)} /> {owner.name}
          </label>
        ))}
      </div>
      <textarea
        className="csv-box"
        data-testid="csv-textarea"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={'Paste Robinhood CSV text here. Example:\nTrade Date,Activity Type,Symbol,Quantity,Price,Amount\n2024-01-01,Buy,AAPL,10,180,1800'}
      />
      <p>
        <button
          className="button"
          data-testid="btn-preview"
          type="button"
          onClick={previewCsv}
          disabled={isImporting || !csv.trim() || selectedOwners.length === 0}
        >
          Preview normalized rows
        </button>
        <button
          className="button"
          data-testid="btn-commit"
          type="button"
          onClick={commitImport}
          disabled={isImporting || preview.length === 0}
          style={{ marginLeft: 12, background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          {isImporting ? 'Importing...' : 'Commit to ledger'}
        </button>
        {message && <span className="form-message">{message}</span>}
      </p>
      {preview.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Asset</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
              <th>Allocations</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.tradeDate).toLocaleDateString()}</td>
                <td>{row.type}</td>
                <td>{row.assetSymbol ?? 'Cash'}</td>
                <td>{row.quantity ?? '—'}</td>
                <td>{row.price ?? '—'}</td>
                <td>{row.grossAmount}</td>
                <td>
                  {row.type === 'DEPOSIT' || row.type === 'WITHDRAWAL' ? (
                    <select
                      value={row.allocations[0]?.ownerId || ''}
                      onChange={(e) => updateRowOwner(row.id, e.target.value)}
                      style={{ background: '#1e293b', color: '#cbd5e1', padding: '4px', borderRadius: '4px', border: '1px solid #475569' }}
                    >
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    'Pool'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
