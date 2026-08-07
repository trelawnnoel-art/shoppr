import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword, toUserProfile } from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, signSession } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.firstName) {
    return NextResponse.json(
      { error: 'email, password, and firstName are required' },
      { status: 400 }
    );
  }

  const { email, password, firstName } = body as {
    email: string;
    password: string;
    firstName: string;
    initials?: string;
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const initials = body.initials ?? firstName.slice(0, 2).toUpperCase();

  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), firstName, initials },
  });

  cookies().set(SESSION_COOKIE_NAME, signSession(user.id), SESSION_COOKIE_OPTIONS);

  return NextResponse.json(toUserProfile(user), { status: 201 });
}
