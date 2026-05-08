'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { KalmanFilter } from '@/lib/kalman';
import { distanceMeters } from '@/lib/geo';

const DELTA_THRESHOLD_M = 1.5;
const MAX_AGE_MS = 500;

export default function SenderPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState('—');
  const [viewers, setViewers] = useState(0);
  const [copied, setCopied] = useState(false);
  const watchRef = useRef<number | null>(null);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const kalmanLat = useRef(new KalmanFilter());
  const kalmanLng = useRef(new KalmanFilter());

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/view/${roomId}` : '';

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/room/${roomId}/viewers`);
      if (res.ok) {
        const d = await res.json();
        setViewers(d.count ?? 0);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [roomId]);

  const sendLocation = async (
    lat: number,
    lng: number,
    accuracy: number,
    speed: number,
    heading: number,
    isStatic = false
  ) => {
    await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, lat, lng, accuracy, speed, heading, static: isStatic }),
    });
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    setTracking(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const lat = kalmanLat.current.filter(rawLat);
        const lng = kalmanLng.current.filter(rawLng);

        if (lastPos.current) {
          const d = distanceMeters(lastPos.current.lat, lastPos.current.lng, lat, lng);
          if (d < DELTA_THRESHOLD_M) return;
        }
        lastPos.current = { lat, lng };
        setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        sendLocation(lat, lng, pos.coords.accuracy,
          pos.coords.speed ?? 0, pos.coords.heading ?? 0);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: MAX_AGE_MS, timeout: 10000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    kalmanLat.current.reset();
    kalmanLng.current.reset();
    lastPos.current = null;
  };

  const sendStatic = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude,
          pos.coords.accuracy, 0, 0, true);
        alert('Static location pinned!');
      },
      () => alert('Could not get location'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
      <h1>Share Location</h1>

      <div style={{ margin: '24px 0' }}>
        <label style={{ fontSize: 12, color: '#64748b' }}>Share link</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input readOnly value={shareUrl}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              background: '#0d0f14', border: '1px solid #2a2f3e', color: '#e2e8f0',
            }} />
          <button onClick={copy}
            style={{
              padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
              background: copied ? '#22c55e' : '#3b82f6', color: 'white', border: 'none',
            }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 24, fontSize: 13, color: '#64748b', marginBottom: 24,
      }}>
        <span>Room: <b style={{ color: '#e2e8f0' }}>{roomId}</b></span>
        <span>Viewers: <b style={{ color: '#e2e8f0' }}>{viewers}</b></span>
        <span>Pos: <b style={{ color: '#e2e8f0' }}>{coords}</b></span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!tracking ? (
          <button onClick={startTracking}
            style={{
              padding: '12px', borderRadius: 8, background: '#3b82f6',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: 15,
            }}>
            ▶ Start Live Tracking
          </button>
        ) : (
          <button onClick={stopTracking}
            style={{
              padding: '12px', borderRadius: 8, background: '#ef4444',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: 15,
            }}>
            ⬛ Stop Tracking
          </button>
        )}
        <button onClick={sendStatic}
          style={{
            padding: '12px', borderRadius: 8, background: 'transparent',
            color: '#e2e8f0', border: '1px solid #2a2f3e',
            cursor: 'pointer', fontSize: 15,
          }}>
          📍 Share Current Location (Static)
        </button>
      </div>
    </main>
  );
}
