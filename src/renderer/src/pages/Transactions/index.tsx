import React from 'react'
export default function Transactions(): React.JSX.Element {
  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
        Transactions
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>Browse and categorize your transactions.</p>
    </div>
  )
}
