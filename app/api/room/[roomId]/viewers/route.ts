import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: { roomId: string } }
) {
  const raw = await kv.get<number | string>(`viewers:${params.roomId}`);
  const count = typeof raw === 'number'
    ? raw
    : raw
      ? parseInt(raw, 10)
      : 0;

  return NextResponse.json({ count });
}
