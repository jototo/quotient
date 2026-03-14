import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatChartDate } from '@renderer/utils/formatters'

interface Props {
  history: { date: number; value: number }[]
  currentNetWorth: number
}

type Period = '1W' | '1M' | '3M' | '1Y' | 'All'

function filterByPeriod(data: { date: number; value: number }[], period: Period) {
  if (period === 'All' || data.length === 0) return data
  const now = Date.now()
  const ms: Record<Period, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'All': 0 }
  const cutoff = now - ms[period] * 86400000
  return data.filter(d => d.date >= cutoff)
}

const PERIODS: Period[] = ['1W', '1M', '3M', '1Y', 'All']

export default function NetWorthChart({ history, currentNetWorth }: Props) {
  const [period, setPeriod] = useState<Period>('3M')

  const filtered = filterByPeriod(history, period)
  const isEmpty = filtered.length === 0

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 0 24px rgba(0,201,167,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Net Worth</span>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-3)', padding: 3, borderRadius: 7, border: '1px solid var(--border)' }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: period === p ? '1px solid var(--border-2)' : '1px solid transparent',
              background: period === p ? 'var(--surface)' : 'transparent',
              color: period === p ? 'var(--text)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {formatCurrency(currentNetWorth)}
          </div>
        </div>
        {isEmpty ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-2)', borderRadius: 8, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No history yet</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>Import transactions to build your net worth timeline</div>
            </div>
          </div>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#00C9A7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => formatCurrency(v, true)}
                  tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  itemStyle={{ color: 'var(--accent)' }}
                  labelFormatter={(v) => formatChartDate(v as number)}
                  formatter={(v) => [formatCurrency(v as number), 'Net Worth']}
                />
                <Area dataKey="value" stroke="#00C9A7" strokeWidth={1.5} fill="url(#netWorthGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
