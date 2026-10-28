'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import io from 'socket.io-client';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};
const getSocketUrl = () => getApiUrl();

const STATUS_STEPS = [
  { key: 'staged_pending', label: 'Pending' },
  { key: 'queued', label: 'Queued' },
  { key: 'staging', label: 'Staging' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'paid', label: 'Paid' },
];

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState('idle');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [savingMethod, setSavingMethod] = useState(false);
  const [distanceM, setDistanceM] = useState(null);

  // Load order
  useEffect(() => {
    if (!orderId) {
      setError('No order found.');
      setLoading(false);
      return;
    }

    fetch(`${getApiUrl()}/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOrder(data.data);
        else setError('Order not found.');
      })
      .catch(() => setError('Could not load order status.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Real-time updates
  useEffect(() => {
    if (!orderId) return;

    const socket = io(getSocketUrl());
    socket.emit('joinOrderRoom', orderId);

    socket.on('order:updated', (updatedOrder) => {
      setOrder((prev) => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
    });

    return () => socket.disconnect();
  }, [orderId]);

  // Geofence check
  const handleChooseMethod = async (method) => {
  setSavingMethod(true);
  try {
    const res = await fetch(`${getApiUrl()}/api/orders/${orderId}/choose-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    });
    const data = await res.json();
    if (data.success) {
      setOrder((prev) => ({ ...prev, paymentMethod: method }));
    } else {
      setError(data.message);
    }
  } catch {
    setError('Could not save payment method');
  } finally {
    setSavingMethod(false);
  }
};
  const runGeofenceCheck = async () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('checking');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${getApiUrl()}/api/orders/${orderId}/verify-location`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = await res.json();
          if (data.success) {
            setDistanceM(data.data.distanceMeters);
            setOrder((prev) => ({ ...prev, ...data.data.order }));
            setGeoStatus(data.data.withinRange ? 'verified' : 'error');
          } else {
            setGeoStatus('error');
          }
        } catch {
          setGeoStatus('error');
        }
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (order && order.status === 'staged_pending' && geoStatus === 'idle') {
      runGeofenceCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, geoStatus]);

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <>
      <div style={{ background: 'var(--dark-green)', color: 'var(--white)', padding: '20px 24px' }}>
        <div className="container" style={{ padding: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Order Status</div>
          {order && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{order.orderCode}</div>}
        </div>
      </div>

      <main className="container">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading order...</p>}
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}

        {order && (
          <div className="card" style={{ maxWidth: 420, marginTop: 24 }}>
            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              {STATUS_STEPS.map((step, idx) => (
                <div key={step.key} style={{ textAlign: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      margin: '0 auto 6px auto',
                      background: idx <= currentStepIndex ? 'var(--green)' : '#E4EAE6',
                      color: idx <= currentStepIndex ? 'var(--white)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {idx <= currentStepIndex ? '✓' : idx + 1}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{step.label}</div>
                </div>
              ))}
            </div>

            {/* Status badge */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                {order.status === 'staged_pending'
                  ? '⏳ Waiting for you to arrive'
                  : order.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Items */}
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontWeight: 700 }}>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 14,
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--dark-green)',
              }}
            >
              <span>Total</span>
              <span>₱{order.totalAmount.toFixed(2)}</span>
            </div>

            {/* Pay via GCash button/ cash */}
           {order.status === 'ready_for_pickup' && (
  <div style={{ marginTop: 16 }}>
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: '#1B4332',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      Choose Payment Method
    </div>

    <div style={{ display: 'grid', gap: 10 }}>
      {/* Cash option */}
      <button
        onClick={() => handleChooseMethod('cash')}
        disabled={savingMethod}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 14,
          background: order.paymentMethod === 'cash' ? '#E6F4EA' : '#fff',
          color: '#1B4332',
          border: order.paymentMethod === 'cash' ? '2px solid #1B4332' : '1.5px solid #E0EAE3',
          borderRadius: 10,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 26 }}>💵</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Pay with Cash</div>
          <div style={{ fontSize: 11.5, color: '#6B7A72', marginTop: 2 }}>
            Pay ₱{order.totalAmount.toFixed(2)} at the counter
          </div>
        </div>
        {order.paymentMethod === 'cash' && (
          <span style={{ fontSize: 18, color: '#1B4332' }}>✓</span>
        )}
      </button>

      {/* GCash option */}
      <button
        onClick={() => handleChooseMethod('gcash')}
        disabled={savingMethod}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 14,
          background: order.paymentMethod === 'gcash' ? '#E6F4EA' : '#fff',
          color: '#1B4332',
          border: order.paymentMethod === 'gcash' ? '2px solid #1B4332' : '1.5px solid #E0EAE3',
          borderRadius: 10,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 26 }}>💳</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Pay via GCash</div>
          <div style={{ fontSize: 11.5, color: '#6B7A72', marginTop: 2 }}>
            Generate a signed payment QR
          </div>
        </div>
        {order.paymentMethod === 'gcash' && (
          <span style={{ fontSize: 18, color: '#1B4332' }}>✓</span>
        )}
      </button>
    </div>

    {/* GCash CTA appears after selection */}
    {order.paymentMethod === 'gcash' && (
      <button
        onClick={() => router.push(`/wallet/${orderId}`)}
        style={{
          width: '100%',
          padding: 14,
          background: '#FFC72C',
          color: '#1B4332',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          marginTop: 12,
        }}
      >
        💳 Continue to Generate Payment QR →
      </button>
    )}

    {/* Cash note */}
    {order.paymentMethod === 'cash' && (
      <div
        style={{
          background: '#FFF6DE',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          color: '#8a6d00',
          marginTop: 12,
          textAlign: 'center',
        }}
      >
        💵 Please proceed to the counter and pay ₱{order.totalAmount.toFixed(2)} in cash.
      </div>
    )}
  </div>
)}

            {/* Geofence note */}
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#FFF6DE',
                borderRadius: 'var(--radius)',
                fontSize: 11.5,
                color: '#8a6d00',
                textAlign: 'center',
              }}
            >
              📍 Your order will activate automatically once you&apos;re within 50m of the store.
            </div>

            {/* Geo feedback */}
            {geoStatus === 'checking' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
                📡 Verifying your location...
              </div>
            )}
            {geoStatus === 'verified' && order.status === 'queued' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--green)', fontWeight: 700 }}>
                ✅ You are now in queue! Distance: {distanceM}m
              </div>
            )}
            {geoStatus === 'denied' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: '#c0392b' }}>
                ⚠️ Location permission denied. Please enable to activate order.
                <div>
                  <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={runGeofenceCheck}>
                    Retry Location
                  </button>
                </div>
              </div>
            )}
            {geoStatus === 'error' && order.status === 'staged_pending' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: '#c0392b' }}>
                📍 You are too far from the store (or location unavailable).
                <div>
                  <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={runGeofenceCheck}>
                    🔄 Check again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}