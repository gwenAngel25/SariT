export default function Header({ title, subtitle, variant = 'default' }) {
  const isDark = variant === 'dark';

  return (
    <header
      style={{
        background: isDark ? 'var(--dark-green)' : 'var(--white)',
        color: isDark ? 'var(--white)' : 'var(--dark-green)',
        borderBottom: isDark ? 'none' : '1px solid var(--border)',
        padding: '18px 24px',
      }}
    >
      <div className="container" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>SariTrack</div>
          {title && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{title}</div>}
        </div>
        {subtitle && (
          <span className="badge badge-yellow">{subtitle}</span>
        )}
      </div>
    </header>
  );
}