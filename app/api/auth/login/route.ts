import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { toUserProfile, verifyPassword } from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, signSession } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  cookies().set(SESSION_COOKIE_NAME, signSession(user.id), SESSION_COOKIE_OPTIONS);

  return NextResponse.json(toUserProfile(user));
}
