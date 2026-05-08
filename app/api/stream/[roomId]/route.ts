import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const POLL_MS = 400;
const VIEWER_TTL_SECONDS = 14400;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const encoder = new TextEncoder();
  const viewerKey = `viewers:${roomId}`;

  const stream = new ReadableStream({
    async start(controller) {
      let lastTs = 0;
      let viewerCounted = false;

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ));
      };

      const decrementViewer = async () => {
        if (!viewerCounted) return;
        viewerCounted = false;
        try {
          const remaining = await kv.decr(viewerKey);
          if (remaining <= 0) {
            await kv.del(viewerKey);
          }
        } catch (err) {
          console.error('Viewer decrement failed', err);
        }
      };

      req.signal.addEventListener('abort', () => {
        void decrementViewer();
      });

      try {
        await kv.incr(viewerKey);
        await kv.expire(viewerKey, VIEWER_TTL_SECONDS);
        viewerCounted = true;
      } catch (err) {
        console.error('Viewer increment failed', err);
      }

      send('connected', { roomId });

      while (!req.signal.aborted) {
        try {
          const raw = await kv.get<string>(`loc:${roomId}`);
          if (raw) {
            const loc = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (loc.ts !== lastTs) {
              lastTs = loc.ts;
              send('location', loc);
            }
          }
        } catch (err) {
          console.error('KV read failed', err);
        }

        controller.enqueue(encoder.encode(': keepalive\n\n'));
        await new Promise(r => setTimeout(r, POLL_MS));
      }

      await decrementViewer();
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}
