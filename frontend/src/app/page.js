'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!name.trim() || !contact.trim()) {
      setError('Please enter your name and contact number.');
      return;
    }
    if (!/^09\d{9}$/.test(contact.trim())) {
      setError('Enter a valid PH mobile number (e.g. 09171234567).');
      return;
    }
    setError('');
    // Pass guest info forward — no account needed (C1 guest entry)
    router.push(`/menu?name=${encodeURIComponent(name)}&contact=${encodeURIComponent(contact)}`);
  };

  return (
    <>
      {/* --- Hero / store header --- */}
      <div style={{
        background: 'linear-gradient(160deg, var(--dark-green) 0%, var(--green) 100%)',
        padding: '48px 24px 64px 24px',
        color: 'var(--white)',
      }}>
        <div className="container" style={{ padding: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>SariTrack</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Order ahead. Skip the line.</div>
        </div>
      </div>

      <main className="container" style={{ marginTop: -40 }}>
        {/* --- Store badge card --- */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 420 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark-green)' }}>Aling Nena&apos;s Sari-Sari Store</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Brgy. Poblacion &nbsp;•&nbsp; Open now</div>
          </div>
        </div>

        {/* --- Guest entry form --- */}
        <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Juan Dela Cruz"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', marginTop: 6, marginBottom: 16,
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14,
            }}
          />

          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Contact Number
          </label>
          <input
            type="tel"
            placeholder="09XX XXX XXXX"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', marginTop: 6, marginBottom: 16,
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14,
            }}
          />

          {error && (
            <div style={{ color: '#c0392b', fontSize: 12.5, marginBottom: 12 }}>{error}</div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleContinue}>
            Continue to Store →
          </button>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, margin: '16px 0' }}>
            No account needed — order as guest
          </div>
        </div>
      </main>
    </>
  );
}