'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    const res = await fetch('/api/room', { method: 'POST' });
    const { roomId } = await res.json();
    router.push(`/send/${roomId}`);
  };

  return (
    <main style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 24,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>📡 LocShare</h1>
      <p style={{ color: '#64748b', maxWidth: 360, textAlign: 'center' }}>
        Share your live or static location instantly. No account needed.
      </p>
      <button onClick={createRoom} disabled={loading}
        style={{
          padding: '14px 32px', borderRadius: 10, fontSize: 16,
          background: '#3b82f6', color: 'white', border: 'none',
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>
        {loading ? 'Creating room…' : '+ Create Share Link'}
      </button>
    </main>
  );
}
