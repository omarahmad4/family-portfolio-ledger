/**
 * @file ImportPreviewer.tsx
 * @description Client-side component for CSV pasting, interactive preview, and partner allocation selection.
 * For DEPOSIT and WITHDRAWAL transactions, it renders an owner dropdown selector to assign the cash flow.
 * Once finalized, the previewed transactions are submitted directly to the commit API.
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { money, number } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';

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
  notes?: string;
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedOwners, setSelectedOwners] = useState<string[]>(owners.map((owner) => owner.id));
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Handles local CSV file uploads via file browser.
   */
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsv(text);
      setMessage(`Successfully loaded ${file.name}. Click Preview to parse.`);
    };
    reader.readAsText(file);
  }

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
      setFileName(null);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message ?? 'Import error occurred.');
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Updates the selected owner for a deposit or withdrawal row.
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
   */
  function toggleOwner(ownerId: string) {
    setSelectedOwners((current) => current.includes(ownerId) ? current.filter((id) => id !== ownerId) : [...current, ownerId]);
  }

  // 1. Separate Inflows/Outflows (Cash Flows) from Trades/Dividends/Fees
  const { cashFlowRows, tradeRows } = useMemo(() => {
    const cashFlows: PreviewRow[] = [];
    const trades: PreviewRow[] = [];
    for (const row of preview) {
      if (row.type === 'DEPOSIT' || row.type === 'WITHDRAWAL') {
        cashFlows.push(row);
      } else {
        trades.push(row);
      }
    }
    return { cashFlowRows: cashFlows, tradeRows: trades };
  }, [preview]);

  // Pre-resolve table row computed keys for clean sort support
  const preparedCashFlows = useMemo(() => {
    return cashFlowRows.map((row) => {
      const ownerId = row.allocations[0]?.ownerId || '';
      const ownerName = owners.find((o) => o.id === ownerId)?.name ?? '';
      return {
        ...row,
        ownerName,
      };
    });
  }, [cashFlowRows, owners]);

  const preparedTrades = useMemo(() => {
    return tradeRows.map((row) => {
      const symbol = row.assetSymbol ?? 'Cash';
      return {
        ...row,
        symbol,
      };
    });
  }, [tradeRows]);

  // Hook up sorting for both tables independently
  const sortedCashFlowsObj = useSortableData(preparedCashFlows, { key: 'tradeDate', order: 'desc' });
  const sortedTradesObj = useSortableData(preparedTrades, { key: 'tradeDate', order: 'desc' });

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

      {/* CSV File Browser Selector Uploader */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 12 }}>
        <button
          className="button"
          type="button"
          onClick={() => document.getElementById('csv-file-input')?.click()}
          style={{ cursor: 'pointer' }}
        >
          Choose CSV file
        </button>
        <input
          type="file"
          accept=".csv"
          id="csv-file-input"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {fileName ? `Selected: ${fileName}` : 'Or paste raw CSV text below'}
        </span>
      </div>

      <textarea
        className="csv-box"
        data-testid="csv-textarea"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={'Paste Robinhood CSV text here. Example:\nTrade Date,Activity Type,Symbol,Quantity,Price,Amount\n2024-01-01,Buy,AAPL,10,180,1800'}
      />
      
      <p style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
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
          style={{ background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          {isImporting ? 'Importing...' : 'Commit to ledger'}
        </button>
        {message && <span className="form-message" style={{ display: 'inline-block' }}>{message}</span>}
      </p>

      {preview.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {/* A. Separate Section: Inflows & Outflows requiring Manual Decisions */}
          {cashFlowRows.length > 0 && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid var(--accent)', background: 'rgba(56, 189, 248, 0.02)' }}>
              <h3 style={{ margin: '0 0 8px', color: 'var(--accent)', fontSize: '16px', fontWeight: 700 }}>
                Here are all the inflows and outflows
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.4 }}>
                Assign which partner is responsible for each deposit or withdrawal cash flow before committing.
              </p>
              
              <table className="table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="tradeDate" sortConfig={sortedCashFlowsObj.sortConfig} onRequestSort={sortedCashFlowsObj.requestSort}>Date</SortableHeader>
                    <SortableHeader sortKey="type" sortConfig={sortedCashFlowsObj.sortConfig} onRequestSort={sortedCashFlowsObj.requestSort}>Type</SortableHeader>
                    <SortableHeader sortKey="grossAmount" sortConfig={sortedCashFlowsObj.sortConfig} onRequestSort={sortedCashFlowsObj.requestSort}>Amount</SortableHeader>
                    <SortableHeader sortKey="ownerName" sortConfig={sortedCashFlowsObj.sortConfig} onRequestSort={sortedCashFlowsObj.requestSort}>Assign Partner</SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {sortedCashFlowsObj.items.map((row) => (
                    <tr key={row.id}>
                      <td suppressHydrationWarning>{new Date(row.tradeDate).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600, color: row.type === 'DEPOSIT' ? '#86efac' : '#fca5a5' }}>
                        {row.type}
                      </td>
                      <td>{money(row.grossAmount)}</td>
                      <td>
                        <select
                          value={row.allocations[0]?.ownerId || ''}
                          onChange={(e) => updateRowOwner(row.id, e.target.value)}
                          style={{ background: '#1e293b', color: '#cbd5e1', padding: '6px 10px', borderRadius: '8px', border: '1px solid #475569', fontSize: '13px', cursor: 'pointer' }}
                        >
                          {owners.map((owner) => (
                            <option key={owner.id} value={owner.id}>
                              {owner.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* B. Main Table Section: Standard Trades / Dividends / Splits / Fees */}
          {tradeRows.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>
                Trades, Dividends, Splits & Fees
              </h3>
              <table className="table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="tradeDate" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Date</SortableHeader>
                    <SortableHeader sortKey="type" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Type</SortableHeader>
                    <SortableHeader sortKey="symbol" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Asset</SortableHeader>
                    <SortableHeader sortKey="quantity" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Qty</SortableHeader>
                    <SortableHeader sortKey="price" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Price</SortableHeader>
                    <SortableHeader sortKey="grossAmount" sortConfig={sortedTradesObj.sortConfig} onRequestSort={sortedTradesObj.requestSort}>Amount</SortableHeader>
                    <th>Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTradesObj.items.map((row) => (
                    <tr key={row.id}>
                      <td suppressHydrationWarning>{new Date(row.tradeDate).toLocaleDateString()}</td>
                      <td>{row.type}</td>
                      <td>{row.symbol}</td>
                      <td>{row.quantity == null ? '—' : number(row.quantity)}</td>
                      <td>{row.price == null ? '—' : money(row.price)}</td>
                      <td>{money(row.grossAmount)}</td>
                      <td>Pool</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
