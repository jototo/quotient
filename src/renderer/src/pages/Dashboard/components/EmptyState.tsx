import { useImport } from '@renderer/context/ImportContext'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { n: '1', label: 'Add an account', sub: 'Checking, savings, credit card…', action: 'accounts' as const },
  { n: '2', label: 'Import a CSV',   sub: 'Export from your bank and import', action: 'import' as const },
  { n: '3', label: 'Explore',        sub: 'Reports, budgets, goals, and more', action: null },
]

export default function EmptyState() {
  const { open } = useImport()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%', padding: '0 24px' }}>

        {/* Logo mark */}
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 28px',
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 48px rgba(0,201,167,0.35)',
        }}>
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <path d="M14 2L24 8V20L14 26L4 20V8L14 2Z" stroke="#070B12" strokeWidth="1.5"/>
            <path d="M14 8L19 11V17L14 20L9 17V11L14 8Z" fill="#070B12"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>Welcome to Quotient</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.65, marginBottom: 36 }}>
          Your finances, stored locally. No accounts, no subscriptions, no tracking.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, textAlign: 'left' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: i === 2 ? 'var(--surface-2)' : 'var(--accent)',
                border: i === 2 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                color: i === 2 ? 'var(--text-dim)' : 'var(--bg)',
              }}>{step.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{step.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{step.sub}</div>
              </div>
              {step.action === 'accounts' && (
                <button onClick={() => navigate('/accounts')} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-2)',
                  background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                }}>Add Account →</button>
              )}
              {step.action === 'import' && (
                <button onClick={open} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  boxShadow: '0 0 14px rgba(0,201,167,0.25)',
                }}>Import CSV →</button>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          CSV exports are available from most banks under<br />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Account Activity → Download → CSV</span>
        </p>
      </div>
    </div>
  )
}
