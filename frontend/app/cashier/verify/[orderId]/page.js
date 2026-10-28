'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function VerifyQRPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [qrData, setQrData] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => sessionStorage.getItem('saritrack_token') || '';

  const handleVerify = async () => {
    if (!qrData.trim()) {
      setError('Please paste the payment code');
      return;
    }
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/api/payments/qr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ qrData: qrData.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        setProcessing(false);
        return;
      }

      setResult(data.data);
    } catch {
      setError('Could not reach server');
    } finally {
      setProcessing(false);
    }
  };

  const goBack = () => router.push('/cashier');

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #E0EAE3', textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 8 }}>✅</div>
            <h1 style={{ fontSize: 22, color: '#1B4332' }}>Payment Verified</h1>
            <p style={{ fontSize: 12.5, color: '#6B7A72', marginTop: 4 }}>
              SHA-256 signature is valid
            </p>

            <div style={{ marginTop: 24, textAlign: 'left', background: '#f5f9f6', padding: 16, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
                <span style={{ color: '#6B7A72' }}>Order</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>{result.order.orderCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
                <span style={{ color: '#6B7A72' }}>Customer</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>{result.order.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
                <span style={{ color: '#6B7A72' }}>Amount</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>₱{result.order.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
                <span style={{ color: '#6B7A72' }}>Method</span>
                <span style={{ fontWeight: 700, color: '#1B4332', textTransform: 'uppercase' }}>{result.method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
                <span style={{ color: '#6B7A72' }}>Status</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>PAID</span>
              </div>
            </div>

            <button onClick={goBack} style={{ marginTop: 24, width: '100%', padding: 14, background: '#1B4332', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Back to POS →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: '#1B4332', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          ← Back to POS
        </button>

        <div style={{ background: '#1B4332', color: '#fff', padding: '20px 24px', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>Cryptographic QR Verification</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Verify Payment</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E0EAE3', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 12 }}>
            📷 Paste Customer's Signed Payment Code
          </div>
          <p style={{ fontSize: 12, color: '#6B7A72', marginBottom: 12 }}>
            Ask the customer to show the signed code from their wallet. Paste it below.
          </p>

          <textarea
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            placeholder="Paste the code here..."
            rows={5}
            style={{
              width: '100%',
              padding: 12,
              border: '1.5px solid #E0EAE3',
              borderRadius: 10,
              fontSize: 11,
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <div style={{ background: '#fee', color: '#c0392b', padding: 12, borderRadius: 10, fontSize: 12.5, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={processing}
          style={{
            width: '100%',
            padding: 16,
            background: '#1B4332',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 800,
            cursor: processing ? 'wait' : 'pointer',
          }}
        >
          {processing ? 'Verifying...' : '🔐 Verify Payment'}
        </button>

      </div>
    </div>
  );
}