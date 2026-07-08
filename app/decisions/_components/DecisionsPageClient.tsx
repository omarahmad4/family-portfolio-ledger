'use client';

/**
 * @file DecisionsPageClient.tsx
 * @description Interactive client wrapper for DecisionsPage.
 * Implements column-level sorting and a toggle to hide automatic dividend reinvestments.
 */

import React, { useState } from 'react';
import { money, number, pct } from '@/lib/format';
import { useSortableData, SortableHeader } from '@/components/tables/SortableTable';

interface DecisionsPageClientProps {
  initialDecisionRows: any[];
}

export function DecisionsPageClient({ initialDecisionRows }: DecisionsPageClientProps) {
  const [hideReinvestments, setHideReinvestments] = useState(true);

  // 1. Filter out dividend reinvestments if toggled
  const filteredRows = React.useMemo(() => {
    if (!hideReinvestments) return initialDecisionRows;
    return initialDecisionRows.filter(
      (row) => row.notes !== 'Dividend Reinvestment'
    );
  }, [initialDecisionRows, hideReinvestments]);

  // 2. Hook up sorting
  const { items: sortedRows, requestSort, sortConfig } = useSortableData(filteredRows, {
    key: 'excessReturnPct',
    order: 'desc'
  });

  // Calculate live decision KPIs from current filtered selection
  const totalDecisions = sortedRows.length;
  const beatCount = sortedRows.filter((d: any) => d.excessReturnPct > 0).length;
  const beatRate = totalDecisions > 0 ? beatCount / totalDecisions : 0.0;

  const gpaValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const totalGPA = sortedRows.reduce((acc, r: any) => acc + (gpaValues[r.grade] ?? 0), 0);
  const avgGPA = totalDecisions > 0 ? totalGPA / totalDecisions : 0.0;

  const getLetterGPA = (gpa: number) => {
    if (gpa >= 3.5) return 'A';
    if (gpa >= 2.5) return 'B';
    if (gpa >= 1.5) return 'C';
    if (gpa >= 0.5) return 'D';
    return 'F';
  };

  const overallAlpha = totalDecisions > 0 
    ? sortedRows.reduce((acc, r: any) => acc + r.excessReturnPct, 0) / totalDecisions 
    : 0.0;

  return (
    <>
      {/* Decision KPIs */}
      <section className="grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Average Portfolio Grade</h3>
          <div className="metric" style={{ color: avgGPA >= 2.5 ? '#10b981' : '#fde68a' }}>
            {avgGPA.toFixed(2)} / 4.00 <span style={{ fontSize: '18px', fontWeight: 500 }}>({getLetterGPA(avgGPA)})</span>
          </div>
        </div>
        <div className="card">
          <h3>Alpha Beat Rate</h3>
          <div className="metric" style={{ color: beatRate >= 0.5 ? '#10b981' : '#f59e0b' }}>
            {pct(beatRate)} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>of cohorts outperform SPY</span>
          </div>
        </div>
        <div className="card">
          <h3>Average Excess Return (Alpha)</h3>
          <div className={`metric ${overallAlpha >= 0 ? 'positive' : 'negative'}`}>
            {overallAlpha >= 0 ? '+' : ''}{pct(overallAlpha)}
          </div>
        </div>
      </section>

      {/* Decision Table */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Decision Scorecards</h3>
          <label className="checkbox-row" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={hideReinvestments} 
              onChange={(e) => setHideReinvestments(e.target.checked)} 
              data-testid="toggle-reinvestments"
            />
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Hide Dividend Reinvestments</span>
          </label>
        </div>

        {sortedRows.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            No BUY decisions found. Try toggling off the reinvestment filter or importing data.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <SortableHeader sortKey="grade" sortConfig={sortConfig} onRequestSort={requestSort}>Grade</SortableHeader>
                <SortableHeader sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}>Asset</SortableHeader>
                <SortableHeader sortKey="tradeDate" sortConfig={sortConfig} onRequestSort={requestSort}>Trade Date</SortableHeader>
                <SortableHeader sortKey="quantity" sortConfig={sortConfig} onRequestSort={requestSort}>Original Qty</SortableHeader>
                <SortableHeader sortKey="grossAmount" sortConfig={sortConfig} onRequestSort={requestSort}>Staged Cost</SortableHeader>
                <SortableHeader sortKey="actualValue" sortConfig={sortConfig} onRequestSort={requestSort}>Current Value</SortableHeader>
                <SortableHeader sortKey="actualReturnPct" sortConfig={sortConfig} onRequestSort={requestSort}>Actual Return</SortableHeader>
                <SortableHeader sortKey="benchmarkReturnPct" sortConfig={sortConfig} onRequestSort={requestSort}>SPY Return</SortableHeader>
                <SortableHeader sortKey="excessReturnPct" sortConfig={sortConfig} onRequestSort={requestSort}>Excess Return</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: any) => {
                const actualVal = row.actualValue ?? 0;
                const invested = row.grossAmount ?? 0;
                const actReturn = row.actualReturnPct ?? 0;
                const bmkReturn = row.benchmarkReturnPct ?? 0;
                const excess = row.excessReturnPct ?? 0;

                return (
                  <tr key={row.id}>
                    <td>
                      <span className={`grade grade-${row.grade.toLowerCase()}`}>
                        {row.grade}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.symbol}</td>
                    <td>{new Date(row.tradeDate).toLocaleDateString()}</td>
                    <td>{number(row.quantity)}</td>
                    <td>{money(invested)}</td>
                    <td style={{ fontWeight: 500 }}>{money(actualVal)}</td>
                    <td className={actReturn >= 0 ? 'positive' : 'negative'}>
                      {pct(actReturn)}
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{pct(bmkReturn)}</td>
                    <td className={excess >= 0 ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                      {excess >= 0 ? '+' : ''}{pct(excess)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
