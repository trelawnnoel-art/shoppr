import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const mission = await prisma.mission.findUnique({
    where: { id: params.id },
    include: { scout: true },
  });

  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: mission.id,
    title: mission.title,
    storeName: mission.storeName,
    status: mission.status,
    etaMinutes: mission.etaMinutes,
    note: mission.note,
    // Full scout detail here (not just a name) — a mission detail view is
    // exactly where a "who's shopping for me" card would want rating/photo.
    scout: mission.scout
      ? {
          id: mission.scout.id,
          name: mission.scout.name,
          rating: mission.scout.rating,
          photoUrl: mission.scout.photoUrl,
        }
      : null,
  });
}
