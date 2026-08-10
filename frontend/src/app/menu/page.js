'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MenuPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get('name') || 'Guest';
  const contact = searchParams.get('contact') || '';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({}); // { productId: { product, quantity } }

  useEffect(() => {
    fetch(`${API_URL}/api/products?activeOnly=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
        } else {
          setError('Failed to load products.');
        }
      })
      .catch(() => setError('Could not connect to the store. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev[product._id];
      const currentQty = existing ? existing.quantity : 0;

      // don't let cart quantity exceed available stock
      if (currentQty >= product.stock) return prev;

      return {
        ...prev,
        [product._id]: { product, quantity: currentQty + 1 },
      };
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
      return {
        ...prev,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

  const goToCart = () => {
    sessionStorage.setItem('saritrack_cart', JSON.stringify(cartItems.map(i => ({
      productId: i.product._id, name: i.product.name, price: i.product.price, quantity: i.quantity,
    }))));
    router.push(`/cart?name=${encodeURIComponent(name)}&contact=${encodeURIComponent(contact)}`);
  };

  return (
    <>
      {/* --- Top bar --- */}
      <div style={{ background: 'var(--dark-green)', color: 'var(--white)', padding: '20px 24px' }}>
        <div className="container" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Hi, {name} 👋</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Aling Nena&apos;s Sari-Sari Store</div>
          </div>
          <div className="badge badge-yellow">🛒 Cart · {cartCount}</div>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: cartCount > 0 ? 90 : 24 }}>
        <h2 style={{ color: 'var(--dark-green)', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, margin: '20px 0 14px 0' }}>
          Store Menu
        </h2>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading products...</p>}
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No products available yet. Check back soon!</p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 14,
        }}>
          {products.map((p) => {
            const inCart = cart[p._id]?.quantity || 0;
            return (
              <div key={p._id} className="card">
                <div style={{
                  width: '100%', height: 80, borderRadius: 8,
                  background: '#DCEFE2', marginBottom: 10,
                }} />
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark-green)' }}>{p.name}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                  ₱{p.price.toFixed(2)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {p.status === 'low_stock' ? '⚠ Low stock' : `${p.stock} available`}
                </div>

                {inCart === 0 ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 10, fontSize: 12.5, padding: '9px' }}
                    onClick={() => addToCart(p)}
                  >
                    + Add
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: 14 }}
                      onClick={() => removeFromCart(p._id)}
                    >
                      −
                    </button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: 'var(--dark-green)' }}>
                      {inCart}
                    </span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: 14 }}
                      onClick={() => addToCart(p)}
                      disabled={inCart >= p.stock}
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

      {/* --- Floating cart summary bar --- */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--dark-green)', color: 'var(--white)',
          padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -8px 20px rgba(0,0,0,0.15)',
        }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{cartCount} item{cartCount > 1 ? 's' : ''}</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>₱{cartTotal.toFixed(2)}</div>
          </div>
          <button className="btn btn-accent" onClick={goToCart}>
            View Cart →
          </button>
        </div>
      )}
    </>
  );
}