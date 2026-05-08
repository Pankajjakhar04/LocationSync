import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const raw = await kv.get<number | string>(`viewers:${roomId}`);
  const count = typeof raw === 'number'
    ? raw
    : raw
      ? parseInt(raw, 10)
      : 0;

  return NextResponse.json({ count });
}
