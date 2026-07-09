/**
 * @file route.ts
 * @description REST API for managing partners (Owner model).
 * Supports retrieving, creating, renaming, and deleting owners.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const owners = await prisma.owner.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(owners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Partner name is required' }, { status: 400 });
    }

    const trimmed = name.trim();
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Ensure slug uniqueness
    const existing = await prisma.owner.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: `A partner with name "${trimmed}" already exists.` }, { status: 400 });
    }

    const newOwner = await prisma.owner.create({
      data: { name: trimmed, slug },
    });

    return NextResponse.json(newOwner, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name } = await request.json();
    if (!id || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Partner ID and name are required' }, { status: 400 });
    }

    const trimmed = name.trim();
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Ensure slug uniqueness among other owners
    const existing = await prisma.owner.findFirst({
      where: { slug, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json({ error: `A partner with name "${trimmed}" already exists.` }, { status: 400 });
    }

    const updatedOwner = await prisma.owner.update({
      where: { id },
      data: { name: trimmed, slug },
    });

    return NextResponse.json(updatedOwner);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Safety: Verify owner has no transaction allocations in the database
    const allocationsCount = await prisma.transactionAllocation.count({
      where: { ownerId: id },
    });

    if (allocationsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete partner because they have existing ledger transactions and allocations. Please delete or re-allocate their transactions first.' },
        { status: 400 }
      );
    }

    await prisma.owner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
