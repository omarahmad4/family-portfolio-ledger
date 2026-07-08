/**
 * @file lots.ts
 * @description Core accounting module to build FIFO (First-In, First-Out) transaction lots
 * at the pool level. This logic is used by the decision scorecard system to track decision quality.
 */

import type { LedgerTransaction } from '@/lib/types/domain';

export interface LotState {
  id: string;
  ownerId: string;
  assetId: string;
  sourceTransactionId: string;
  openedAt: string;
  originalQuantity: number;
  remainingQuantity: number;
  costBasis: number;
  realizedProceeds: number;
  realizedGainLoss: number;
  originalCostBasis: number;
  sales: Array<{
    sellTransactionId: string;
    sellDate: string;
    quantity: number;
    proceeds: number;
  }>;
}

/**
 * Builds FIFO transaction lots from chronological transactions at the pool level.
 * Traces buy lots and applies sales to reduce remaining quantities in FIFO order.
 * 
 * @param transactions Chronological list of ledger transactions.
 * @returns Array of calculated FIFO lots.
 */
export function buildFifoLots(transactions: LedgerTransaction[]): LotState[] {
  const lots: LotState[] = [];
  const sorted = [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  for (const tx of sorted) {
    if (!tx.assetId) continue;

    const quantity = Math.abs(tx.quantity ?? 0);
    const amount = Math.abs(tx.grossAmount);
    const fee = Math.abs(tx.fee ?? 0);

    if ((tx.type === 'BUY' || tx.type === 'TRANSFER_IN') && quantity > 0) {
      lots.push({
        id: tx.id,
        ownerId: 'pool',
        assetId: tx.assetId,
        sourceTransactionId: tx.id,
        openedAt: tx.tradeDate,
        originalQuantity: quantity,
        remainingQuantity: quantity,
        costBasis: amount + fee,
        realizedProceeds: 0,
        realizedGainLoss: 0,
        originalCostBasis: amount + fee,
        sales: [],
      });
    }

    if (tx.type === 'SPLIT') {
      const splitRatio = tx.quantity;
      if (splitRatio && splitRatio > 0) {
        const poolLots = lots.filter(
          (lot) => lot.assetId === tx.assetId && lot.remainingQuantity > 1e-9
        );
        for (const lot of poolLots) {
          lot.originalQuantity *= splitRatio;
          lot.remainingQuantity *= splitRatio;
        }
      }
    }

    if ((tx.type === 'SELL' || tx.type === 'TRANSFER_OUT') && quantity > 0) {
      let remainingToSell = quantity;
      const proceeds = amount - fee;
      const proceedsPerUnit = proceeds / quantity;

      const openLots = lots
        .filter((lot) => lot.assetId === tx.assetId && lot.remainingQuantity > 1e-9)
        .sort((a, b) => a.openedAt.localeCompare(b.openedAt));

      for (const lot of openLots) {
        if (remainingToSell <= 1e-9) break;
        const soldFromLot = Math.min(lot.remainingQuantity, remainingToSell);
        const basisPerUnit = lot.costBasis / lot.remainingQuantity;
        const basisSold = basisPerUnit * soldFromLot;
        const proceedsSold = proceedsPerUnit * soldFromLot;

        lot.remainingQuantity -= soldFromLot;
        lot.costBasis -= basisSold;
        lot.realizedProceeds += proceedsSold;
        lot.realizedGainLoss += proceedsSold - basisSold;
        lot.sales.push({
          sellTransactionId: tx.id,
          sellDate: tx.tradeDate,
          quantity: soldFromLot,
          proceeds: proceedsSold,
        });
        remainingToSell -= soldFromLot;

        if (Math.abs(lot.remainingQuantity) < 1e-9) {
          lot.remainingQuantity = 0;
          lot.costBasis = 0;
        }
      }
    }
  }

  return lots;
}
