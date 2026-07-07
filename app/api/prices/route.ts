import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({ assetId: z.string().min(1), date: z.string().min(1), close: z.coerce.number().positive(), source: z.string().default('manual') });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  await prisma.price.upsert({
    where: { assetId_date_source: { assetId: input.assetId, date: new Date(input.date), source: input.source } },
    create: { assetId: input.assetId, date: new Date(input.date), close: input.close, source: input.source },
    update: { close: input.close },
  });
  revalidatePath('/dashboard');
  revalidatePath('/holdings');
  revalidatePath('/decisions');
  return NextResponse.json({ ok: true });
}
