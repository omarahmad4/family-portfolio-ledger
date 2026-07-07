import { PrismaClient, AssetType, TransactionType } from '@prisma/client';
import { calculatePortfolioValue, calculateTotalUnits, getOwnerShares, TransactionInput } from '../lib/accounting/pool';

const prisma = new PrismaClient();

// Helper to construct a temporary TransactionInput from DB record
function toInputTx(tx: any, assetSymbol?: string): TransactionInput {
  return {
    id: tx.id,
    type: tx.type,
    tradeDate: tx.tradeDate.toISOString(),
    assetId: tx.assetId,
    assetSymbol: assetSymbol ?? null,
    quantity: tx.quantity ? Number(tx.quantity) : null,
    price: tx.price ? Number(tx.price) : null,
    grossAmount: Number(tx.grossAmount),
    fee: Number(tx.fee),
    allocations: tx.allocations.map((a: any) => ({
      ownerId: a.ownerId,
      percentage: Number(a.percentage),
      amount: Number(a.amount),
      quantity: a.quantity ? Number(a.quantity) : null,
    })),
  };
}

async function getHistoricalTransactions(beforeDate: Date): Promise<TransactionInput[]> {
  const txs = await prisma.transaction.findMany({
    where: { tradeDate: { lt: beforeDate } },
    include: { allocations: true, asset: true },
  });
  return txs.map((tx) => toInputTx(tx, tx.asset?.symbol));
}

// Simple lookup map for historical price simulations in seed math
const seedPricesAtDate: Record<string, Record<string, number>> = {
  // '2023-09-15': prices before Dad's deposit
  '2023-09-15': {
    AMZN: 130,
    AAPL: 175,
    BTC: 26000,
    USD: 1,
  },
};

async function createDeposit(params: {
  accountId: string;
  ownerId: string;
  date: string;
  amount: number;
  notes: string;
}) {
  const dateObj = new Date(params.date);
  const historicalTxs = await getHistoricalTransactions(dateObj);
  
  // Fetch prices as of this date for valuation (or fallback to seed default close)
  const prices = seedPricesAtDate[params.date] ?? { AMZN: 100, AAPL: 145, BTC: 16600, USD: 1 };
  
  const portfolioValue = calculatePortfolioValue(historicalTxs, prices);
  const totalUnits = calculateTotalUnits(historicalTxs);
  const navpu = totalUnits <= 0 ? 1.0 : portfolioValue / totalUnits;
  const unitsIssued = params.amount / navpu;

  await prisma.transaction.create({
    data: {
      accountId: params.accountId,
      type: TransactionType.DEPOSIT,
      tradeDate: dateObj,
      grossAmount: params.amount,
      notes: params.notes,
      allocations: {
        create: {
          ownerId: params.ownerId,
          percentage: 1.0,
          amount: params.amount,
          quantity: unitsIssued, // Storing issued units in quantity
        },
      },
    },
  });
}

async function createBuy(params: {
  accountId: string;
  assetId: string;
  symbol: string;
  date: string;
  quantity: number;
  price: number;
  notes: string;
  ownerIds: string[];
}) {
  const dateObj = new Date(params.date);
  const historicalTxs = await getHistoricalTransactions(dateObj);
  const shares = getOwnerShares(historicalTxs, params.ownerIds);

  const grossAmount = params.quantity * params.price;

  await prisma.transaction.create({
    data: {
      accountId: params.accountId,
      assetId: params.assetId,
      type: TransactionType.BUY,
      tradeDate: dateObj,
      quantity: params.quantity,
      price: params.price,
      grossAmount,
      notes: params.notes,
      allocations: {
        create: params.ownerIds.map((ownerId) => {
          const pct = shares[ownerId] ?? 0;
          return {
            ownerId,
            percentage: pct,
            amount: grossAmount * pct,
            quantity: params.quantity * pct,
          };
        }),
      },
    },
  });
}

async function createSell(params: {
  accountId: string;
  assetId: string;
  symbol: string;
  date: string;
  quantity: number;
  price: number;
  notes: string;
  ownerIds: string[];
}) {
  const dateObj = new Date(params.date);
  const historicalTxs = await getHistoricalTransactions(dateObj);
  const shares = getOwnerShares(historicalTxs, params.ownerIds);

  const grossAmount = params.quantity * params.price;

  await prisma.transaction.create({
    data: {
      accountId: params.accountId,
      assetId: params.assetId,
      type: TransactionType.SELL,
      tradeDate: dateObj,
      quantity: params.quantity,
      price: params.price,
      grossAmount,
      notes: params.notes,
      allocations: {
        create: params.ownerIds.map((ownerId) => {
          const pct = shares[ownerId] ?? 0;
          return {
            ownerId,
            percentage: pct,
            amount: grossAmount * pct,
            quantity: params.quantity * pct,
          };
        }),
      },
    },
  });
}

