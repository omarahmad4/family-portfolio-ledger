import type { HoldingSummary, LedgerTransaction, PriceMap } from '@/lib/types/domain';
import { calculateNetCash, getOwnerShares } from './pool';

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
interface PoolPosition {
  assetId: string;
  quantity: number;
  costBasis: number;
}

export function computePoolHoldings(transactions: LedgerTransaction[]): PoolPosition[] {
  const positions = new Map<string, PoolPosition>();
  const sorted = [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  for (const tx of sorted) {
    if (!tx.assetId) continue;

    const existing = positions.get(tx.assetId) ?? {
      assetId: tx.assetId,
      quantity: 0,
      costBasis: 0,
    };

    const quantity = tx.quantity ?? 0;
    const amount = tx.grossAmount;
    const fee = tx.fee ?? 0;

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
        if (quantity && quantity > 0) {
          existing.quantity *= quantity;
        }
        break;
      }
      default:
        break;
    }

    positions.set(tx.assetId, existing);
  }

  return [...positions.values()].filter((p) => Math.abs(p.quantity) > 1e-9);
}

/**
 * Computes current owner-level holdings from normalized ledger transactions.
 * Calculates pool-level positions and distributes them based on owner pool shares.
 */
export function computeHoldings(
  transactions: LedgerTransaction[],
  prices: PriceMap,
  ownerIds?: string[],
  usdAssetId?: string
): HoldingSummary[] {
  const poolHoldings = computePoolHoldings(transactions);
  
  const resolvedOwnerIds = ownerIds ?? Array.from(new Set(transactions.flatMap((tx) => tx.allocations.map((a) => a.ownerId))));
  const shares = getOwnerShares(transactions as any, resolvedOwnerIds);

  const list: HoldingSummary[] = [];

  for (const ownerId of resolvedOwnerIds) {
    const share = shares[ownerId] ?? 0;
    if (share <= 0) continue;

    for (const ph of poolHoldings) {
      const quantity = ph.quantity * share;
      const costBasis = ph.costBasis * share;
      const price = prices[ph.assetId] ?? 0;
      const marketValue = quantity * price;
      const unrealizedGainLoss = marketValue - costBasis;

      list.push({
        ownerId,
        assetId: ph.assetId,
        quantity,
        costBasis,
        marketValue,
        unrealizedGainLoss,
        unrealizedReturnPct: safePct(unrealizedGainLoss, costBasis),
      });
    }
  }

  // Inject cash holdings if usdAssetId is provided
  if (usdAssetId) {
    const cashBalance = calculateNetCash(transactions as any);
    for (const ownerId of resolvedOwnerIds) {
      const share = shares[ownerId] ?? 0;
      const ownerCash = share * cashBalance;
      if (Math.abs(ownerCash) > 1e-9) {
        list.push({
          ownerId,
          assetId: usdAssetId,
          quantity: ownerCash,
          costBasis: ownerCash,
          marketValue: ownerCash,
          unrealizedGainLoss: 0,
          unrealizedReturnPct: 0,
        });
      }
    }
  }

  return list;
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
