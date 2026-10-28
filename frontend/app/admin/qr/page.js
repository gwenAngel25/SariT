'use client';
import { useEffect, useState } from 'react';

// Dynamic API URL — uses the same hostname the page was loaded from
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  const host = window.location.hostname;
  return `http://${host}:5000`;
};

export default function StoreQRPage() {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const apiUrl = getApiUrl();

    // Use the current page's origin (protocol + host + port)
    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3000';

    fetch(`${apiUrl}/api/store/qr?baseUrl=${encodeURIComponent(baseUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setQr(d.data);
        else setError('Failed to load QR code.');
      })
      .catch(() => setError('Could not reach the backend.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F9F6' }}>
      <div style={{ background: '#1B4332', color: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Storefront QR Code</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            Print and post at the entrance
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}

        {qr && (
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 12,
              textAlign: 'center',
              border: '1px solid #E0EAE3',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#1B4332',
                marginBottom: 16,
              }}
            >
              SCAN TO ORDER
            </div>

            <img
              src={qr.qrDataUrl}
              alt="QR"
              style={{ width: 300, height: 300, margin: '0 auto', display: 'block' }}
            />

            <div
              style={{
                fontSize: 12,
                color: '#6B7A72',
                marginTop: 16,
                wordBreak: 'break-all',
              }}
            >
              {qr.scanUrl}
            </div>

            <button
              onClick={() => window.print()}
              style={{
                marginTop: 24,
                width: '100%',
                padding: 14,
                background: '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              🖨️ Print QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}