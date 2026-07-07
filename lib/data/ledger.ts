import { prisma } from '@/lib/db/prisma';
import type { LedgerTransaction, PriceMap } from '@/lib/types/domain';

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export async function getOwners() {
  return prisma.owner.findMany({ orderBy: { name: 'asc' } });
}

export async function getAssets() {
  return prisma.asset.findMany({ orderBy: { symbol: 'asc' } });
}

export async function getAccounts() {
  return prisma.account.findMany({ orderBy: { name: 'asc' } });
}

export async function getLedgerTransactions(): Promise<LedgerTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    include: { allocations: true, asset: true, account: true },
    orderBy: [{ tradeDate: 'asc' }, { createdAt: 'asc' }],
  });

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    tradeDate: tx.tradeDate.toISOString(),
    assetId: tx.assetId ?? undefined,
    quantity: tx.quantity == null ? undefined : toNumber(tx.quantity),
    price: tx.price == null ? undefined : toNumber(tx.price),
    grossAmount: toNumber(tx.grossAmount),
    fee: toNumber(tx.fee),
    allocations: tx.allocations.map((allocation) => ({
      ownerId: allocation.ownerId,
      percentage: toNumber(allocation.percentage),
      amount: toNumber(allocation.amount),
      quantity: allocation.quantity == null ? undefined : toNumber(allocation.quantity),
    })),
  }));
}

export async function getLatestPrices(): Promise<PriceMap> {
  const assets = await prisma.asset.findMany({ include: { prices: { orderBy: { date: 'desc' }, take: 1 } } });
  const prices: PriceMap = {};
  for (const asset of assets) {
    const latest = asset.prices[0];
    if (latest) prices[asset.id] = toNumber(latest.close);
  }
  return prices;
}

export async function getHydratedTransactions() {
  return prisma.transaction.findMany({
    include: { account: true, asset: true, allocations: { include: { owner: true } } },
    orderBy: [{ tradeDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getReferenceData() {
  const [owners, assets, accounts] = await Promise.all([getOwners(), getAssets(), getAccounts()]);
  return { owners, assets, accounts };
}
