import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const missions = await prisma.mission.findMany({
    include: { scout: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    missions.map((m) => ({
      id: m.id,
      title: m.title,
      storeName: m.storeName,
      status: m.status,
      // Matches the original mock-data convention (a plain "not yet
      // assigned" string) so the frontend contract doesn't change; scoutId
      // is included alongside it for whatever Scout detail view comes next.
      scoutName: m.scout?.name ?? 'Not yet assigned',
      scoutId: m.scoutId,
      etaMinutes: m.etaMinutes,
      note: m.note,
    }))
  );
}
