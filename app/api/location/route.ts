import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, lat, lng, accuracy, speed, heading, static: isStatic } = body ?? {};

  if (typeof roomId !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const payload = {
    lat,
    lng,
    accuracy: typeof accuracy === 'number' ? accuracy : 0,
    speed: typeof speed === 'number' ? speed : 0,
    heading: typeof heading === 'number' ? heading : 0,
    static: Boolean(isStatic),
    ts: Date.now(),
  };

  await kv.set(`loc:${roomId}`, JSON.stringify(payload), { ex: 14400 });
  await kv.set(`room:${roomId}:active`, '1', { ex: 14400 });

  return NextResponse.json({ ok: true });
}
