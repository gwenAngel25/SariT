'use client';
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client'; // WebSocket client — para sa live updates

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Kini nga page mao ang CASHIER DASHBOARD (Merchant Interface).
// Ang tindera makakita sa live queue ug maka-control sa status sa kada order:
//   • "Call Next"  → gitawag na ang customer, order → 'staging' (gi-stack na ang items)
//   • "Mark Ready" → andam na for pickup, order → 'ready_for_pickup'
//   • "Mark Paid"  → bayad na, order → 'paid' (tangtangon sa queue, i-deduct ang stock)
export default function CashierPage() {
  const [queue, setQueue] = useState([]);          // live queue entries (from /api/queue)
  const [activeOrders, setActiveOrders] = useState([]); // staging + ready orders
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(''); // orderId nga currently gi-process

  // --- FETCH helpers ---
  // Naayo: naggamit og useCallback para stable ang function (no re-creation on each render)
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/queue`);
      const data = await res.json();
      if (data.success) {
        setQueue(data.data);
      }
    } catch {
      setError('Could not load the queue. Check the backend.');
    }
  }, []);

  // Load active orders — both 'staging' and 'ready_for_pickup' statuses
  const fetchActiveOrders = useCallback(async () => {
    try {
      const [stagingRes, readyRes] = await Promise.all([
        fetch(`${API_URL}/api/orders?status=staging`),
        fetch(`${API_URL}/api/orders?status=ready_for_pickup`),
      ]);
      const staging = await stagingRes.json();
      const ready = await readyRes.json();
      const combined = [
        ...(staging.success ? staging.data : []),
        ...(ready.success ? ready.data : []),
      ];
      setActiveOrders(combined);
    } catch {
      // Non-critical — the queue panel is the primary view
    }
  }, []);

  // --- Initial load + live refresh ---
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchQueue, fetchActiveOrders]);

  // --- REAL-TIME LAYER ---
  // Sumolod sa room nga 'queue:main'. Bisag ang queue ma-update na sa laing
  // device (e.g. ang geofence check sa customer), awtomatikong mo-refresh ni.
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('joinQueueRoom');

    socket.on('queue:updated', (updatedQueue) => {
      if (updatedQueue) setQueue(updatedQueue.entries || updatedQueue);
      fetchActiveOrders();
    });

    return () => socket.disconnect();
  }, [fetchActiveOrders]);

  // --- ACTIONS ---
  const callNext = async (orderId) => {
    setActionLoading(orderId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/queue/${orderId}/call`, { method: 'PATCH' });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not call customer.');
        return;
      }
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setActionLoading('');
    }
  };

  const updateStatus = async (orderId, status) => {
    setActionLoading(orderId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not update order.');
        return;
      }
      await Promise.all([fetchQueue(), fetchActiveOrders()]);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setActionLoading('');
    }
  };

  // Queue nga sorted by position (dili kompiyansa sa server order)
  const sortedQueue = [...queue].sort((a, b) => a.position - b.position);

  return (
    <>
      {/* --- Header --- */}
      <div style={{ background: 'var(--dark-green)', color: 'var(--white)', padding: '20px 24px' }}>
        <div className="container" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Cashier Dashboard</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Aling Nena&apos;s Sari-Sari Store</div>
          </div>
          <span className="badge badge-yellow">👥 {sortedQueue.length} sa queue</span>
        </div>
      </div>

      <main className="container">
        {error && (
          <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* --- LEFT: Live Queue --- */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ color: 'var(--dark-green)', fontSize: 15 }}>📋 Live Queue (FIFO)</h3>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={fetchQueue}>
                  🔄 Refresh
                </button>
              </div>

              {sortedQueue.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Wala pay naka-queue karon.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedQueue.map((entry) => (
                    <div key={entry.order} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Position circle */}
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', background: 'var(--green)',
                          color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 15,
                        }}>
                          {entry.position}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--dark-green)' }}>
                            {entry.customerName}
                            {entry.priority && <span className="badge badge-yellow" style={{ marginLeft: 6 }}>⭐ Priority</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{entry.orderCode}</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: 12.5 }}
                        onClick={() => callNext(entry.order)}
                        disabled={actionLoading === entry.order}
                      >
                        {actionLoading === entry.order ? '...' : 'Call Next'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- RIGHT: Active Orders (staging / ready) --- */}
            <div className="card">
              <h3 style={{ color: 'var(--dark-green)', fontSize: 15, marginBottom: 14 }}>🧺 Active Orders</h3>

              {activeOrders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Wala pay gi-stack nga orders karon.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeOrders.map((order) => (
                    <div key={order._id} style={{
                      padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--dark-green)' }}>
                            {order.customer.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {order.orderCode} · {order.items.length} item(s)
                          </div>
                        </div>
                        {/* Status badge: staging = red/amber, ready = green */}
                        <span className={order.status === 'ready_for_pickup' ? 'badge badge-green' : 'badge badge-red'}>
                          {order.status === 'ready_for_pickup' ? '✓ Ready' : '⏳ Staging'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {order.status === 'staging' && (
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '8px', fontSize: 12.5 }}
                            onClick={() => updateStatus(order._id, 'ready_for_pickup')}
                            disabled={actionLoading === order._id}
                          >
                            {actionLoading === order._id ? '...' : 'Mark Ready'}
                          </button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <button
                            className="btn btn-accent"
                            style={{ flex: 1, padding: '8px', fontSize: 12.5 }}
                            onClick={() => updateStatus(order._id, 'paid')}
                            disabled={actionLoading === order._id}
                          >
                            {actionLoading === order._id ? '...' : 'Mark Paid'}
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
