'use client';

/**
 * @file HoldingsPageClient.tsx
 * @description Interactive client wrapper for HoldingsPage.
 * Renders owner positions tables equipped with column-level sorting.
 */

import React from 'react';
import { money, number, pct, signedMoney } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';

interface OwnerHoldingsTableProps {
  ownerHoldings: any[];
  assetById: Map<string, any>;
  prices: Record<string, number>;
}

function OwnerHoldingsTable({ ownerHoldings, assetById, prices }: OwnerHoldingsTableProps) {
  // Pre-resolve symbol and type keys so that sorting works cleanly on computed fields
  const preparedRows = React.useMemo(() => {
    return ownerHoldings.map((row) => {
      const asset = assetById.get(row.assetId);
      const isCash = asset?.type === 'CASH';
      const currentPrice = isCash ? 1.0 : (prices[row.assetId] ?? 0);
      return {
        ...row,
        symbol: asset?.symbol ?? row.assetId,
        assetName: asset?.name || '',
        assetType: asset?.type || '',
        currentPrice,
        isCash,
      };
    });
  }, [ownerHoldings, assetById, prices]);

  const { items: sortedRows, requestSort, sortConfig } = useSortableData(preparedRows, {
    key: 'marketValue',
    order: 'desc'
  });

  return (
    <table className="table">
      <thead>
        <tr>
          <SortableHeader sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}>Asset</SortableHeader>
          <SortableHeader sortKey="assetType" sortConfig={sortConfig} onRequestSort={requestSort}>Type</SortableHeader>
          <SortableHeader sortKey="quantity" sortConfig={sortConfig} onRequestSort={requestSort}>Quantity</SortableHeader>
          <SortableHeader sortKey="currentPrice" sortConfig={sortConfig} onRequestSort={requestSort}>Current Price</SortableHeader>
          <SortableHeader sortKey="marketValue" sortConfig={sortConfig} onRequestSort={requestSort}>Market Value</SortableHeader>
          <SortableHeader sortKey="costBasis" sortConfig={sortConfig} onRequestSort={requestSort}>Cost Basis</SortableHeader>
          <SortableHeader sortKey="unrealizedGainLoss" sortConfig={sortConfig} onRequestSort={requestSort}>Gain/Loss</SortableHeader>
          <SortableHeader sortKey="unrealizedReturnPct" sortConfig={sortConfig} onRequestSort={requestSort}>Return</SortableHeader>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => {
          return (
            <tr key={row.assetId}>
              <td style={{ fontWeight: 600 }}>
                {row.symbol}
                {!row.isCash && (
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                    {row.assetName}
                  </span>
                )}
              </td>
              <td>
                <span style={{
                  fontSize: '11px',
                  background: row.isCash ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.06)',
                  color: row.isCash ? '#38bdf8' : 'var(--text)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 500
                }}>
                  {row.assetType}
                </span>
              </td>
              <td>{row.isCash ? '—' : number(row.quantity)}</td>
              <td>{row.isCash ? '—' : money(row.currentPrice)}</td>
              <td style={{ fontWeight: 500 }}>{money(row.marketValue)}</td>
              <td>{money(row.costBasis)}</td>
              {row.isCash ? (
                <td style={{ color: 'var(--muted)' }}>—</td>
              ) : (
                <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                  {signedMoney(row.unrealizedGainLoss)}
                </td>
              )}
              {row.isCash ? (
                <td style={{ color: 'var(--muted)' }}>—</td>
              ) : (
                <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                  {pct(row.unrealizedReturnPct)}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface HoldingsPageClientProps {
  owners: any[];
  holdings: any[];
  ownerSummary: any[];
  prices: Record<string, number>;
  assets: any[];
  totalUnits: number;
  ownerUnitsMap: Record<string, number>;
}

export function HoldingsPageClient({
  owners,
  holdings,
  ownerSummary,
  prices,
  assets,
  totalUnits,
  ownerUnitsMap,
}: HoldingsPageClientProps) {
  const assetById = React.useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  return (
    <>
      {owners.map((owner) => {
        const ownerHoldings = holdings.filter((h) => h.ownerId === owner.id);
        const ownerSummaryRow = ownerSummary.find((s) => s.ownerId === owner.id);

        const unitsOwned = ownerUnitsMap[owner.id] ?? 0;
        const netWorthShare = totalUnits > 0 ? unitsOwned / totalUnits : 0.0;

        if (ownerHoldings.length === 0) {
          return null;
        }

        const totalValue = ownerSummaryRow?.marketValue ?? 0;
        const totalGain = ownerSummaryRow?.unrealizedGainLoss ?? 0;
        const totalPct = ownerSummaryRow?.unrealizedReturnPct ?? 0;

        return (
          <section key={owner.id} data-testid="owner-section" className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text)', fontWeight: 700 }}>
                  {owner.name}&apos;s Ledger Portfolio
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Holds {number(unitsOwned)} pool units ({pct(netWorthShare)} net worth share)
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  {money(totalValue)}
                </span>
                <div style={{ fontSize: '12px' }} className={totalGain >= 0 ? 'positive' : 'negative'}>
                  {signedMoney(totalGain)} ({pct(totalPct)})
                </div>
              </div>
            </div>

            <OwnerHoldingsTable 
              ownerHoldings={ownerHoldings} 
              assetById={assetById} 
              prices={prices} 
            />
          </section>
        );
      })}
    </>
  );
}
