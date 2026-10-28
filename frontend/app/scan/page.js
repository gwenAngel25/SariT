'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  const host = window.location.hostname;
  return `http://${host}:5000`;
};
const API_URL = getApiUrl();

export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeId = searchParams.get('store') || 'main';

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/store/info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStore(data.data);
        else setError('Store not found.');
      })
      .catch(() => setError('Could not load store.'))
      .finally(() => setLoading(false));
  }, [storeId]);

  const enterStore = () => {
    router.push('/');
  };

  return (
    <div style={{
      background: 'linear-gradient(160deg, #1B4332 0%, #3C9A5F 100%)',
      padding: '48px 24px 64px 24px',
      color: '#fff',
      minHeight: '100vh',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>SariTrack</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          Storefront QR Entry
        </div>

        {loading && <p style={{ marginTop: 32 }}>Loading store info...</p>}
        {error && <p style={{ marginTop: 32, color: '#ffd700' }}>{error}</p>}

        {store && (
          <div style={{
            maxWidth: 420,
            marginTop: 32,
            background: '#fff',
            color: '#1F2A24',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: '#e6f4ea',
              color: '#1B4332',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 12,
            }}>
              ✓ Verified Store
            </div>

            <h2 style={{ fontSize: 20, color: '#1B4332', marginBottom: 6 }}>
              {store.storeName}
            </h2>

            <div style={{ fontSize: 12.5, color: '#6B7A72', marginBottom: 20 }}>
              📍 {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
              <br />
              🎯 Geofence radius: {store.geofenceRadiusMeters}m
            </div>

            <div style={{
              background: '#f5f9f6',
              padding: 14,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 12,
            }}>
              <b style={{ color: '#1B4332' }}>Before you can order:</b>
              <ul style={{ marginTop: 6, paddingLeft: 20, color: '#555' }}>
                <li>You must be within {store.geofenceRadiusMeters}m of the store</li>
                <li>Grant location permission when prompted</li>
                <li>Pay via cash or GCash</li>
              </ul>
            </div>

            <button
              onClick={enterStore}
              style={{
                width: '100%',
                padding: 14,
                fontSize: 15,
                background: '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Enter Store →
            </button>

            <div style={{
              textAlign: 'center',
              fontSize: 10.5,
              color: '#6B7A72',
              marginTop: 12,
            }}>
              No account needed to browse
            </div>
          </div>
        )}
      </div>
    </div>
  );
}