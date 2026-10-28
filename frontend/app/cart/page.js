'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function CartPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auth check + load cart
  useEffect(() => {
    const token = sessionStorage.getItem('saritrack_customer_token');
    const userData = sessionStorage.getItem('saritrack_customer');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    setCustomer(JSON.parse(userData));
    setAuthChecked(true);

    const stored = sessionStorage.getItem('saritrack_cart');
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, [router]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const updateQuantity = (productId, delta) => {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      );
      sessionStorage.setItem('saritrack_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.productId !== productId);
      sessionStorage.setItem('saritrack_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          contactNumber: customer.contactNumber,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
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
    } catch {
      setError('Could not reach the store. Please try again.');
      setSubmitting(false);
    }
  };

  if (!authChecked) return null;

  return (
    <>
      {/* Header */}
      <div style={{ background: '#1B4332', color: '#fff', padding: '20px 24px' }}>
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Your Order</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {items.length} item{items.length !== 1 ? 's' : ''} · {customer?.name}
            </div>
          </div>
          <button
            onClick={() => router.push('/menu')}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1.5px solid #fff',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Back to Menu
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
        {items.length === 0 ? (
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 12,
              border: '1px solid #E0EAE3',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <p style={{ color: '#6B7A72', marginBottom: 20 }}>
              Your cart is empty.
            </p>
            <button
              onClick={() => router.push('/menu')}
              style={{
                padding: '12px 24px',
                background: '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Browse Products →
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E0EAE3',
                marginBottom: 16,
              }}
            >
              {items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: '#DCEFE2',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    🛒
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#1B4332',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6B7A72' }}>
                      ₱{item.price.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      style={{
                        width: 26,
                        height: 26,
                        border: '1.5px solid #1B4332',
                        background: '#fff',
                        color: '#1B4332',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        minWidth: 18,
                        textAlign: 'center',
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      style={{
                        width: 26,
                        height: 26,
                        border: 'none',
                        background: '#1B4332',
                        color: '#fff',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: '#1B4332',
                      minWidth: 70,
                      textAlign: 'right',
                    }}
                  >
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#c0392b',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 16,
                  marginTop: 8,
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#1B4332',
                  borderTop: '2px solid #1B4332',
                }}
              >
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
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
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              style={{
                width: '100%',
                padding: 16,
                background: submitting ? '#ccc' : '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Placing Order...' : '📤 Place Order →'}
            </button>

            <div
              style={{
                textAlign: 'center',
                color: '#6B7A72',
                fontSize: 11,
                marginTop: 12,
              }}
            >
              Order activates once you&apos;re within 50m of the store
            </div>
          </>
        )}
      </main>
    </>
  );
}