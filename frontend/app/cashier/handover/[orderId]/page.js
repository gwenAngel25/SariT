'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function HandoverPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [released, setReleased] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => sessionStorage.getItem('saritrack_token') || '';

  // Fetch order
  useEffect(() => {
    if (!orderId) return;
    fetch(`${getApiUrl()}/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => d.success && setOrder(d.data))
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Auth redirect
  useEffect(() => {
    const token = sessionStorage.getItem('saritrack_token');
    if (!token) router.push('/cashier/login');
  }, [router]);

  const handleRelease = async () => {
    if (order.status !== 'paid') {
      setError('Payment is not verified. Cannot release items.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/api/orders/${orderId}/release`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Release failed');
        setProcessing(false);
        return;
      }

      setReleased(true);
      setOrder((prev) => ({ ...prev, ...data.data.order }));
    } catch {
      setError('Could not reach server');
    } finally {
      setProcessing(false);
    }
  };

  const goBack = () => router.push('/cashier');

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading order...</div>;
  }

  if (error && !order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#c0392b' }}>{error}</p>
        <button
          onClick={goBack}
          style={{
            marginTop: 20,
            padding: '10px 20px',
            background: '#1B4332',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Back to POS
        </button>
      </div>
    );
  }

  // ---- Success state (after release OR already completed) ----
  if (released || order.status === 'completed') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 12,
              border: '1px solid #E0EAE3',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 8 }}>🎉</div>
            <h1 style={{ fontSize: 22, color: '#1B4332' }}>Order Released</h1>
            <p style={{ fontSize: 12.5, color: '#6B7A72', marginTop: 4 }}>
              {order.orderCode} has been handed to {order.customer.name}
            </p>

            <div
              style={{
                marginTop: 24,
                background: '#E6F4EA',
                borderRadius: 10,
                padding: 16,
                textAlign: 'left',
                fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#6B7A72' }}>Customer</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>{order.customer.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#6B7A72' }}>Items</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>{order.items.length} item(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#6B7A72' }}>Amount Paid</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>
                  ₱{order.totalAmount.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#6B7A72' }}>Status</span>
                <span style={{ fontWeight: 700, color: '#1B4332' }}>COMPLETED</span>
              </div>
            </div>

            <button
              onClick={goBack}
              style={{
                marginTop: 24,
                width: '100%',
                padding: 14,
                background: '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Back to POS →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Handover Lock screen ----
  const isPaid = order.status === 'paid';

  return (
    <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button
          onClick={goBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#1B4332',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          ← Back to POS
        </button>

        {/* Header */}
        <div
          style={{
            background: '#1B4332',
            color: '#fff',
            padding: '20px 24px',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.85 }}>Basket Handover Lock</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            Order #{order.orderCode}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            {order.customer.name}
          </div>
        </div>

        {/* Lock banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF6DE, #FFEAA0)',
            border: '2px solid #FFC72C',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 24 }}>🔒</span>
          <div style={{ fontSize: 12, color: '#8a6d00' }}>
            <b>Items are locked behind the counter.</b> They will only be released to the
            customer after payment is verified.
          </div>
        </div>

        {/* Items list */}
        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #E0EAE3',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#1B4332',
              marginBottom: 12,
            }}
          >
            📦 Staged Items
          </div>

          {order.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                border: isPaid ? '1.5px solid #E0EAE3' : '1.5px solid #FFEAA0',
                background: isPaid ? '#f0faf4' : '#fffdf5',
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: '#fff',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  border: '1px solid #E0EAE3',
                }}
              >
                📦
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4332' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: '#6B7A72' }}>
                  Qty: {item.quantity}
                </div>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#1B4332',
                  marginRight: 8,
                }}
              >
                ₱{(item.price * item.quantity).toFixed(2)}
              </div>
              <span
                style={{
                  background: isPaid ? '#1B4332' : '#FFC72C',
                  color: isPaid ? '#fff' : '#664d00',
                  fontSize: 9.5,
                  fontWeight: 800,
                  padding: '4px 8px',
                  borderRadius: 8,
                  letterSpacing: 0.5,
                }}
              >
                {isPaid ? '🔓 UNLOCKED' : '🔒 LOCKED'}
              </span>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div
          style={{
            background: '#1B4332',
            color: '#fff',
            padding: 18,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#a8d5c0' }}>Order</span>
            <span style={{ fontWeight: 700 }}>{order.orderCode}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#a8d5c0' }}>Customer</span>
            <span style={{ fontWeight: 700 }}>{order.customer.name}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#a8d5c0' }}>Payment Method</span>
            <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              {order.paymentMethod || 'N/A'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 10,
              marginTop: 8,
              borderTop: '1px solid rgba(255,255,255,0.2)',
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            <span>TOTAL</span>
            <span style={{ color: '#FFC72C' }}>
              ₱{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment status */}
        <div
          style={{
            background: isPaid ? '#E6F4EA' : '#FFF6DE',
            border: `2px solid ${isPaid ? '#1B4332' : '#FFC72C'}`,
            padding: 16,
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: isPaid ? '#1B4332' : '#8a6d00',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Payment Status
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: isPaid ? '#1B4332' : '#8a6d00',
              marginTop: 6,
            }}
          >
            {isPaid ? '✅ VERIFIED' : '⏳ NOT VERIFIED'}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c0392b',
              padding: 12,
              borderRadius: 10,
              fontSize: 12.5,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Release button */}
        <button
          onClick={handleRelease}
          disabled={!isPaid || processing}
          style={{
            width: '100%',
            padding: 16,
            background: isPaid && !processing ? '#1B4332' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 800,
            cursor: isPaid && !processing ? 'pointer' : 'not-allowed',
          }}
        >
          {processing
            ? 'Releasing...'
            : isPaid
            ? '🔓 Release Items to Customer'
            : '🔒 Awaiting Payment Verification'}
        </button>
      </div>
    </div>
  );
}