'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  return `http://${window.location.hostname}:5000`;
};

export default function CustomerAuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState('signin');

  // Sign In fields (per SRS: Full Name + Phone + Password)
  const [siName, setSiName] = useState('');
  const [siContact, setSiContact] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register fields
  const [reg, setReg] = useState({
    name: '',
    contactNumber: '',
    gmail: '',
    location: '',
    age: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!siName.trim() || !siContact.trim() || !siPassword) {
      setError('Full Name, Phone Number, and Password are all required.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siName.trim(),
          contactNumber: siContact.trim(),
          password: siPassword,
          role: 'customer',
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('saritrack_customer_token', data.data.token);
      sessionStorage.setItem('saritrack_customer', JSON.stringify(data.data.user));
      router.push('/menu');
    } catch {
      setError('Could not reach server');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    const { name, contactNumber, gmail, location, age, password, confirmPassword } = reg;

    if (!name.trim() || !contactNumber.trim() || !password) {
      setError('Full Name, Phone Number, and Password are required.');
      return;
    }
    if (!/^09\d{9}$/.test(contactNumber.trim())) {
      setError('Enter a valid PH mobile number (e.g. 09171234567).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contactNumber: contactNumber.trim(),
          gmail: gmail.trim() || undefined,
          location: location.trim() || undefined,
          age: age ? Number(age) : undefined,
          password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('saritrack_customer_token', data.data.token);
      sessionStorage.setItem('saritrack_customer', JSON.stringify(data.data.user));
      router.push('/menu');
    } catch {
      setError('Could not reach server');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ background: 'linear-gradient(160deg, #1B4332 0%, #3C9A5F 100%)', padding: '48px 24px 40px', color: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>SariTrack</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Order ahead. Skip the line.</div>
        </div>
      </div>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', marginTop: -20 }}>
        <div style={{ background: '#fff', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 440, padding: 16, borderRadius: 12, border: '1px solid #E0EAE3', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFC72C' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1B4332' }}>Aling Nena&apos;s Sari-Sari Store</div>
            <div style={{ fontSize: 11.5, color: '#6B7A72', marginTop: 2 }}>Brgy. Poblacion · Open now</div>
          </div>
        </div>

        <div style={{ background: '#fff', maxWidth: 440, marginTop: 20, borderRadius: 12, border: '1px solid #E0EAE3', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #E0EAE3' }}>
            <button onClick={() => { setTab('signin'); setError(''); }} style={{ flex: 1, padding: 14, background: tab === 'signin' ? '#fff' : '#f5f9f6', color: tab === 'signin' ? '#1B4332' : '#6B7A72', border: 'none', borderBottom: tab === 'signin' ? '3px solid #1B4332' : '3px solid transparent', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Sign In</button>
            <button onClick={() => { setTab('register'); setError(''); }} style={{ flex: 1, padding: 14, background: tab === 'register' ? '#fff' : '#f5f9f6', color: tab === 'register' ? '#1B4332' : '#6B7A72', border: 'none', borderBottom: tab === 'register' ? '3px solid #1B4332' : '3px solid transparent', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Register</button>
          </div>

          <div style={{ padding: 24 }}>
            {error && <div style={{ background: '#fee', color: '#c0392b', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

            {tab === 'signin' ? (
  <>
    <div
      style={{
        background: '#E6F4EA',
        borderLeft: '4px solid #1B4332',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1B4332' }}>
        👋 Hello! Customer, welcome to our store.
      </div>
      <div style={{ fontSize: 11.5, color: '#6B7A72', marginTop: 4 }}>
        Please sign in to continue.
      </div>
    </div>

                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Juan Dela Cruz" value={siName} onChange={(e) => setSiName(e.target.value)} style={inputStyle} />

                <label style={labelStyle}>Phone Number</label>
                <input type="tel" placeholder="09171234567" value={siContact} onChange={(e) => setSiContact(e.target.value)} style={inputStyle} />

                <label style={labelStyle}>Password</label>
                <input type="password" placeholder="••••••••" value={siPassword} onChange={(e) => setSiPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} style={inputStyle} />

                <button onClick={handleSignIn} disabled={loading} style={btnStyle}>{loading ? 'Signing in...' : 'Sign In →'}</button>
              </>
            ) : (
              <>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" placeholder="Juan Dela Cruz" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Phone Number *</label>
                <input type="tel" placeholder="09171234567" value={reg.contactNumber} onChange={(e) => setReg({ ...reg, contactNumber: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Gmail</label>
                <input type="email" placeholder="juan@gmail.com" value={reg.gmail} onChange={(e) => setReg({ ...reg, gmail: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Location</label>
                <input type="text" placeholder="Barangay San Isidro" value={reg.location} onChange={(e) => setReg({ ...reg, location: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Age</label>
                <input type="number" placeholder="25" value={reg.age} onChange={(e) => setReg({ ...reg, age: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Password *</label>
                <input type="password" placeholder="At least 6 characters" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} style={inputStyle} />

                <label style={labelStyle}>Confirm Password *</label>
                <input type="password" placeholder="Re-enter password" value={reg.confirmPassword} onChange={(e) => setReg({ ...reg, confirmPassword: e.target.value })} style={inputStyle} />

                <button onClick={handleRegister} disabled={loading} style={btnStyle}>{loading ? 'Creating account...' : 'Create Account →'}</button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

const labelStyle = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#6B7A72', textTransform: 'uppercase', marginTop: 12 };
const inputStyle = { width: '100%', padding: '12px 14px', marginTop: 6, border: '1.5px solid #E0EAE3', borderRadius: 10, fontSize: 14 };
const btnStyle = { width: '100%', padding: 14, marginTop: 20, background: '#1B4332', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' };