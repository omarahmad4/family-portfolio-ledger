/**
 * @file route.ts
 * @description API endpoint to commit previewed CSV transactions to the ledger database.
 * Deduplicates rows, resolves or creates assets, computes progressive units for cash flows,
 * and saves transaction batches inside a database transaction.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AssetType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { calculatePortfolioValue, calculateTotalUnits, getOwnerShares, TransactionInput } from '@/lib/accounting/pool';

const commitTransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  tradeDate: z.string(),
  assetId: z.string().optional().nullable(),
  assetSymbol: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  grossAmount: z.number(),
  fee: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  allocations: z.array(
    z.object({
      ownerId: z.string(),
      percentage: z.number(),
      amount: z.number(),
      quantity: z.number().optional().nullable(),
    })
  ),
});

const commitSchema = z.object({
  transactions: z.array(commitTransactionSchema),
});

/**
 * Converts a database Transaction record to a domain TransactionInput record for pool math calculations.
 * 
 * @param tx The database transaction object with allocations and asset.
 * @param assetSymbol The symbol string of the asset.
 * @returns A TransactionInput object.
 */
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

interface StockSplitEvent {
  symbol: string;
  date: string;
  ratio: number;
}

const HISTORICAL_SPLITS: StockSplitEvent[] = [
  { symbol: 'NVDA', date: '2021-07-20', ratio: 4.0 },
  { symbol: 'NVDA', date: '2024-06-10', ratio: 10.0 },
  { symbol: 'GOOG', date: '2022-07-18', ratio: 20.0 },
  { symbol: 'GOOGL', date: '2022-07-18', ratio: 20.0 },
  { symbol: 'AMZN', date: '2022-06-06', ratio: 20.0 },
  { symbol: 'TSLA', date: '2020-08-31', ratio: 5.0 },
  { symbol: 'TSLA', date: '2022-08-25', ratio: 3.0 },
  { symbol: 'AAPL', date: '2020-08-31', ratio: 4.0 },
];

