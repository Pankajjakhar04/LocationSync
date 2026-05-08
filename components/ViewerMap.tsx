'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map, Marker, Circle } from 'leaflet';

interface Props {
  location: { lat: number; lng: number; accuracy: number };
}

export default function ViewerMap({ location }: Props) {
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => location);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView(
        [initial.lat, initial.lng], 16
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const pulseIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 0 0 0 rgba(59,130,246,.5);
          animation:pulse 1.5s infinite;
        "></div>
        <style>@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,.6)}70%{box-shadow:0 0 0 14px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}</style>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([initial.lat, initial.lng], { icon: pulseIcon }).addTo(map);
      circleRef.current = L.circle([initial.lat, initial.lng], {
        radius: initial.accuracy ?? 10,
        color: '#3b82f6',
        fillOpacity: 0.08,
      }).addTo(map);

      mapRef.current = map;
    });
  }, [initial]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const { lat, lng, accuracy } = location;

    animateTo(markerRef.current, lat, lng);
    circleRef.current?.setLatLng([lat, lng]);
    if (accuracy) circleRef.current?.setRadius(accuracy);
    mapRef.current.panTo([lat, lng], { animate: true, duration: 0.3 });
  }, [location]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

function animateTo(marker: Marker, targetLat: number, targetLng: number, ms = 300) {
  const start = marker.getLatLng();
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - t0) / ms, 1);
    const e = 1 - (1 - t) ** 3;
    marker.setLatLng([
      start.lat + (targetLat - start.lat) * e,
      start.lng + (targetLng - start.lng) * e,
    ]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
