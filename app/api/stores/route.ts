import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withDerivedStoreFields } from '@/lib/store-derived';

export async function GET() {
  const stores = await prisma.store.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(stores.map(withDerivedStoreFields));
}
