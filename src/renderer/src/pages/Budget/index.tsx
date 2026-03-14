import React from 'react'
export default function Budget(): React.JSX.Element {
  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
        Budget
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>Set and track your monthly spending budgets.</p>
    </div>
  )
}