/**
 * POST handler to commit normalized transactions.
 * 
 * @param request HTTP request containing transaction payloads.
 * @returns HTTP response with imported and skipped counts.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = commitSchema.parse(body);

    // Resolve a valid account from the database or create a default one
    let account = await prisma.account.findFirst();
    if (!account) {
      account = await prisma.account.create({ data: { name: 'Shared Portfolio Account' } });
    }
    const resolvedAccountId = account.id;

    // Clear sample seed data if this is the user's first CSV import
    const totalTxs = await prisma.transaction.count();
    const sampleTxs = await prisma.transaction.count({
      where: { notes: { startsWith: '[SAMPLE]' } }
    });
    if (totalTxs > 0 && totalTxs === sampleTxs) {
      await prisma.$transaction([
        prisma.lot.deleteMany(),
        prisma.decisionScore.deleteMany(),
        prisma.transactionAllocation.deleteMany(),
        prisma.transaction.deleteMany(),
        prisma.price.deleteMany({ where: { source: { in: ['yahoo-quote', 'seed'] } } }),
      ]);
    }

    // Fetch existing assets, owners and transactions for validation and duplicate checking
    const [existingAssets, owners, dbTransactions] = await Promise.all([
      prisma.asset.findMany(),
      prisma.owner.findMany(),
      prisma.transaction.findMany({ include: { allocations: true, asset: true } }),
    ]);

    const ownerSet = new Set(owners.map((o) => o.id));
    const assetsList = [...existingAssets];
    
    // Helper to search assets list by symbol
    const assetLookup = (sym: string) => {
      const upper = sym.toUpperCase().trim();
      return assetsList.find((a) => a.symbol === upper);
    };

    // Maintain chronological running list of transactions for NAV calculation
    const runningTxs: TransactionInput[] = dbTransactions.map((tx) => toInputTx(tx, tx.asset?.symbol));

    // Resolve date range of current import batch to inject any active historical splits
    const importDates = input.transactions.map((tx) => new Date(tx.tradeDate).getTime());
    const minImportTime = Math.min(...importDates);
    const maxImportTime = Math.max(...importDates);

    const transactionsToProcess = [...input.transactions];

    for (const split of HISTORICAL_SPLITS) {
      const splitTime = new Date(split.date).getTime();
      if (splitTime >= minImportTime && splitTime <= maxImportTime) {
        // Check if there are any purchases of the asset before the split date
        const hasPriorBuy = dbTransactions.some((dtx) => dtx.asset?.symbol === split.symbol && dtx.tradeDate.getTime() < splitTime && (dtx.type === 'BUY' || dtx.type === 'TRANSFER_IN')) ||
                            input.transactions.some((tx) => tx.assetSymbol === split.symbol && new Date(tx.tradeDate).getTime() < splitTime && (tx.type === 'BUY' || tx.type === 'TRANSFER_IN'));
        
        if (hasPriorBuy) {
          const alreadyExists = dbTransactions.some((dtx) => dtx.asset?.symbol === split.symbol && dtx.type === 'SPLIT' && dtx.tradeDate.toISOString().slice(0, 10) === split.date) ||
                                input.transactions.some((tx) => tx.assetSymbol === split.symbol && tx.type === 'SPLIT' && tx.tradeDate.slice(0, 10) === split.date);
          
          if (!alreadyExists) {
            transactionsToProcess.push({
              id: `auto-split:${split.symbol}:${split.date}`,
              type: 'SPLIT',
              tradeDate: new Date(split.date).toISOString(),
              assetSymbol: split.symbol,
              quantity: split.ratio,
              price: 0,
              grossAmount: 0,
              fee: 0,
              notes: `[AUTO] Historical Stock Split ${split.ratio}:1`,
              allocations: [],
            });
          }
        }
      }
    }

    // Sort chronologically so splits are applied sequentially
    transactionsToProcess.sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());

    const toCommit: any[] = [];
    let skippedCount = 0;

    for (const tx of transactionsToProcess) {
      // 1. Resolve or create Asset
      let resolvedAssetId = tx.assetId;
      if (tx.assetSymbol && !resolvedAssetId) {
        const symbol = tx.assetSymbol.toUpperCase().trim();
        let found = assetLookup(symbol);
        if (!found) {
          const isCrypto = ['BTC', 'ETH', 'SOL'].includes(symbol);
          const newAsset = await prisma.asset.create({
            data: {
              symbol,
              name: `${symbol} Stock`,
              type: isCrypto ? AssetType.CRYPTO : AssetType.STOCK,
            },
          });
          assetsList.push(newAsset);
          found = newAsset;
        }
        resolvedAssetId = found.id;
      }

      // 2. Check for duplicates (against DB and already-staged batch rows)
      const isDbDuplicate = dbTransactions.some((dtx) => {
        const dateMatch = dtx.tradeDate.toISOString().slice(0, 10) === tx.tradeDate.slice(0, 10);
        const typeMatch = dtx.type === tx.type;
        const amountMatch = Math.abs(Number(dtx.grossAmount) - tx.grossAmount) < 1e-2;
        const assetMatch = resolvedAssetId ? dtx.assetId === resolvedAssetId : !dtx.assetId;
        
        let qtyMatch = false;
        if (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL') {
          // Cash flows check amounts and date, but skip quantity checks (since DB stores units, preview stores 0)
          qtyMatch = true;
        } else if (tx.type === 'SPLIT') {
          // Splits check date, type, asset and ignore dynamic split ratio quantities
          qtyMatch = true;
        } else {
          qtyMatch = tx.quantity 
            ? (dtx.quantity != null && Math.abs(Number(dtx.quantity) - tx.quantity) < 1e-5)
            : !dtx.quantity;
        }

        return dateMatch && typeMatch && amountMatch && assetMatch && qtyMatch;
      });

      const isBatchDuplicate = toCommit.some((btx) => {
        const dateMatch = btx.tradeDate.slice(0, 10) === tx.tradeDate.slice(0, 10);
        const typeMatch = btx.type === tx.type;
        const amountMatch = Math.abs(btx.grossAmount - tx.grossAmount) < 1e-2;
        const assetMatch = resolvedAssetId ? btx.assetId === resolvedAssetId : !btx.assetId;

        let qtyMatch = false;
        if (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL') {
          qtyMatch = true;
        } else if (tx.type === 'SPLIT') {
          qtyMatch = true;
        } else {
          qtyMatch = tx.quantity
            ? (btx.quantity != null && Math.abs(btx.quantity - tx.quantity) < 1e-5)
            : !btx.quantity;
        }

        return dateMatch && typeMatch && amountMatch && assetMatch && qtyMatch;
      });

      if (isDbDuplicate || isBatchDuplicate) {
        skippedCount++;
        continue;
      }

      // 3. Collect chronological running context up to target date
      const targetDate = new Date(tx.tradeDate);
      const priorTxs = runningTxs.filter((rtx) => new Date(rtx.tradeDate) <= targetDate);

      // Handle stock splits: calculate split ratio from ledger history
      let resolvedQuantity = tx.quantity;
      if (tx.type === 'SPLIT' && tx.assetSymbol) {
        const symbol = tx.assetSymbol.toUpperCase().trim();
        let preSplitQty = 0;
        for (const rtx of priorTxs) {
          if (rtx.assetSymbol?.toUpperCase() === symbol) {
            if (rtx.type === 'BUY' || rtx.type === 'TRANSFER_IN') {
              preSplitQty += rtx.quantity ?? 0;
            } else if (rtx.type === 'SELL' || rtx.type === 'TRANSFER_OUT') {
              preSplitQty -= rtx.quantity ?? 0;
            }
          }
        }
        const additionalQty = tx.quantity ?? 0;
        const splitRatio = preSplitQty <= 0 ? 1.0 : (preSplitQty + additionalQty) / preSplitQty;
        resolvedQuantity = splitRatio;
      }

      let allocations: any[] = [];

      // 4. Calculate Cash Flow allocations with dynamic pool pricing
      if (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL') {
        const prices: Record<string, number> = { USD: 1.0 };
        for (const rtx of priorTxs) {
          if (rtx.assetSymbol && !prices[rtx.assetSymbol]) {
            prices[rtx.assetSymbol] = rtx.price ?? 1.0;
          }
        }

        const portfolioValue = calculatePortfolioValue(priorTxs, prices);
        const totalUnits = calculateTotalUnits(priorTxs);
        const navpu = totalUnits <= 0 ? 1.0 : portfolioValue / totalUnits;

        // Deposits issue units; withdrawals redeem units
        const sign = tx.type === 'DEPOSIT' ? 1.0 : -1.0;
        const unitsIssued = (tx.grossAmount * sign) / navpu;

        // Fallback to first owner if client sent no allocations
        const selectedOwnerId = tx.allocations[0]?.ownerId || owners[0]?.id || 'partner-1';

        allocations = [
          {
            ownerId: selectedOwnerId,
            percentage: 1.0,
            amount: tx.grossAmount * sign,
            quantity: unitsIssued,
          },
        ];
      } else {
        const ownerIds = owners.map((o) => o.id);
        const shares = getOwnerShares(priorTxs, ownerIds);
        const totalPct = Object.values(shares).reduce((sum, p) => sum + p, 0);

        allocations = owners.map((owner) => {
          const percentage = totalPct <= 1e-9 ? (1 / owners.length) : (shares[owner.id] ?? 0.0);
          return {
            ownerId: owner.id,
            percentage,
            amount: tx.grossAmount * percentage,
            quantity: resolvedQuantity != null ? resolvedQuantity * percentage : null,
          };
        });
      }

      const finalizedTx = {
        accountId: resolvedAccountId,
        assetId: resolvedAssetId ?? null,
        type: tx.type,
        tradeDate: tx.tradeDate,
        quantity: resolvedQuantity ?? null,
        price: tx.price ?? null,
        grossAmount: tx.grossAmount,
        fee: tx.fee ?? 0,
        notes: tx.notes ?? null,
        allocations,
      };

      toCommit.push(finalizedTx);

      // Append transaction to chronological computation context
      const assetSymbol = tx.assetSymbol ?? undefined;
      runningTxs.push({
        id: tx.id,
        type: tx.type as any,
        tradeDate: tx.tradeDate,
        assetId: resolvedAssetId ?? undefined,
        assetSymbol: assetSymbol ?? null,
        quantity: resolvedQuantity ?? null,
        price: tx.price ?? null,
        grossAmount: tx.grossAmount,
        fee: tx.fee ?? 0,
        allocations: allocations.map((a) => ({
          ownerId: a.ownerId,
          percentage: a.percentage,
          amount: a.amount,
          quantity: a.quantity ?? null,
        })),
      });

      runningTxs.sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());
    }

    if (toCommit.length === 0) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount,
        message: 'No new or non-duplicate transactions found to import.',
      });
    }

    // 5. Commit batch to DB inside a single Prisma Transaction block
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
            accountId: tx.accountId,
            assetId: tx.assetId,
            type: tx.type,
            tradeDate: new Date(tx.tradeDate),
            quantity: tx.quantity,
            price: tx.price,
            grossAmount: tx.grossAmount,
            fee: tx.fee,
            notes: tx.notes,
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
