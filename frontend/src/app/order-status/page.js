'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import io from 'socket.io-client'; // WebSocket client — para sa real-time updates

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// --- Kini ang geofence nga radius (mismo) nga gi-validate sa backend.
//     Dili nato kini i-duplicate para sa security; para ra kini sa UI hint
//     nga maipakita sa customer ("50m ra ang gilay-on"). ---
const GEOFENCE_RADIUS_METERS = 50;

const STATUS_STEPS = [
  { key: 'staged_pending', label: 'Pending' },
  { key: 'queued', label: 'Queued' },
  { key: 'staging', label: 'Staging' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'paid', label: 'Paid' },
];

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Geolocation state — para ma-track kung gi-verify na ba ang lokasyon,
  // ug para malikayan ang daghan kaayo nga pag-request (spam) sa geofence.
  const [geoStatus, setGeoStatus] = useState('idle'); // 'idle' | 'checking' | 'verified' | 'denied' | 'error'
  const [distanceM, setDistanceM] = useState(null);   // gitipigan ang "distansya sa store" para ma-display sa customer

  // --- Initial load: fetch the order once via REST API ---
  useEffect(() => {
    if (!orderId) {
      setError('No order found.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrder(data.data);
        } else {
          setError('Order not found.');
        }
      })
      .catch(() => setError('Could not load order status.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // --- Real-time layer: join this order's WebSocket room and listen for
  //     'order:updated' events — this is what makes the status stepper
  //     move from "Pending" to "Queued" automatically once the backend
  //     verifies the geofence, with NO page refresh needed. ---
  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_URL);

    socket.emit('joinOrderRoom', orderId); // tell backend: "only send me updates for this order"

    socket.on('order:updated', (updatedOrder) => {
      setOrder((prev) => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
    });

    return () => socket.disconnect(); // cleanup when leaving the page
  }, [orderId]);

  // --- STEP 2: GEO-GATE — automatic activation kung duol na sa tindahan.
  //     Kung ang order naa pa sa 'staged_pending' (naghulat pa sa customer),
  //     mangayo ta sa HTML5 Geolocation sa browser, i-patch kini sa backend,
  //     ug ang backend maoy mohukom (Haversine) kung naa ba sa 50m radius.
  //     Human makasulod sa queue, mohunong na ta sa pag-request (tipid sa battery).
  const runGeofenceCheck = async () => {
    // Kung wala mag-geolocation ang browser, i-skip na lang — dili ta mo-force.
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('checking');

    // getCurrentPosition: usa ra ka check (dili continuous watch).
    // enableHighAccuracy = true: mas tukma ang GPS (importante sa 50m radius).
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${API_URL}/api/orders/${orderId}/verify-location`, {
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
        // 1 = PERMISSION_DENIED — ni-click og "Block" ang customer.
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  // I-run ang geofence check kung bag-o pa ang order (staged_pending)
  // ug wala pa gyud ma-verify. Kung 'queued' na o mas dugang, wa nay rason.
  useEffect(() => {
    if (order && order.status === 'staged_pending' && geoStatus === 'idle') {
      runGeofenceCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, geoStatus]);

  const currentStepIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;

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
            {/* --- Status stepper: 5 steps, filled green up to current status --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              {STATUS_STEPS.map((step, idx) => (
                <div key={step.key} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', margin: '0 auto 6px auto',
                    background: idx <= currentStepIndex ? 'var(--green)' : '#E4EAE6',
                    color: idx <= currentStepIndex ? 'var(--white)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {idx <= currentStepIndex ? '✓' : idx + 1}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{step.label}</div>
                </div>
              ))}
            </div>

            {/* --- Status badge --- */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                {order.status === 'staged_pending' ? '⏳ Waiting for you to arrive' : order.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* --- Order items --- */}
            {order.items.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontWeight: 700 }}>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            {/* --- Total --- */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 14, fontSize: 15, fontWeight: 800, color: 'var(--dark-green)',
            }}>
              <span>Total</span>
              <span>₱{order.totalAmount.toFixed(2)}</span>
            </div>

            {/* --- Geofence info note + status --- */}
            <div style={{
              marginTop: 16, padding: 12, background: '#FFF6DE', borderRadius: 'var(--radius)',
              fontSize: 11.5, color: '#8a6d00', textAlign: 'center',
            }}>
              📍 Your order will activate automatically once you&apos;re within 50m of the store.
            </div>

            {/* --- Geolocation feedback box (Bisaya) --- */}
            {geoStatus === 'checking' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
                📡 Gi-verify ang imong lokasyon...
              </div>
            )}
            {geoStatus === 'verified' && order.status === 'queued' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--green)', fontWeight: 700 }}>
                ✅ Naka-queue ka na! Distansya sa tindahan: {distanceM}m
              </div>
            )}
            {geoStatus === 'denied' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: '#c0392b' }}>
                ⚠️ Wala ka gi-allow sa lokasyon. I-allow ang location para ma-activate ang order.
                <div>
                  <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={runGeofenceCheck}>
                    Retry Location
                  </button>
                </div>
              </div>
            )}
            {geoStatus === 'error' && order.status === 'staged_pending' && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: '#c0392b' }}>
                📍 Layo ka pa sa tindahan (o wala ma-determine ang lokasyon). Duol-a lang ang store.
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