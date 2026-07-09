'use client';

/**
 * @file DashboardPageClient.tsx
 * @description Interactive client wrapper for the main Dashboard page.
 * Implements column-level sorting for the "Value by Partner" metrics.
 */

import React from 'react';
import { money, pct, signedMoney } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';
import AllocationChart from './AllocationChart';

interface DashboardPageClientProps {
  analytics: {
    totals: {
      marketValue: number;
      costBasis: number;
      unrealizedGainLoss: number;
      unrealizedReturnPct: number;
    };
    prices: Record<string, number>;
    holdings: any[];
    assets: any[];
    owners: any[];
    ownerSummary: any[];
    transactions: any[];
    decisionRows: any[];
  };
  cashBalance: number;
  cashDrag: number;
  usdAssetId?: string;
  chartData: Array<{ name: string; value: number }>;
  beatRate: number;
}

export default function DashboardPageClient({
  analytics,
  cashBalance,
  cashDrag,
  usdAssetId,
  chartData,
  beatRate,
}: DashboardPageClientProps) {
  // Pre-prepare row data to resolve owner names and handle numeric formats for clean sorting
  const preparedRows = React.useMemo(() => {
    return analytics.ownerSummary.map((row) => {
      const owner = analytics.owners.find((o) => o.id === row.ownerId);
      return {
        ...row,
        ownerName: owner?.name ?? row.ownerId,
        marketValue: Number(row.marketValue),
        costBasis: Number(row.costBasis),
        unrealizedGainLoss: Number(row.unrealizedGainLoss),
        unrealizedReturnPct: Number(row.unrealizedReturnPct),
      };
    });
  }, [analytics.ownerSummary, analytics.owners]);

  // Hook up sortable data
  const { items: sortedRows, requestSort, sortConfig } = useSortableData(preparedRows, {
    key: 'marketValue',
    order: 'desc',
  });

  return (
    <>
      {/* Main KPI & Chart Grid */}
      <section className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: 20 }}>
        {/* KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Total portfolio value (NAV)</h3>
            <div className="metric" data-testid="total-nav" style={{ fontSize: '32px' }}>
              {money(analytics.totals.marketValue)}
            </div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Net unrealized return</h3>
            <div className={`metric ${analytics.totals.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '32px' }}>
              {signedMoney(analytics.totals.unrealizedGainLoss)} <span style={{ fontSize: '18px', fontWeight: 500 }}>({pct(analytics.totals.unrealizedReturnPct)})</span>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Total capital invested</h3>
            <div className="metric" style={{ fontSize: '26px', color: '#cbd5e1' }}>
              {money(analytics.totals.costBasis)}
            </div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3>Cash drag %</h3>
            <div className="metric" data-testid="cash-drag" style={{ fontSize: '26px', color: cashDrag > 0.15 ? '#f59e0b' : '#38bdf8' }}>
              {pct(cashDrag)} <span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>({money(cashBalance)} idle)</span>
            </div>
          </div>
        </div>

        {/* Recharts Donut Exposure chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
          <h3 style={{ margin: 0 }}>Portfolio Exposure</h3>
          <AllocationChart data={chartData} />
        </div>
      </section>

      {/* Owner Value summary */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h3>Value by Partner</h3>
        <table className="table">
          <thead>
            <tr>
              <SortableHeader sortKey="ownerName" sortConfig={sortConfig} onRequestSort={requestSort}>Partner</SortableHeader>
              <SortableHeader sortKey="marketValue" sortConfig={sortConfig} onRequestSort={requestSort}>Market Value</SortableHeader>
              <SortableHeader sortKey="costBasis" sortConfig={sortConfig} onRequestSort={requestSort}>Capital Invested</SortableHeader>
              <SortableHeader sortKey="unrealizedGainLoss" sortConfig={sortConfig} onRequestSort={requestSort}>Net Gains/Losses</SortableHeader>
              <SortableHeader sortKey="unrealizedReturnPct" sortConfig={sortConfig} onRequestSort={requestSort}>Unrealized Return</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              return (
                <tr key={row.ownerId}>
                  <td style={{ fontWeight: 600 }}>{row.ownerName}</td>
                  <td>{money(row.marketValue)}</td>
                  <td>{money(row.costBasis)}</td>
                  <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                    {signedMoney(row.unrealizedGainLoss)}
                  </td>
                  <td className={row.unrealizedGainLoss >= 0 ? 'positive' : 'negative'}>
                    {pct(row.unrealizedReturnPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Bottom quick stats */}
      <section className="grid">
        <div className="card">
          <h3>Decision Beat Rate</h3>
          <div className="metric" style={{ color: beatRate >= 0.5 ? '#10b981' : '#f59e0b' }}>
            {pct(beatRate)} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>vs SPY benchmark</span>
          </div>
        </div>
        <div className="card">
          <h3>Asset classes held</h3>
          <div className="metric">
            {analytics.holdings.filter((h) => h.assetId !== usdAssetId).length} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>active positions</span>
          </div>
        </div>
        <div className="card">
          <h3>Ledger transactions</h3>
          <div className="metric">
            {analytics.transactions.length} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>total events</span>
          </div>
        </div>
      </section>
    </>
  );
}
