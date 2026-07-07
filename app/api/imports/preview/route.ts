import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { normalizeRobinhoodRow } from '@/lib/robinhood-import/normalize';

const schema = z.object({ csv: z.string().min(1), allocationOwnerIds: z.array(z.string()).min(1) });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const [assets, owners] = await Promise.all([prisma.asset.findMany(), prisma.owner.findMany()]);
  const ownerSet = new Set(owners.map((owner) => owner.id));
  const selectedOwners = input.allocationOwnerIds.filter((id) => ownerSet.has(id));
  if (selectedOwners.length === 0) return NextResponse.json({ error: 'No valid owners selected.' }, { status: 400 });

  const allocations = selectedOwners.map((ownerId) => ({ ownerId, percentage: 1 / selectedOwners.length }));
  const parsed = Papa.parse<Record<string, string>>(input.csv, { header: true, skipEmptyLines: true });
  const normalized = parsed.data
    .map((row) => normalizeRobinhoodRow(row, { accountId: 'preview', defaultAllocations: allocations, assetLookup: (symbol) => assets.find((asset) => asset.symbol.toLowerCase() === symbol.toLowerCase()) }))
    .filter(Boolean);

  return NextResponse.json({ rowCount: parsed.data.length, normalized });
}
