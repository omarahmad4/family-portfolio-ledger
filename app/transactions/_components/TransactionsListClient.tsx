'use client';

/**
 * @file TransactionsListClient.tsx
 * @description Interactive client wrapper for the Transactions list table.
 * Implements column-level ascending/descending sorting.
 */

import React from 'react';
import { money, number } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';

interface TransactionsListClientProps {
  transactions: any[];
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value);
}

export function TransactionsListClient({ transactions }: TransactionsListClientProps) {
  // Precompute clean keys to sort by
  const preparedRows = React.useMemo(() => {
    return transactions.map((tx) => {
      const assetSymbol = tx.asset?.symbol ?? 'Cash';
      const parsedQty = tx.quantity == null ? null : toNumber(tx.quantity);
      const parsedAmount = toNumber(tx.grossAmount);
      const ownersString = tx.allocations.length > 0 
        ? tx.allocations.map((a: any) => `${a.owner.name} ${Math.round(toNumber(a.percentage) * 100)}%`).join(', ')
        : 'Pool';
      
      return {
        ...tx,
        assetSymbol,
        parsedQty,
        parsedAmount,
        ownersString,
        notes: tx.notes ?? '',
      };
    });
  }, [transactions]);

  const { items: sortedRows, requestSort, sortConfig } = useSortableData(preparedRows, {
    key: 'tradeDate',
    order: 'desc'
  });

  return (
    <table className="table">
      <thead>
        <tr>
          <SortableHeader sortKey="tradeDate" sortConfig={sortConfig} onRequestSort={requestSort}>Date</SortableHeader>
          <SortableHeader sortKey="type" sortConfig={sortConfig} onRequestSort={requestSort}>Type</SortableHeader>
          <SortableHeader sortKey="assetSymbol" sortConfig={sortConfig} onRequestSort={requestSort}>Asset</SortableHeader>
          <SortableHeader sortKey="parsedQty" sortConfig={sortConfig} onRequestSort={requestSort}>Qty</SortableHeader>
          <SortableHeader sortKey="parsedAmount" sortConfig={sortConfig} onRequestSort={requestSort}>Amount</SortableHeader>
          <SortableHeader sortKey="ownersString" sortConfig={sortConfig} onRequestSort={requestSort}>Owners</SortableHeader>
          <SortableHeader sortKey="notes" sortConfig={sortConfig} onRequestSort={requestSort}>Notes</SortableHeader>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((tx) => (
          <tr key={tx.id}>
            <td>{new Date(tx.tradeDate).toLocaleDateString()}</td>
            <td>{tx.type}</td>
            <td>{tx.assetSymbol}</td>
            <td>{tx.parsedQty == null ? '—' : number(tx.parsedQty)}</td>
            <td>{money(tx.parsedAmount)}</td>
            <td>{tx.ownersString}</td>
            <td>
              {tx.notes ? (
                tx.notes.startsWith('[SAMPLE]') ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>SAMPLE</span>
                    <span style={{ color: 'var(--muted)' }}>{tx.notes.replace('[SAMPLE]', '').trim()}</span>
                  </span>
                ) : (
                  tx.notes
                )
              ) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
