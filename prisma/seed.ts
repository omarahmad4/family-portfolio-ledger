import { PrismaClient, AssetType, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function createBuy(params: {
  accountId: string;
  assetId: string;
  date: string;
  quantity: number;
  price: number;
  notes: string;
  allocations: Array<{ ownerId: string; percentage: number }>;
}) {
  const grossAmount = params.quantity * params.price;
  await prisma.transaction.create({
    data: {
      accountId: params.accountId,
      assetId: params.assetId,
      type: TransactionType.BUY,
      tradeDate: new Date(params.date),
      quantity: params.quantity,
      price: params.price,
      grossAmount,
      notes: params.notes,
      allocations: {
        create: params.allocations.map((allocation) => ({
          ownerId: allocation.ownerId,
          percentage: allocation.percentage,
          amount: grossAmount * allocation.percentage,
          quantity: params.quantity * allocation.percentage,
        })),
      },
    },
  });
}

async function createSell(params: {
  accountId: string;
  assetId: string;
  date: string;
  quantity: number;
  price: number;
  notes: string;
  allocations: Array<{ ownerId: string; percentage: number }>;
}) {
  const grossAmount = params.quantity * params.price;
  await prisma.transaction.create({
    data: {
      accountId: params.accountId,
      assetId: params.assetId,
      type: TransactionType.SELL,
      tradeDate: new Date(params.date),
      quantity: params.quantity,
      price: params.price,
      grossAmount,
      notes: params.notes,
      allocations: {
        create: params.allocations.map((allocation) => ({
          ownerId: allocation.ownerId,
          percentage: allocation.percentage,
          amount: grossAmount * allocation.percentage,
          quantity: params.quantity * allocation.percentage,
        })),
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

  const account = await prisma.account.create({ data: { name: 'Shared Robinhood Account' } });

  const assets = await Promise.all([
    prisma.asset.create({ data: { symbol: 'AMZN', name: 'Amazon.com Inc.', type: AssetType.STOCK } }),
    prisma.asset.create({ data: { symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK } }),
    prisma.asset.create({ data: { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: AssetType.ETF } }),
    prisma.asset.create({ data: { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: AssetType.ETF } }),
    prisma.asset.create({ data: { symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO } }),
    prisma.asset.create({ data: { symbol: 'ETH', name: 'Ethereum', type: AssetType.CRYPTO } }),
  ]);
  const bySymbol = Object.fromEntries(assets.map((asset) => [asset.symbol, asset]));

  await prisma.price.createMany({
    data: [
      { assetId: bySymbol.AMZN.id, date: new Date('2026-06-01'), close: 185, source: 'seed' },
      { assetId: bySymbol.AAPL.id, date: new Date('2026-06-01'), close: 205, source: 'seed' },
      { assetId: bySymbol.SPY.id, date: new Date('2026-06-01'), close: 590, source: 'seed' },
      { assetId: bySymbol.QQQ.id, date: new Date('2026-06-01'), close: 515, source: 'seed' },
      { assetId: bySymbol.BTC.id, date: new Date('2026-06-01'), close: 69000, source: 'seed' },
      { assetId: bySymbol.ETH.id, date: new Date('2026-06-01'), close: 3600, source: 'seed' },
    ],
  });

  await createBuy({ accountId: account.id, assetId: bySymbol.AMZN.id, date: '2021-03-12', quantity: 50, price: 100, notes: 'Original AMZN family buy.', allocations: [{ ownerId: omar.id, percentage: 0.4 }, { ownerId: mom.id, percentage: 0.3 }, { ownerId: dad.id, percentage: 0.3 }] });
  await createBuy({ accountId: account.id, assetId: bySymbol.AAPL.id, date: '2022-05-10', quantity: 40, price: 145, notes: 'AAPL buy split between Mom and Dad.', allocations: [{ ownerId: mom.id, percentage: 0.5 }, { ownerId: dad.id, percentage: 0.5 }] });
  await createBuy({ accountId: account.id, assetId: bySymbol.SPY.id, date: '2023-01-06', quantity: 20, price: 380, notes: 'Core benchmark-like holding for Omar.', allocations: [{ ownerId: omar.id, percentage: 1 }] });
  await createBuy({ accountId: account.id, assetId: bySymbol.BTC.id, date: '2022-11-20', quantity: 0.15, price: 16600, notes: 'BTC buy for Omar.', allocations: [{ ownerId: omar.id, percentage: 1 }] });
  await createBuy({ accountId: account.id, assetId: bySymbol.ETH.id, date: '2023-09-15', quantity: 2, price: 1650, notes: 'ETH buy for Dad.', allocations: [{ ownerId: dad.id, percentage: 1 }] });
  await createSell({ accountId: account.id, assetId: bySymbol.AMZN.id, date: '2024-07-01', quantity: 10, price: 190, notes: 'Partial AMZN trim using same family split.', allocations: [{ ownerId: omar.id, percentage: 0.4 }, { ownerId: mom.id, percentage: 0.3 }, { ownerId: dad.id, percentage: 0.3 }] });

  console.log('Seed complete.');
}

main().finally(async () => prisma.$disconnect());
