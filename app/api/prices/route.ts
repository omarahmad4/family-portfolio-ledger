import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { YahooFinanceMarketDataProvider } from '@/lib/market-data/provider';

const postSchema = z.object({
  assetId: z.string().min(1),
  date: z.string().min(1),
  close: z.coerce.number().positive(),
  source: z.string().default('manual'),
});

export async function POST(request: Request) {
  try {
    const input = postSchema.parse(await request.json());
    await prisma.price.upsert({
      where: {
        assetId_date_source: {
          assetId: input.assetId,
          date: new Date(input.date),
          source: input.source,
        },
      },
      create: {
        assetId: input.assetId,
        date: new Date(input.date),
        close: input.close,
        source: input.source,
      },
      update: {
        close: input.close,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/holdings');
    revalidatePath('/decisions');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const date = url.searchParams.get('date'); // Optional YYYY-MM-DD

  if (!symbol) {
    return NextResponse.json({ error: 'Query parameter "symbol" is required.' }, { status: 400 });
  }

  const provider = new YahooFinanceMarketDataProvider();

  try {
    if (date) {
      const historical = await provider.getHistoricalClose(symbol, date);
      if (!historical) {
        return NextResponse.json({ error: `No historical close found for ${symbol} on ${date}` }, { status: 404 });
      }
      return NextResponse.json({ symbol: historical.symbol, date: historical.date, price: historical.close });
    } else {
      const latestPrice = await provider.getLatestPrice(symbol);
      return NextResponse.json({ symbol: symbol.toUpperCase(), price: latestPrice });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
