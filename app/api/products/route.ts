import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_LOCATION, estimateEtaMinutes, haversineMiles } from '@/lib/geo';

// Supports ?category=Fashion, ?storeId=..., ?q=search-substring — all
// optional and combinable. SQLite's default LIKE is already
// case-insensitive for ASCII, so plain `contains` covers the search case
// without Prisma's Postgres-only `mode: 'insensitive'` option.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const storeId = searchParams.get('storeId');
  const q = searchParams.get('q');

  const products = await prisma.product.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(storeId ? { storeId } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    include: { store: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    products.map((p) => {
      const distanceMiles = haversineMiles(PLACEHOLDER_USER_LOCATION, p.store);
      return {
        id: p.id,
        name: p.name,
        storeId: p.storeId,
        storeName: p.store.name,
        category: p.category,
        price: p.priceCents / 100,
        etaMinutes: estimateEtaMinutes(distanceMiles),
        description: p.description,
        imageUrl: p.imageUrl,
        sizes: p.sizes,
      };
    })
  );
}
