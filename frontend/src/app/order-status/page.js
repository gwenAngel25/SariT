'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                {order.status === 'staged_pending' ? '⏳ Waiting for you to arrive' : order.status.replace(/_/g, ' ')}
              </span>
            </div>

            {order.items.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontWeight: 700 }}>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 14, fontSize: 15, fontWeight: 800, color: 'var(--dark-green)',
            }}>
              <span>Total</span>
              <span>₱{order.totalAmount.toFixed(2)}</span>
            </div>

            <div style={{
              marginTop: 16, padding: 12, background: '#FFF6DE', borderRadius: 'var(--radius)',
              fontSize: 11.5, color: '#8a6d00', textAlign: 'center',
            }}>
              📍 Your order will activate automatically once you&apos;re within 50m of the store.
            </div>
          </div>
        )}
      </main>
    </>
  );
}