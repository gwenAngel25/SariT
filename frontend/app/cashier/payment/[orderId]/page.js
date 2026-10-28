'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashInput, setCashInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => sessionStorage.getItem('saritrack_token') || '';

  useEffect(() => {
    if (!orderId) return;
    fetch(`${getApiUrl()}/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data);
        else setError('Order not found');
      })
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const cash = parseFloat(cashInput) || 0;
  const total = order?.totalAmount || 0;
  const change = cash - total;
  const isSufficient = cash >= total && total > 0;

  const quickAmounts = [50, 100, 200, 500, 1000];

  const handleConfirm = async () => {
    if (!isSufficient) return;
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/api/payments/cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ orderId, cashTendered: cash }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      setReceipt(data.data);
    } catch (err) {
      setError('Could not reach server');
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
        <button onClick={goBack} style={{ marginTop: 20, padding: '10px 20px', background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Back to POS
        </button>
      </div>
    );
  }

  if (receipt) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F9F6', padding: 24 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #E0EAE3' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <h1 style={{ fontSize: 20, color: '#1B4332' }}>Payment Confirmed</h1>
              <p style={{ fontSize: 12.5, color: '#6B7A72', marginTop: 4 }}>
                Receipt for Order #{receipt.order.orderCode}
              </p>
            </div>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 13, marginBottom: 12, color: '#1B4332', fontWeight: 700 }}>
                Customer: {receipt.order.customerName}
              </div>

              {receipt.order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span style={{ fontWeight: 700 }}>₱{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: 15, fontWeight: 800, color: '#1B4332', borderTop: '2px solid #1B4332', marginTop: 12 }}>
                <span>TOTAL</span>
                <span>₱{receipt.order.totalAmount.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>Cash Tendered</span>
                <span>₱{receipt.cashTendered.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 15, fontWeight: 800, color: '#1B4332' }}>
                <span>CHANGE</span>
                <span>₱{receipt.change.toFixed(2)}</span>
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
          <div style={{ fontSize: 14, opacity: 0.85 }}>Cash Payment for</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Order #{order.orderCode}</div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>{order.customer.name}</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E0EAE3', marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, color: '#6B7A72', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>Amount Due</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#1B4332', textAlign: 'center', marginTop: 4 }}>₱{total.toFixed(2)}</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #E0EAE3', marginBottom: 16 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7A72', textTransform: 'uppercase' }}>Cash Tendered</label>
          <div style={{ position: 'relative', marginTop: 8, marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 22, fontWeight: 900, color: '#3C9A5F' }}>₱</span>
            <input
              type="number"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                width: '100%',
                padding: '16px 16px 16px 44px',
                border: '2px solid #E0EAE3',
                borderRadius: 10,
                fontSize: 24,
                fontWeight: 800,
                textAlign: 'right',
                color: '#1B4332',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setCashInput(String(amt))}
                style={{
                  padding: 10,
                  background: '#fff',
                  border: '1.5px solid #1B4332',
                  color: '#1B4332',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ₱{amt}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: isSufficient ? 'linear-gradient(135deg,#fff8e0,#ffeaa0)' : '#fff5f5',
            border: isSufficient ? '2px solid #FFC72C' : '2px solid #e0e0e0',
            padding: 20,
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: isSufficient ? '#8a6d00' : '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            Change Due
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: isSufficient ? '#8a6d00' : '#999', marginTop: 4 }}>
            {cash === 0 ? '₱0.00' : isSufficient ? `₱${change.toFixed(2)}` : 'Insufficient'}
          </div>
        </div>

        {error && (
          <div style={{ color: '#c0392b', fontSize: 12.5, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
  onClick={() => router.push(`/cashier/verify/${orderId}`)}
  style={{
    width: '100%',
    padding: 14,
    background: 'transparent',
    color: '#1B4332',
    border: '1.5px solid #1B4332',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10,
  }}
>
  🔐 Verify QR Payment Instead
</button>
      </div>
    </div>
  );
}