'use client';

/**
 * @file SortableTable.tsx
 * @description Reusable React hook and custom components to add ascending/descending/none sorting to HTML tables.
 */

import React, { useState, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  order: SortOrder;
}

/**
 * Helper to resolve nested object values by path string (e.g. 'asset.symbol')
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    
    // Support Prisma Decimal properties that have a toNumber method
    const val = acc[part];
    if (val && typeof val === 'object' && 'toNumber' in val && typeof val.toNumber === 'function') {
      return val.toNumber();
    }
    return val;
  }, obj);
}

/**
 * Custom hook to sort arrays of data objects dynamically by key or path.
 * Cycles sort order: asc -> desc -> off
 * 
 * @param items The raw array of data objects
 * @param defaultSort Optional default sorting configuration
 */
export function useSortableData<T>(items: T[], defaultSort: SortConfig | null = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort);

  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig && sortConfig.order) {
      sortableItems.sort((a: any, b: any) => {
        let aVal = getNestedValue(a, sortConfig.key);
        let bVal = getNestedValue(b, sortConfig.key);

        // Normalize undefined or null to bottom
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        // If string, perform locale-sensitive case-insensitive compare
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.order === 'asc'
            ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
            : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' });
        }

        // Date sorting check
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortConfig.order === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        // Try date string check
        const aTime = Date.parse(aVal);
        const bTime = Date.parse(bVal);
        if (!isNaN(aTime) && !isNaN(bTime) && typeof aVal === 'string') {
          return sortConfig.order === 'asc' ? aTime - bTime : bTime - aTime;
        }

        // Fallback numeric/general sorting
        if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let nextOrder: SortOrder = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.order === 'asc') {
        nextOrder = 'desc';
      } else if (sortConfig.order === 'desc') {
        nextOrder = null;
      }
    }
    setSortConfig(nextOrder ? { key, order: nextOrder } : null);
  };

  return { items: sortedItems, requestSort, sortConfig };
}

interface SortableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  sortConfig: SortConfig | null;
  onRequestSort: (key: string) => void;
  children: React.ReactNode;
}

/**
 * Reusable sortable table header <th> element with click toggle and sort icon indicator.
 */
export function SortableHeader({
  sortKey,
  sortConfig,
  onRequestSort,
  children,
  className = '',
  ...props
}: SortableHeaderProps) {
  const isSorted = sortConfig && sortConfig.key === sortKey;
  const order = isSorted ? sortConfig.order : null;

  let indicator = '⇅';
  if (order === 'asc') indicator = '▲';
  if (order === 'desc') indicator = '▼';

  return (
    <th
      className={`sortable ${className}`}
      onClick={() => onRequestSort(sortKey)}
      style={{ userSelect: 'none', cursor: 'pointer' }}
      {...props}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span>{children}</span>
        <span className="sort-indicator" style={{ opacity: isSorted ? 1 : 0.35, fontSize: '10px' }}>
          {indicator}
        </span>
      </div>
    </th>
  );
}
