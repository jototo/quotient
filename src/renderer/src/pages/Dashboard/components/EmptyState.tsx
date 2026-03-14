import { useImport } from '@renderer/context/ImportContext'
import { useNavigate } from 'react-router-dom'

export default function EmptyState() {
  const { open } = useImport()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--accent)', margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(0,201,167,0.3)',
        }}>
          <svg viewBox="0 0 32 32" width="36" height="36" fill="none">
            <path d="M16 4L26 10V22L16 28L6 22V10L16 4Z" stroke="#070B12" strokeWidth="2" fill="none"/>
            <path d="M16 10L21 13V19L16 22L11 19V13L16 10Z" fill="#070B12"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>Welcome to Quotient</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Add an account and import a CSV export from your bank to get started tracking your finances.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => navigate('/accounts')} style={{
            padding: '9px 20px', borderRadius: 7, border: '1px solid var(--border-2)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
          }}>Add Account</button>
          <button onClick={open} style={{
            padding: '9px 20px', borderRadius: 7, border: 'none',
            background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
            boxShadow: '0 0 20px rgba(0,201,167,0.25)',
          }}>Import CSV</button>
        </div>
      </div>
    </div>
  )
}
