import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Groundwork for the still-unbuilt Scout UI (profile view, tracking, etc.)
// — nothing consumes this yet, but the data's there once that UI exists.
export async function GET() {
  const scouts = await prisma.scout.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(scouts);
}
