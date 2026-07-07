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
}

/**
 * Builds FIFO lots from ledger transactions.
 * This is the calculation that powers cohort analysis.
 */
export function buildFifoLots(transactions: LedgerTransaction[]): LotState[] {
  const lots: LotState[] = [];
  const sorted = [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  for (const tx of sorted) {
    if (!tx.assetId) continue;

    for (const allocation of tx.allocations) {
      const quantity = Math.abs(allocation.quantity ?? 0);
      const amount = Math.abs(allocation.amount);
      const fee = Math.abs(tx.fee ?? 0) * allocation.percentage;

      if ((tx.type === 'BUY' || tx.type === 'TRANSFER_IN') && quantity > 0) {
        lots.push({
          id: `${tx.id}:${allocation.ownerId}`,
          ownerId: allocation.ownerId,
          assetId: tx.assetId,
          sourceTransactionId: tx.id,
          openedAt: tx.tradeDate,
          originalQuantity: quantity,
          remainingQuantity: quantity,
          costBasis: amount + fee,
          realizedProceeds: 0,
          realizedGainLoss: 0,
          originalCostBasis: amount + fee,
        });
      }

      if (tx.type === 'SPLIT') {
        const splitRatio = tx.quantity;
        if (splitRatio && splitRatio > 0) {
          const ownerLots = lots.filter(
            (lot) => lot.ownerId === allocation.ownerId && lot.assetId === tx.assetId && lot.remainingQuantity > 1e-9
          );
          for (const lot of ownerLots) {
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
          .filter((lot) => lot.ownerId === allocation.ownerId && lot.assetId === tx.assetId && lot.remainingQuantity > 1e-9)
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
          remainingToSell -= soldFromLot;

          if (Math.abs(lot.remainingQuantity) < 1e-9) {
            lot.remainingQuantity = 0;
            lot.costBasis = 0;
          }
        }
      }
    }
  }

  return lots;
}
