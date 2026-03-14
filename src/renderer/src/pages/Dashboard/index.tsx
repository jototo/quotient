import React from 'react'
export default function Dashboard(): React.JSX.Element {
  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>Your financial overview at a glance.</p>
    </div>
  )
}
