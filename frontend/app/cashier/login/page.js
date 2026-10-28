'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function CashierLoginPage() {
  const router = useRouter();
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!contactNumber || !password) {
      setError('Please enter contact number and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactNumber, password, role: 'cashier' }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Save token + user to sessionStorage
      sessionStorage.setItem('saritrack_token', data.data.token);
      sessionStorage.setItem('saritrack_user', JSON.stringify(data.data.user));

      // Redirect to POS dashboard
      router.push('/cashier');
    } catch (err) {
      setError('Could not reach server');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1B4332 0%, #3C9A5F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 40,
          borderRadius: 16,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1B4332' }}>
            SariTrack
          </div>
          <div style={{ fontSize: 13, color: '#6B7A72', marginTop: 4 }}>
            Cashier Portal
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c0392b',
              padding: 10,
              borderRadius: 8,
              fontSize: 12.5,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <label
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#6B7A72',
            textTransform: 'uppercase',
          }}
        >
          Contact Number
        </label>
        <input
          type="tel"
          placeholder="0917 XXX XXXX"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            marginTop: 6,
            marginBottom: 16,
            border: '1.5px solid #E0EAE3',
            borderRadius: 10,
            fontSize: 14,
          }}
        />

        <label
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#6B7A72',
            textTransform: 'uppercase',
          }}
        >
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%',
            padding: '12px 14px',
            marginTop: 6,
            marginBottom: 20,
            border: '1.5px solid #E0EAE3',
            borderRadius: 10,
            fontSize: 14,
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            background: '#1B4332',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#6B7A72',
            marginTop: 16,
          }}
        >
          Secured with SHA-256 verification
        </div>
      </div>
    </div>
  );
}