async function main() {
  await prisma.decisionScore.deleteMany();
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.benchmarkSnapshot.deleteMany();
  await prisma.price.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.transactionAllocation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.account.deleteMany();
  await prisma.owner.deleteMany();

  const [omar, mom, dad] = await Promise.all([
    prisma.owner.create({ data: { name: 'Omar', slug: 'omar' } }),
    prisma.owner.create({ data: { name: 'Mom', slug: 'mom' } }),
    prisma.owner.create({ data: { name: 'Dad', slug: 'dad' } }),
  ]);

  const ownerIds = [omar.id, mom.id, dad.id];
  const account = await prisma.account.create({ data: { name: 'Shared Robinhood Account' } });

  const assets = await Promise.all([
    prisma.asset.create({ data: { symbol: 'AMZN', name: 'Amazon.com Inc.', type: AssetType.STOCK } }),
    prisma.asset.create({ data: { symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK } }),
    prisma.asset.create({ data: { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: AssetType.ETF } }),
    prisma.asset.create({ data: { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: AssetType.ETF } }),
    prisma.asset.create({ data: { symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO } }),
    prisma.asset.create({ data: { symbol: 'ETH', name: 'Ethereum', type: AssetType.CRYPTO } }),
    prisma.asset.create({ data: { symbol: 'USD', name: 'US Dollar', type: AssetType.CASH } }),
  ]);
  const bySymbol = Object.fromEntries(assets.map((asset) => [asset.symbol, asset]));

  // Setup current EOD close prices (as of 2026-06-01)
  await prisma.price.createMany({
    data: [
      { assetId: bySymbol.AMZN.id, date: new Date('2026-06-01'), close: 185, source: 'seed' },
      { assetId: bySymbol.AAPL.id, date: new Date('2026-06-01'), close: 205, source: 'seed' },
      { assetId: bySymbol.SPY.id, date: new Date('2026-06-01'), close: 590, source: 'seed' },
      { assetId: bySymbol.QQQ.id, date: new Date('2026-06-01'), close: 515, source: 'seed' },
      { assetId: bySymbol.BTC.id, date: new Date('2026-06-01'), close: 69000, source: 'seed' },
      { assetId: bySymbol.ETH.id, date: new Date('2026-06-01'), close: 3600, source: 'seed' },
      { assetId: bySymbol.USD.id, date: new Date('2026-06-01'), close: 1, source: 'seed' },
    ],
  });

  // 1. Omar deposits capital
  await createDeposit({ accountId: account.id, ownerId: omar.id, date: '2021-01-01', amount: 10000, notes: 'Omar initial seed capital.' });

  // 2. Mom deposits capital
  await createDeposit({ accountId: account.id, ownerId: mom.id, date: '2021-02-01', amount: 8000, notes: 'Mom seed capital.' });

  // 3. Buy AMZN (Split dynamically: Omar ~55.56%, Mom ~44.44%)
  await createBuy({ accountId: account.id, assetId: bySymbol.AMZN.id, symbol: 'AMZN', date: '2021-03-12', quantity: 50, price: 100, notes: 'AMZN buy for portfolio.', ownerIds });

  // 4. Buy AAPL (Split dynamically: Omar ~55.56%, Mom ~44.44%)
  await createBuy({ accountId: account.id, assetId: bySymbol.AAPL.id, symbol: 'AAPL', date: '2022-05-10', quantity: 40, price: 145, notes: 'AAPL buy for portfolio.', ownerIds });

  // 5. Buy BTC (Split dynamically: Omar ~55.56%, Mom ~44.44%)
  await createBuy({ accountId: account.id, assetId: bySymbol.BTC.id, symbol: 'BTC', date: '2022-11-20', quantity: 0.15, price: 16600, notes: 'BTC buy for portfolio.', ownerIds });

  // 6. Dad deposits capital (NAVPU calculated immediately before using historical simulated prices)
  await createDeposit({ accountId: account.id, ownerId: dad.id, date: '2023-09-15', amount: 6000, notes: 'Dad capital addition.' });

  // 7. Sell AMZN (Split dynamically: Omar ~43.70%, Mom ~34.96%, Dad ~21.35%)
  await createSell({ accountId: account.id, assetId: bySymbol.AMZN.id, symbol: 'AMZN', date: '2024-07-01', quantity: 10, price: 190, notes: 'Trim AMZN.', ownerIds });

  console.log('Seed complete.');
}

main().finally(async () => prisma.$disconnect());
