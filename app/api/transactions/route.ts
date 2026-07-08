import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const allocationSchema = z.object({
  ownerId: z.string().min(1),
  percentage: z.coerce.number().min(0).max(1),
});

const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  assetId: z.string().min(1).optional().nullable(),
  type: z.nativeEnum(TransactionType),
  tradeDate: z.string().min(1),
  quantity: z.coerce.number().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  grossAmount: z.coerce.number().positive(),
  fee: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  allocations: z.array(allocationSchema).optional(),
});

import { calculatePortfolioValue, calculateTotalUnits } from '@/lib/accounting/pool';

export async function POST(request: Request) {
  const body = await request.json();
  const input = createTransactionSchema.parse(body);
  const isCashFlow = input.type === 'DEPOSIT' || input.type === 'WITHDRAWAL';

  if (isCashFlow) {
    if (!input.allocations || input.allocations.length === 0) {
      return NextResponse.json({ error: 'Allocations are required for deposits and withdrawals.' }, { status: 400 });
    }
    const totalPct = input.allocations.reduce((sum, row) => sum + row.percentage, 0);
    if (Math.abs(totalPct - 1) > 0.000001) {
      return NextResponse.json({ error: 'Allocations must add up to 100%.' }, { status: 400 });
    }
  }

  // Calculate dynamic pool units if it is a DEPOSIT or WITHDRAWAL cash flow
  let unitsQuantity: number | null = null;
  if (input.type === 'DEPOSIT' || input.type === 'WITHDRAWAL') {
    const dbTransactions = await prisma.transaction.findMany({
      include: { allocations: true, asset: true },
    });

    const runningTxs = dbTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      tradeDate: tx.tradeDate.toISOString(),
      assetId: tx.assetId,
      assetSymbol: tx.asset?.symbol ?? null,
      quantity: tx.quantity ? Number(tx.quantity) : null,
      price: tx.price ? Number(tx.price) : null,
      grossAmount: Number(tx.grossAmount),
      fee: Number(tx.fee),
      allocations: tx.allocations.map((a) => ({
        ownerId: a.ownerId,
        percentage: Number(a.percentage),
        amount: Number(a.amount),
        quantity: a.quantity ? Number(a.quantity) : null,
      })),
    }));

    const targetDate = new Date(input.tradeDate);
    const priorTxs = runningTxs.filter((rtx) => new Date(rtx.tradeDate) <= targetDate);

    // Resolve historical prices at target date
    const prices: Record<string, number> = { USD: 1.0 };
    for (const rtx of priorTxs) {
      if (rtx.assetId && !prices[rtx.assetId]) {
        const p = await prisma.price.findFirst({
          where: { assetId: rtx.assetId, date: { lte: targetDate } },
          orderBy: { date: 'desc' },
        });
        prices[rtx.assetId] = p ? Number(p.close) : (rtx.price ?? 1.0);
      }
    }

    const portfolioValue = calculatePortfolioValue(priorTxs, prices);
    const totalUnits = calculateTotalUnits(priorTxs);
    const navpu = totalUnits <= 0 ? 1.0 : portfolioValue / totalUnits;
    unitsQuantity = Math.abs(input.grossAmount) / navpu;
  }

  const allocationsData = isCashFlow && input.allocations
    ? {
        create: input.allocations.map((allocation) => ({
          ownerId: allocation.ownerId,
          percentage: allocation.percentage,
          amount: Math.abs(input.grossAmount) * allocation.percentage,
          quantity: unitsQuantity != null ? unitsQuantity * allocation.percentage : null,
        })),
      }
    : undefined;

  const tx = await prisma.transaction.create({
    data: {
      accountId: input.accountId,
      assetId: input.assetId || null,
      type: input.type,
      tradeDate: new Date(input.tradeDate),
      quantity: input.quantity ?? null,
      price: input.price ?? null,
      grossAmount: Math.abs(input.grossAmount),
      fee: input.fee,
      notes: input.notes,
      allocations: allocationsData,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/holdings');
  revalidatePath('/decisions');

  return NextResponse.json({ id: tx.id });
}
