import type { HoldingSummary, LedgerTransaction, PriceMap } from '@/lib/types/domain';

interface PositionAccumulator {
  ownerId: string;
  assetId: string;
  quantity: number;
  costBasis: number;
}

function key(ownerId: string, assetId: string): string {
  return `${ownerId}::${assetId}`;
}

function safePct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Computes current owner-level holdings from normalized ledger transactions.
 * V1 assumption: weighted average cost basis for summary views.
 * Lot-level FIFO lives separately in lots.ts.
 */
export function computeHoldings(transactions: LedgerTransaction[], prices: PriceMap): HoldingSummary[] {
  const positions = new Map<string, PositionAccumulator>();

  const sorted = [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  for (const tx of sorted) {
    if (!tx.assetId) continue;

    for (const allocation of tx.allocations) {
      const positionKey = key(allocation.ownerId, tx.assetId);
      const existing = positions.get(positionKey) ?? {
        ownerId: allocation.ownerId,
        assetId: tx.assetId,
        quantity: 0,
        costBasis: 0,
      };

      const quantity = allocation.quantity ?? 0;
      const amount = allocation.amount;
      const fee = (tx.fee ?? 0) * allocation.percentage;

      switch (tx.type) {
        case 'BUY':
        case 'TRANSFER_IN': {
          existing.quantity += quantity;
          existing.costBasis += Math.abs(amount) + fee;
          break;
        }
        case 'SELL':
        case 'TRANSFER_OUT': {
          if (existing.quantity <= 0) break;
          const sellQuantity = Math.abs(quantity);
          const basisPerShare = existing.costBasis / existing.quantity;
          existing.quantity -= sellQuantity;
          existing.costBasis -= basisPerShare * sellQuantity;
          if (Math.abs(existing.quantity) < 1e-9) {
            existing.quantity = 0;
            existing.costBasis = 0;
          }
          break;
        }
        case 'SPLIT': {
          // Represent split ratio in quantity for V1: e.g. 20 means 20-for-1.
          if (quantity && quantity > 0) existing.quantity *= quantity;
          break;
        }
        default:
          break;
      }

      positions.set(positionKey, existing);
    }
  }

  return [...positions.values()]
    .filter((p) => Math.abs(p.quantity) > 1e-9)
    .map((p) => {
      const price = prices[p.assetId] ?? 0;
      const marketValue = p.quantity * price;
      const unrealizedGainLoss = marketValue - p.costBasis;
      return {
        ownerId: p.ownerId,
        assetId: p.assetId,
        quantity: p.quantity,
        costBasis: p.costBasis,
        marketValue,
        unrealizedGainLoss,
        unrealizedReturnPct: safePct(unrealizedGainLoss, p.costBasis),
      };
    });
}

export function summarizeByOwner(holdings: HoldingSummary[]) {
  const rows = new Map<string, { ownerId: string; marketValue: number; costBasis: number; unrealizedGainLoss: number }>();

  for (const h of holdings) {
    const existing = rows.get(h.ownerId) ?? { ownerId: h.ownerId, marketValue: 0, costBasis: 0, unrealizedGainLoss: 0 };
    existing.marketValue += h.marketValue;
    existing.costBasis += h.costBasis;
    existing.unrealizedGainLoss += h.unrealizedGainLoss;
    rows.set(h.ownerId, existing);
  }

  return [...rows.values()].map((row) => ({
    ...row,
    unrealizedReturnPct: safePct(row.unrealizedGainLoss, row.costBasis),
  }));
}
