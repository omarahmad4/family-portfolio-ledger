'use client';

/**
 * @file HoldingsPageClient.tsx
 * @description Interactive client wrapper for HoldingsPage.
 * Renders holdings views with tab toggles for owner breakdown vs full portfolio aggregation.
 */

import React, { useState, useMemo } from 'react';
import { money, number, pct, signedMoney } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';

interface OwnerHoldingsTableProps {
  ownerHoldings: any[];
  assetById: Map<string, any>;
  prices: Record<string, number>;
}

function OwnerHoldingsTable({ ownerHoldings, assetById, prices }: OwnerHoldingsTableProps) {
  // Pre-resolve symbol and type keys so that sorting works cleanly on computed fields
  const preparedRows = useMemo(() => {
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
  const [viewMode, setViewMode] = useState<'partner' | 'portfolio'>('partner');
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  // Aggregate holdings across all owners by assetId
  const aggregatedHoldings = useMemo(() => {
    const map = new Map<string, { assetId: string; quantity: number; costBasis: number; marketValue: number }>();
    for (const h of holdings) {
      const existing = map.get(h.assetId);
      if (existing) {
        existing.quantity += h.quantity;
        existing.costBasis += h.costBasis;
        existing.marketValue += h.marketValue;
      } else {
        map.set(h.assetId, {
          assetId: h.assetId,
          quantity: h.quantity,
          costBasis: h.costBasis,
          marketValue: h.marketValue,
        });
      }
    }
    return Array.from(map.values()).map((row) => {
      const unrealizedGainLoss = row.marketValue - row.costBasis;
      const unrealizedReturnPct = row.costBasis > 0 ? unrealizedGainLoss / row.costBasis : 0;
      return {
        ...row,
        unrealizedGainLoss,
        unrealizedReturnPct,
      };
    });
  }, [holdings]);

  // Full Portfolio breakdown high-level KPIs
  const portfolioKPIs = useMemo(() => {
    let marketValue = 0;
    let costBasis = 0;
    for (const row of ownerSummary) {
      marketValue += row.marketValue;
      costBasis += row.costBasis;
    }
    const gainLoss = marketValue - costBasis;
    const returnPct = costBasis > 0 ? gainLoss / costBasis : 0.0;
    return { marketValue, costBasis, gainLoss, returnPct };
  }, [ownerSummary]);

  return (
    <>
      {/* View Toggle Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
        <button 
          className="button" 
          style={{ 
            background: viewMode === 'partner' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', 
            color: viewMode === 'partner' ? '#38bdf8' : 'var(--muted)', 
            borderColor: viewMode === 'partner' ? '#38bdf8' : 'var(--border)',
            cursor: 'pointer'
          }}
          onClick={() => setViewMode('partner')}
        >
          Partner Breakdown
        </button>
        <button 
          className="button" 
          style={{ 
            background: viewMode === 'portfolio' ? 'rgba(56, 189, 248, 0.15)' : 'transparent', 
            color: viewMode === 'portfolio' ? '#38bdf8' : 'var(--muted)', 
            borderColor: viewMode === 'portfolio' ? '#38bdf8' : 'var(--border)',
            cursor: 'pointer'
          }}
          onClick={() => setViewMode('portfolio')}
        >
          Full Portfolio Breakdown
        </button>
      </div>

      {viewMode === 'partner' ? (
        /* 1. Partner Breakdown View Mode */
        owners.map((owner) => {
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
                    Holds {number(unitsOwned)} pool units ({(netWorthShare * 100).toFixed(2)}% net worth share)
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
        })
      ) : (
        /* 2. Full Portfolio Consolidated Breakdown View Mode */
        <>
          {/* Consolidated KPI Grid */}
          <section className="grid" style={{ marginBottom: 24 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: '0 0 6px' }}>Total Net Assets (NAV)</h3>
              <div className="metric" style={{ fontSize: '28px', fontWeight: 700 }}>
                {money(portfolioKPIs.marketValue)}
              </div>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: '0 0 6px' }}>Total Unrealized Return</h3>
              <div className={`metric ${portfolioKPIs.gainLoss >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '28px', fontWeight: 700 }}>
                {signedMoney(portfolioKPIs.gainLoss)} <span style={{ fontSize: '16px', fontWeight: 500 }}>({pct(portfolioKPIs.returnPct)})</span>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: '0 0 6px' }}>Total Capital Contributed</h3>
              <div className="metric" style={{ fontSize: '28px', fontWeight: 700, color: '#cbd5e1' }}>
                {money(portfolioKPIs.costBasis)}
              </div>
            </div>
          </section>

          <section className="card" data-testid="portfolio-section">
            <h3 style={{ margin: '0 0 14px', fontSize: '20px', color: 'var(--text)', fontWeight: 700 }}>
              Consolidated Fund Holdings
            </h3>
            <OwnerHoldingsTable 
              ownerHoldings={aggregatedHoldings} 
              assetById={assetById} 
              prices={prices} 
            />
          </section>
        </>
      )}
    </>
  );
}
