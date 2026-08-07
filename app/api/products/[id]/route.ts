import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_LOCATION, estimateEtaMinutes, haversineMiles } from '@/lib/geo';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { store: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const distanceMiles = haversineMiles(PLACEHOLDER_USER_LOCATION, product.store);

  return NextResponse.json({
    id: product.id,
    name: product.name,
    storeId: product.storeId,
    storeName: product.store.name,
    category: product.category,
    price: product.priceCents / 100,
    etaMinutes: estimateEtaMinutes(distanceMiles),
    description: product.description,
    imageUrl: product.imageUrl,
    sizes: product.sizes,
  });
}
