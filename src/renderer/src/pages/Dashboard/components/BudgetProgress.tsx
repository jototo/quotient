import { formatCurrency } from '@renderer/utils/formatters'
import type { BudgetProgressRow } from '@renderer/hooks/useDashboardData'

function barColor(pct: number): string {
  if (pct >= 100) return 'var(--red)'
  if (pct >= 75) return 'var(--amber)'
  return 'var(--accent-2)'
}

export default function BudgetProgress({ budgets, month }: { budgets: BudgetProgressRow[]; month: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Budget · {month}</span>
        {budgets.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)', background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(0,201,167,0.25)' }}>
            {formatCurrency(budgets.reduce((s, b) => s + b.spent, 0))} / {formatCurrency(budgets.reduce((s, b) => s + b.budget_amount, 0))}
          </span>
        )}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {budgets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
            No budgets set. Create a budget to track spending.
          </div>
        ) : (
          budgets.map((b) => {
            const pct = b.budget_amount > 0 ? Math.min((b.spent / b.budget_amount) * 100, 100) : 0
            const color = barColor((b.spent / b.budget_amount) * 100)
            return (
              <div key={b.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(b.spent)}</span> / {formatCurrency(b.budget_amount)}
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${pct}%`,
                    background: color, transition: 'width 0.6s ease',
                    boxShadow: `0 0 6px ${color}`,
                  }} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
