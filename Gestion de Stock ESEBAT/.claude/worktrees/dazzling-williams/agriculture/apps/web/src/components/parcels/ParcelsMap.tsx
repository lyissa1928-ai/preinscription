'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ParcelDTO } from '@/lib/api';

// Centre Sénégal (Dakar)
const DEFAULT_CENTER: [number, number] = [14.7167, -17.4677];
const DEFAULT_ZOOM = 6;

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const L = typeof window !== 'undefined' ? require('leaflet') : null;

// Fix Leaflet default icon
if (L && typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface ParcelsMapProps {
  parcels: ParcelDTO[];
  height?: string;
}

export function ParcelsMap({ parcels, height = '400px' }: ParcelsMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parcelsWithCoords = parcels.filter(
    (p) => p.latitude != null && p.longitude != null && p.latitude !== 0 && p.longitude !== 0
  );

  if (!mounted) {
    return (
      <div
        className="w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-500"
        style={{ height }}
      >
        Chargement de la carte...
      </div>
    );
  }

  if (parcelsWithCoords.length === 0) {
    return (
      <div
        className="w-full bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200"
        style={{ height }}
      >
        Ajoutez des coordonnées (latitude, longitude) à vos parcelles pour les afficher sur la carte.
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {parcelsWithCoords.map((p) => (
          <Marker key={p.id} position={[p.latitude!, p.longitude!]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{p.name}</p>
                <p>{p.area} ha</p>
                <p>{p.region?.name ?? '-'}</p>
                <a
                  href={`/parcels/${p.id}`}
                  className="text-green-600 hover:underline mt-2 inline-block"
                >
                  Voir la parcelle →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
