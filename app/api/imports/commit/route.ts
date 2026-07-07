import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { z } from 'zod';
import { AssetType, BenchmarkType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { normalizeRobinhoodRow } from '@/lib/robinhood-import/normalize';
import { calculatePortfolioValue, calculateTotalUnits, getOwnerShares, TransactionInput } from '@/lib/accounting/pool';

const commitSchema = z.object({
  csv: z.string().min(1),
  accountId: z.string().min(1),
  defaultOwnerId: z.string().min(1),
  allocationOwnerIds: z.array(z.string()).min(1),
});

// Helper to convert DB transaction row to TransactionInput format for math calculations
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = commitSchema.parse(body);

    const [existingAssets, owners] = await Promise.all([
      prisma.asset.findMany(),
      prisma.owner.findMany(),
    ]);

    const ownerSet = new Set(owners.map((o) => o.id));
    const activeOwnerIds = input.allocationOwnerIds.filter((id) => ownerSet.has(id));
    if (activeOwnerIds.length === 0) {
      return NextResponse.json({ error: 'No valid allocation owners selected.' }, { status: 400 });
    }
    if (!ownerSet.has(input.defaultOwnerId)) {
      return NextResponse.json({ error: 'Invalid default owner selected.' }, { status: 400 });
    }

    // 1. Ingest CSV data
    const parsed = Papa.parse<Record<string, string>>(input.csv, { header: true, skipEmptyLines: true });
    
    // Create an in-memory mutable list of assets to resolve creations on the fly
    const assetsList = [...existingAssets];
    const assetLookup = (sym: string) => {
      const upper = sym.toUpperCase().trim();
      return assetsList.find((a) => a.symbol === upper);
    };

    // Load all current transactions from the database as base context
    const dbTransactions = await prisma.transaction.findMany({
      include: { allocations: true, asset: true },
    });
    
    // Maintain a running list of prior transactions (DB + newly resolved in this import loop)
    // sorted chronologically to compute progressive NAVPU and ownership splits
    const runningTxs: TransactionInput[] = dbTransactions.map((tx) => toInputTx(tx, tx.asset?.symbol));

    const toCommit: any[] = [];
    let skippedCount = 0;

    for (const row of parsed.data) {
      // Clean symbol resolution or creation
      const symbolKey = row['Symbol'] || row['Instrument'] || row['Ticker'];
      let assetId: string | undefined = undefined;

      if (symbolKey) {
        const upperSymbol = symbolKey.toUpperCase().trim();
        let found = assetLookup(upperSymbol);
        if (!found) {
          // Create missing asset in database immediately to have valid assetId
          const isCrypto = ['BTC', 'ETH', 'SOL'].includes(upperSymbol);
          const newAsset = await prisma.asset.create({
            data: {
              symbol: upperSymbol,
              name: `${upperSymbol} Stock`,
              type: isCrypto ? AssetType.CRYPTO : AssetType.STOCK,
            },
          });
          assetsList.push(newAsset);
          found = newAsset;
        }
        assetId = found.id;
      }

      // Run baseline normalization (places placeholder allocations)
      const mockAllocations = [{ ownerId: input.defaultOwnerId, percentage: 1.0 }];
      const norm = normalizeRobinhoodRow(row, {
        accountId: input.accountId,
        defaultAllocations: mockAllocations,
        assetLookup: (sym) => assetsList.find((a) => a.symbol === sym.toUpperCase().trim()),
      });

      if (!norm) {
        skippedCount++;
        continue;
      }

      if (assetId) {
        norm.assetId = assetId;
      }

      // Check for duplicates:
      // 1. Against DB
      const isDbDuplicate = dbTransactions.some(
        (dtx) =>
          dtx.tradeDate.toISOString() === norm.tradeDate &&
          dtx.assetId === norm.assetId &&
          dtx.type === norm.type &&
          Number(dtx.grossAmount) === norm.grossAmount &&
          (dtx.quantity ? Number(dtx.quantity) : null) === (norm.quantity ?? null)
      );

      // 2. Against currently staged transactions in this batch
      const isBatchDuplicate = toCommit.some(
        (btx) =>
          btx.tradeDate === norm.tradeDate &&
          btx.assetId === norm.assetId &&
          btx.type === norm.type &&
          btx.grossAmount === norm.grossAmount &&
          (btx.quantity ?? null) === (norm.quantity ?? null)
      );

      if (isDbDuplicate || isBatchDuplicate) {
        skippedCount++;
        continue;
      }

      // Dynamic Allocation Injection:
      // Gather all chronological transactions prior to this trade date
      const targetDate = new Date(norm.tradeDate);
      const priorTxs = runningTxs.filter((rtx) => new Date(rtx.tradeDate) <= targetDate);

      let allocations: any[] = [];

      if (norm.type === 'DEPOSIT' || norm.type === 'WITHDRAWAL') {
        // Cash deposit/withdrawal: 100% to selected default owner, compute units issued
        // Simulated prices at date (fall back to $1)
        const prices: Record<string, number> = { USD: 1 };
        for (const rtx of priorTxs) {
          if (rtx.assetSymbol && !prices[rtx.assetSymbol]) {
            prices[rtx.assetSymbol] = rtx.price ?? 1; // simple fallback close price representation
          }
        }

        const portfolioValue = calculatePortfolioValue(priorTxs, prices);
        const totalUnits = calculateTotalUnits(priorTxs);
        const navpu = totalUnits <= 0 ? 1.0 : portfolioValue / totalUnits;
        const unitsIssued = norm.grossAmount / navpu;

        allocations = [{
          ownerId: input.defaultOwnerId,
          percentage: 1.0,
          amount: norm.grossAmount,
          quantity: unitsIssued,
        }];
      } else {
        // Trade / Fee / Dividend: Dynamic allocation based on pool unit shares immediately before transaction
        const shares = getOwnerShares(priorTxs, activeOwnerIds);
        allocations = activeOwnerIds.map((ownerId) => {
          const pct = shares[ownerId] ?? 0;
          return {
            ownerId,
            percentage: pct,
            amount: norm.grossAmount * pct,
            quantity: norm.quantity ? norm.quantity * pct : undefined,
          };
        });
      }

      const finalizedTx = {
        ...norm,
        allocations,
      };

      toCommit.push(finalizedTx);

      // Append transaction to our chronological calculation stream so subsequent trades compute correctly
      const assetSymbol = assetsList.find((a) => a.id === norm.assetId)?.symbol;
      runningTxs.push(toInputTx({
        id: norm.id,
        type: norm.type,
        tradeDate: new Date(norm.tradeDate),
        assetId: norm.assetId,
        quantity: norm.quantity,
        price: norm.price,
        grossAmount: norm.grossAmount,
        fee: norm.fee,
        allocations: allocations.map((a) => ({
          ownerId: a.ownerId,
          percentage: new Prisma.Decimal(a.percentage),
          amount: new Prisma.Decimal(a.amount),
          quantity: a.quantity ? new Prisma.Decimal(a.quantity) : null,
        })),
      }, assetSymbol));

      // Re-sort chronological pool context
      runningTxs.sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());
    }

    if (toCommit.length === 0) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount,
        message: 'No new or non-duplicate transactions found to import.',
      });
    }

    // 2. Commit all staged transactions inside a Prisma transaction
    const batch = await prisma.importBatch.create({
      data: {
        source: 'robinhood',
        filename: 'robinhood_import.csv',
        rowCount: toCommit.length,
      },
    });

    await prisma.$transaction(
      toCommit.map((tx) =>
        prisma.transaction.create({
          data: {
            accountId: input.accountId,
            assetId: tx.assetId,
            type: tx.type,
            tradeDate: new Date(tx.tradeDate),
            quantity: tx.quantity,
            price: tx.price,
            grossAmount: tx.grossAmount,
            fee: tx.fee,
            importBatchId: batch.id,
            allocations: {
              create: tx.allocations.map((a: any) => ({
                ownerId: a.ownerId,
                percentage: a.percentage,
                amount: a.amount,
                quantity: a.quantity,
              })),
            },
          },
        })
      )
    );

    return NextResponse.json({
      importedCount: toCommit.length,
      skippedCount,
      batchId: batch.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
