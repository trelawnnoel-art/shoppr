import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withDerivedStoreFields } from '@/lib/store-derived';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const store = await prisma.store.findUnique({
    where: { id: params.id },
    include: { products: true },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...withDerivedStoreFields(store),
    products: store.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.priceCents / 100,
      description: p.description,
      imageUrl: p.imageUrl,
      sizes: p.sizes,
    })),
  });
}
