'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function WalletPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    fetch(`${getApiUrl()}/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => d.success && setOrder(d.data))
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const generateQR = async () => {
    if (!referenceNumber.trim()) {
      setError('Please enter your GCash reference number');
      return;
    }
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/api/payments/qr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          referenceNumber: referenceNumber.trim(),
          method: 'gcash',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
        setProcessing(false);
        return;
      }
      setQrData(data.data);
    } catch {
      setError('Could not reach server');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!order) return <div style={{ padding: 40, textAlign: 'center' }}>Order not found</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button
          onClick={() => router.push(`/order-status?id=${orderId}`)}
          style={{ background: 'transparent', border: 'none', color: '#1B4332', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
        >
          ← Back to Order
        </button>

        <div style={{ background: '#1B4332', color: '#fff', padding: '20px 24px', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>Digital Wallet Payment</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Order #{order.orderCode}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FFC72C', marginTop: 8 }}>
            ₱{order.totalAmount.toFixed(2)}
          </div>
        </div>

        {!qrData ? (
          <>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E0EAE3', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 12 }}>
                Step 1: Pay via GCash
              </div>
              <p style={{ fontSize: 12.5, color: '#6B7A72', marginBottom: 16 }}>
                Send ₱{order.totalAmount.toFixed(2)} to the store's GCash number, then enter the reference number below.
              </p>

              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7A72', textTransform: 'uppercase' }}>
                GCash Reference Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g., 1234567890123"
                style={{
                  width: '100%', padding: '12px 14px', marginTop: 6,
                  border: '1.5px solid #E0EAE3', borderRadius: 10, fontSize: 14,
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#c0392b', fontSize: 12.5, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              onClick={generateQR}
              disabled={processing}
              style={{
                width: '100%', padding: 16, background: '#1B4332', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}
            >
              {processing ? 'Generating...' : 'Generate Payment QR →'}
            </button>
          </>
        ) : (
          <>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E0EAE3', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 16 }}>
                ✅ Show this to the Cashier
              </div>

              <div style={{ background: '#f5f9f6', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#6B7A72', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>
                  Signed Payment Code
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 10, color: '#1B4332',
                  wordBreak: 'break-all', padding: 12, background: '#fff', borderRadius: 8,
                }}>
                  {qrData.qrData}
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: '#6B7A72' }}>
                ⏱️ Expires in 5 minutes
              </div>

              <div style={{ marginTop: 16, padding: 12, background: '#FFF6DE', borderRadius: 8, fontSize: 11.5, color: '#8a6d00' }}>
                🔐 This code is cryptographically signed. It cannot be forged or reused.
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #E0EAE3', fontSize: 12, color: '#6B7A72' }}>
              <b style={{ color: '#1B4332' }}>Reference:</b> {qrData.referenceNumber}<br />
              <b style={{ color: '#1B4332' }}>Amount:</b> ₱{qrData.amount.toFixed(2)}<br />
              <b style={{ color: '#1B4332' }}>Signature:</b> {qrData.signature.slice(0, 24)}...
            </div>
          </>
        )}

      </div>
    </div>
  );
}