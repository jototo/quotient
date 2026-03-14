import { formatCurrency, formatDelta } from '@renderer/utils/formatters'
import type { DashboardData } from '@renderer/hooks/useDashboardData'

export default function StatCards({ data }: { data: DashboardData }) {
  const netWorthDelta = formatDelta(data.assets - data.liabilities, (data.assets - data.liabilities) - (data.currentMonthIncome - data.currentMonthSpending))
  const spendingDelta = formatDelta(data.currentMonthSpending, data.previousMonthSpending)
  const incomeDelta = formatDelta(data.currentMonthIncome, data.previousMonthIncome)

  const savingsRate = data.currentMonthIncome > 0
    ? ((data.currentMonthIncome - data.currentMonthSpending) / data.currentMonthIncome) * 100
    : 0
  const prevSavingsRate = data.previousMonthIncome > 0
    ? ((data.previousMonthIncome - data.previousMonthSpending) / data.previousMonthIncome) * 100
    : 0
  const savingsDelta = formatDelta(savingsRate, prevSavingsRate)

  const cards = [
    { label: 'Net Worth', value: formatCurrency(data.netWorth), delta: netWorthDelta, glowColor: 'rgba(0,201,167,0.5)' },
    { label: 'Monthly Spending', value: formatCurrency(data.currentMonthSpending), delta: { ...spendingDelta, direction: spendingDelta.direction === 'up' ? 'down' as const : spendingDelta.direction === 'down' ? 'up' as const : 'neutral' as const }, glowColor: 'rgba(61,142,255,0.5)' },
    { label: 'Monthly Income', value: formatCurrency(data.currentMonthIncome), delta: incomeDelta, glowColor: 'rgba(0,214,143,0.5)' },
    { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, delta: savingsDelta, glowColor: 'rgba(245,158,11,0.5)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${card.glowColor}, transparent)`
          }} />
          <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            {card.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
            {card.value}
          </div>
          <div style={{
            fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
            color: card.delta.direction === 'up' ? 'var(--green)' : card.delta.direction === 'down' ? 'var(--red)' : 'var(--text-muted)'
          }}>
            {card.delta.direction !== 'neutral' && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                {card.delta.direction === 'up'
                  ? <path d="M5 2l4 6H1l4-6z" fill="currentColor"/>
                  : <path d="M5 8L1 2h8L5 8z" fill="currentColor"/>
                }
              </svg>
            )}
            {card.delta.text}
          </div>
        </div>
      ))}
    </div>
  )
}
