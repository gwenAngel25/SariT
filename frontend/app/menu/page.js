'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function MenuPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');

  // --- Auth check ---
  useEffect(() => {
    const token = sessionStorage.getItem('saritrack_customer_token');
    const userData = sessionStorage.getItem('saritrack_customer');
    if (!token || !userData) {
      router.push('/');
      return;
    }
    setCustomer(JSON.parse(userData));
    setAuthChecked(true);
  }, [router]);

  // --- Fetch products ---
  useEffect(() => {
    if (!authChecked) return;

    fetch(`${getApiUrl()}/api/products?activeOnly=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
        else setError('Failed to load products.');
      })
      .catch(() => setError('Could not connect to the store.'))
      .finally(() => setLoading(false));
  }, [authChecked]);

  // --- Cart helpers ---
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev[product._id];
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= product.stock) return prev;
      return { ...prev, [product._id]: { product, quantity: currentQty + 1 } };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0
  );

  const goToCart = () => {
    sessionStorage.setItem(
      'saritrack_cart',
      JSON.stringify(
        cartItems.map((i) => ({
          productId: i.product._id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
        }))
      )
    );
    router.push('/cart');
  };

  const logout = () => {
    sessionStorage.removeItem('saritrack_customer_token');
    sessionStorage.removeItem('saritrack_customer');
    sessionStorage.removeItem('saritrack_cart');
    router.push('/');
  };

  // --- Filter by search ---
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Hi, {customer?.name} 👋
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              Aling Nena&apos;s Sari-Sari Store
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
              🛒 Cart · {cartCount}
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

      <main
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '24px 24px 100px',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1.5px solid #E0EAE3',
            borderRadius: 10,
            fontSize: 14,
            marginBottom: 20,
          }}
        />

        <h2
          style={{
            color: '#1B4332',
            fontSize: 15,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 14,
          }}
        >
          Store Menu
        </h2>

        {loading && <p style={{ color: '#6B7A72' }}>Loading products...</p>}
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        {!loading && !error && filteredProducts.length === 0 && (
          <p style={{ color: '#6B7A72' }}>No products found.</p>
        )}

        {/* Product grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 14,
          }}
        >
          {filteredProducts.map((p) => {
            const inCart = cart[p._id]?.quantity || 0;
            return (
              <div
                key={p._id}
                style={{
                  background: '#fff',
                  border: '1px solid #E0EAE3',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 80,
                    borderRadius: 8,
                    background: '#DCEFE2',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                  }}
                >
                  🛒
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1B4332' }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#3C9A5F',
                    marginTop: 4,
                  }}
                >
                  ₱{p.price.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: '#6B7A72',
                    marginTop: 2,
                  }}
                >
                  {p.status === 'low_stock' ? '⚠ Low stock' : `${p.stock} available`}
                </div>

                {inCart === 0 ? (
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                    style={{
                      width: '100%',
                      marginTop: 10,
                      padding: 9,
                      background: p.stock === 0 ? '#ccc' : '#1B4332',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    + Add
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    <button
                      onClick={() => removeFromCart(p._id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 14,
                        background: '#fff',
                        color: '#1B4332',
                        border: '1.5px solid #1B4332',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#1B4332',
                      }}
                    >
                      {inCart}
                    </span>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={inCart >= p.stock}
                      style={{
                        padding: '6px 12px',
                        fontSize: 14,
                        background: '#1B4332',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#1B4332',
            color: '#fff',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -8px 20px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {cartCount} item{cartCount > 1 ? 's' : ''}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              ₱{cartTotal.toFixed(2)}
            </div>
          </div>
          <button
            onClick={goToCart}
            style={{
              padding: '12px 22px',
              background: '#FFC72C',
              color: '#1B4332',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            View Cart →
          </button>
        </div>
      )}
    </>
  );
}