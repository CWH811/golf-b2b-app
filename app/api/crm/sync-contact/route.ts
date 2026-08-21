import { NextResponse } from 'next/server';
import { syncContactToGoHighLevel } from '@/lib/gohighlevel';

type SyncContactRequestPayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  source?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SyncContactRequestPayload | null;

  if (!payload?.email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const result = await syncContactToGoHighLevel({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    tags: payload.tags,
    source: payload.source ?? 'GCore Signup',
  });

  return NextResponse.json(result);
}
