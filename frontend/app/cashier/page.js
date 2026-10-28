'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};
const getSocketUrl = () => getApiUrl();

export default function CashierPage() {
  const router = useRouter();
  const [queue, setQueue] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  // --- Auth check ---
  useEffect(() => {
    const token = sessionStorage.getItem('saritrack_token');
    const userData = sessionStorage.getItem('saritrack_user');

    if (!token || !userData) {
      router.push('/cashier/login');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'cashier' && parsed.role !== 'admin') {
      router.push('/cashier/login');
      return;
    }

    setUser(parsed);
  }, [router]);

  const getToken = () => sessionStorage.getItem('saritrack_token') || '';

  // --- API helpers (with auth) ---
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/queue`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setQueue(data.data);
      else if (res.status === 401) router.push('/cashier/login');
    } catch {
      setError('Could not load queue');
    }
  }, [router]);

  const fetchActiveOrders = useCallback(async () => {
  try {
    const headers = { Authorization: `Bearer ${getToken()}` };
    const [stagingRes, readyRes, paidRes] = await Promise.all([
      fetch(`${getApiUrl()}/api/orders?status=staging`, { headers }),
      fetch(`${getApiUrl()}/api/orders?status=ready_for_pickup`, { headers }),
      fetch(`${getApiUrl()}/api/orders?status=paid`, { headers }),
    ]);
    const staging = await stagingRes.json();
    const ready = await readyRes.json();
    const paid = await paidRes.json();
    setActiveOrders([
      ...(staging.success ? staging.data : []),
      ...(ready.success ? ready.data : []),
    ]);
    setPaidOrders(paid.success ? paid.data : []);
  } catch {}
}, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
      setLoading(false);
    };
    load();
  }, [user, fetchQueue, fetchActiveOrders]);

  // --- Real-time ---
  useEffect(() => {
    if (!user) return;
    const socket = io(getSocketUrl());
    socket.emit('joinQueueRoom');
    socket.on('queue:updated', (q) => {
      if (q) setQueue(q.entries || q);
      fetchActiveOrders();
    });
    return () => socket.disconnect();
  }, [user, fetchActiveOrders]);

  // --- Actions ---
  const callNext = async (orderId) => {
    setActionLoading(orderId);
    setError('');
    try {
      const res = await fetch(`${getApiUrl()}/api/queue/${orderId}/call`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.success) setError(data.message);
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
    } catch {
      setError('Could not reach server');
    } finally {
      setActionLoading('');
    }
  };

  const updateStatus = async (orderId, status) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`${getApiUrl()}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) setError(data.message);
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
    } catch {
      setError('Could not reach server');
    } finally {
      setActionLoading('');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('saritrack_token');
    sessionStorage.removeItem('saritrack_user');
    router.push('/cashier/login');
  };

  if (!user) return null; // avoid flash before redirect

  const sortedQueue = [...queue].sort((a, b) => a.position - b.position);

  return (
    <>
      {/* Header */}
      <div style={{ background: '#1B4332', color: '#fff', padding: '16px 24px' }}>
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
            <div style={{ fontSize: 17, fontWeight: 800 }}>Cashier POS</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {user.name} · Aling Nena&apos;s Sari-Sari Store
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span
              style={{
                background: '#FFC72C',
                color: '#1B4332',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              👥 {sortedQueue.length} in queue
            </span>
            <button
              onClick={logout}
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
              Logout
            </button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: 24 }}>
        {error && (
          <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#6B7A72' }}>Loading dashboard...</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {/* Queue panel */}
            <div
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E0EAE3',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <h3 style={{ color: '#1B4332', fontSize: 15 }}>
                  📋 Live Queue (FIFO)
                </h3>
                <button
                  onClick={fetchQueue}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #1B4332',
                    color: '#1B4332',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {sortedQueue.length === 0 ? (
                <p style={{ color: '#6B7A72', fontSize: 13.5 }}>
                  No customers in queue.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedQueue.map((entry) => (
                    <div
                      key={entry.order}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        border: '1px solid #E0EAE3',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#3C9A5F',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 15,
                          }}
                        >
                          {entry.position}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: '#1B4332',
                            }}
                          >
                            {entry.customerName}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#6B7A72' }}>
                            {entry.orderCode}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => callNext(entry.order)}
                        disabled={actionLoading === entry.order}
                        style={{
                          background: '#1B4332',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {actionLoading === entry.order ? '...' : 'Call Next'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active orders panel */}
            <div
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 12,
                border: '1px solid #E0EAE3',
              }}
            >
              <h3 style={{ color: '#1B4332', fontSize: 15, marginBottom: 14 }}>
                🧺 Active Orders
              </h3>

              {activeOrders.length === 0 ? (
                <p style={{ color: '#6B7A72', fontSize: 13.5 }}>
                  No active orders.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeOrders.map((order) => (
                    <div
                      key={order._id}
                      style={{
                        padding: 12,
                        border: '1px solid #E0EAE3',
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: '#1B4332',
                            }}
                          >
                            {order.customer.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#6B7A72' }}>
                            {order.orderCode} · {order.items.length} item(s) · ₱
                            {order.totalAmount.toFixed(2)}
                          </div>
                        </div>
                        <span
                          style={{
                            background:
                              order.status === 'ready_for_pickup'
                                ? '#E6F4EA'
                                : '#FFF6DE',
                            color:
                              order.status === 'ready_for_pickup'
                                ? '#1B4332'
                                : '#8a6d00',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {order.status === 'ready_for_pickup'
                            ? '✓ Ready'
                            : '⏳ Staging'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {order.status === 'staging' && (
                          <button
                            onClick={() => updateStatus(order._id, 'ready_for_pickup')}
                            disabled={actionLoading === order._id}
                            style={{
                              flex: 1,
                              padding: 8,
                              background: '#1B4332',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Ready
                          </button>
                        )}
                       {order.status === 'ready_for_pickup' && (
<button
    onClick={() => router.push(`/cashier/payment/${order._id}`)}
    style={{
      flex: 1,
      padding: 8,
      background: '#FFC72C',
      color: '#1B4332',
      border: 'none',
      borderRadius: 8,
      fontSize: 12.5,
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    💰 Process Payment
  </button>
)}
                        
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}