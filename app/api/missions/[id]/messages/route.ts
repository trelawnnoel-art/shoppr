import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// No auth gating here — matches the rest of the app (no login UI exists
// yet, see README's roadmap). `sender` is always 'customer' on POST since
// this is the customer-facing app; a Scout-side app/view would be a
// separate client posting sender: 'scout', not something this endpoint
// needs to branch on.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const messages = await prisma.message.findMany({
    where: { missionId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
    }))
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const text = body?.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const mission = await prisma.mission.findUnique({ where: { id: params.id } });
  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { missionId: params.id, sender: 'customer', body: text.trim() },
  });

  return NextResponse.json(
    { id: message.id, sender: message.sender, body: message.body, createdAt: message.createdAt },
    { status: 201 }
  );
}
