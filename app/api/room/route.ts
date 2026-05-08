import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const roomId = nanoid(8);
  await kv.set(`room:${roomId}`, JSON.stringify({
    createdAt: Date.now(),
    location: null,
    active: false,
  }), { ex: 14400 });

  return NextResponse.json({ roomId });
}
