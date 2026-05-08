'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ViewerMap = dynamic(() => import('@/components/ViewerMap'), { ssr: false });

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  static: boolean;
  ts: number;
}

export default function ViewerPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [status, setStatus] = useState('Connecting…');
  const [latency, setLatency] = useState('—');
  const [updateCount, setUpdateCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`/api/stream/${roomId}`);
      esRef.current = es;

      es.addEventListener('connected', () => setStatus('Connected'));

      es.addEventListener('location', (e) => {
        const data: LocationData = JSON.parse(e.data);
        const lag = Date.now() - data.ts;
        setLatency(`${lag}ms`);
        setLocation(data);
        setUpdateCount(c => c + 1);
        setStatus(data.static ? '📍 Static' : '🔴 Live');
      });

      es.onerror = () => {
        setStatus('Reconnecting…');
        es.close();
        setTimeout(connect, 1500);
      };
    };

    connect();
    return () => esRef.current?.close();
  }, [roomId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        {location && <ViewerMap location={location} />}
        {!location && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#64748b', fontSize: 15,
          }}>
            Waiting for sender…
          </div>
        )}
      </div>

      <div style={{
        background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid #2a2f3e', padding: '12px 20px',
        display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#64748b',
      }}>
        <span style={{
          background: '#3b82f6', color: 'white',
          padding: '2px 10px', borderRadius: 999, fontSize: 11,
        }}>{status}</span>
        {location && <>
          <span>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
          {location.accuracy && <span>🎯 ±{Math.round(location.accuracy)}m</span>}
          {location.speed > 0 && <span>🏃 {(location.speed * 3.6).toFixed(1)} km/h</span>}
        </>}
        <span>⚡ {latency}</span>
        <span>📦 {updateCount} updates</span>
      </div>
    </div>
  );
}
