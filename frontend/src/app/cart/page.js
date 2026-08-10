'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get('name') || 'Guest';
  const contact = searchParams.get('contact') || '';

  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('saritrack_cart');
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          contactNumber: contact,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to place order.');
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem('saritrack_cart');
      sessionStorage.setItem('saritrack_order', JSON.stringify(data.data));
      router.push(`/order-status?id=${data.data._id}`);
    } catch (err) {
      setError('Could not reach the store. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ background: 'var(--dark-green)', color: 'var(--white)', padding: '20px 24px' }}>
        <div className="container" style={{ padding: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Your Order</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · {name}
          </div>
        </div>
      </div>

      <main className="container">
        {items.length === 0 ? (
          <div className="card" style={{ maxWidth: 420, marginTop: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Your cart is empty.</p>
            <button className="btn btn-primary" onClick={() => router.push(`/menu?name=${encodeURIComponent(name)}&contact=${encodeURIComponent(contact)}`)}>
              ← Back to Menu
            </button>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 420, marginTop: 24 }}>
            {items.map((item) => (
              <div key={item.productId} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5,
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--dark-green)' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                    ₱{item.price.toFixed(2)} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>
                  ₱{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 14, marginTop: 4, fontSize: 15.5, fontWeight: 800, color: 'var(--dark-green)',
            }}>
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>

            {error && <div style={{ color: '#c0392b', fontSize: 12.5, marginTop: 12 }}>{error}</div>}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 18 }}
              onClick={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? 'Placing Order...' : 'Place Order →'}
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 12 }}>
              Order activates once you&apos;re within 50m of the store
            </div>
          </div>
        )}
      </main>
    </>
  );
}