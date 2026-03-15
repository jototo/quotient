import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { formatCurrency } from '@renderer/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = '3M' | '6M' | '12M'

interface MonthBucket {
  label: string   // "Jan '25"
  start: number
  end: number
  income: number
  spending: number
  saved: number
}

interface CategorySlice {
  id: string
  name: string
  color: string
  amount: number  // positive = spending
  pct: number
}

interface TopMerchant {
  description: string
  total: number
  count: number
}

interface ReportData {
  months: MonthBucket[]
  categories: CategorySlice[]
  topMerchants: TopMerchant[]
  totalIncome: number
  totalSpending: number
  totalSaved: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthStart(y: number, m: number) { return new Date(y, m, 1).getTime() }
function monthEnd(y: number, m: number)   { return new Date(y, m + 1, 1).getTime() }

function buildMonthBuckets(n: number): { start: number; end: number; label: string }[] {
  const now = new Date()
  const buckets: { start: number; end: number; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const y = now.getFullYear()
    const m = now.getMonth() - i
    const d = new Date(y, m, 1)
    buckets.push({
      start: monthStart(d.getFullYear(), d.getMonth()),
      end:   monthEnd(d.getFullYear(), d.getMonth()),
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
  }
  return buckets
}

const RANGE_MONTHS: Record<Range, number> = { '3M': 3, '6M': 6, '12M': 12 }
const RANGES: Range[] = ['3M', '6M', '12M']

const FALLBACK_COLORS = [
  '#00C9A7', '#3D8EFF', '#FF4D72', '#F59E0B', '#9B6DFF',
  '#00D68F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
]

// ─── Chart tooltip styles ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: { background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 },
  labelStyle: { color: '#4E6080' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
}

// ─── Custom donut label ───────────────────────────────────────────────────────

function DonutCenter({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fill: '#4E6080' }}>spent</tspan>
      <tspan x={cx} dy="20" style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, fill: '#D8E4F8' }}>{formatCurrency(total, true)}</tspan>
    </text>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [range, setRange]   = useState<Range>('3M')
  const [data, setData]     = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const n = RANGE_MONTHS[range]
    const buckets = buildMonthBuckets(n)
    const rangeStart = buckets[0].start
    const rangeEnd   = buckets[buckets.length - 1].end

    // All non-transfer transactions in range
    const [txRes] = await Promise.all([
      window.db.query(
        `SELECT t.amount, t.date, t.description, c.name AS cat_name, c.color AS cat_color, c.id AS cat_id
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.date >= ? AND t.date < ?
           AND COALESCE(t.is_transfer, 0) = 0
         ORDER BY t.date ASC`,
        [rangeStart, rangeEnd]
      ),
    ])

    type TxRow = { amount: number; date: number; description: string; cat_name: string | null; cat_color: string | null; cat_id: string | null }
    const txs: TxRow[] = (txRes.data ?? []) as TxRow[]

    // Build month buckets
    const months: MonthBucket[] = buckets.map(b => {
      const slice = txs.filter(t => t.date >= b.start && t.date < b.end)
      const income   = slice.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const spending = slice.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
      return { label: b.label, start: b.start, end: b.end, income, spending, saved: income - spending }
    })

    // Category breakdown (spending only)
    const catTotals = new Map<string, { name: string; color: string; total: number }>()
    for (const tx of txs) {
      if (tx.amount >= 0) continue
      const key = tx.cat_id ?? '__uncategorized'
      const name = tx.cat_name ?? 'Uncategorized'
      const color = tx.cat_color ?? '#2E4060'
      const prev = catTotals.get(key) ?? { name, color, total: 0 }
      catTotals.set(key, { ...prev, total: prev.total + Math.abs(tx.amount) })
    }
    const totalSpending = Array.from(catTotals.values()).reduce((s, c) => s + c.total, 0)
    const categories: CategorySlice[] = Array.from(catTotals.entries())
      .map(([id, v], i) => ({
        id,
        name: v.name,
        color: v.color === '#2E4060' ? FALLBACK_COLORS[i % FALLBACK_COLORS.length] : v.color,
        amount: v.total,
        pct: totalSpending > 0 ? (v.total / totalSpending) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // Top merchants
    const merchantMap = new Map<string, { total: number; count: number }>()
    for (const tx of txs) {
      if (tx.amount >= 0) continue
      const key = tx.description
      const prev = merchantMap.get(key) ?? { total: 0, count: 0 }
      merchantMap.set(key, { total: prev.total + Math.abs(tx.amount), count: prev.count + 1 })
    }
    const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
      .map(([description, v]) => ({ description, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    const totalIncome = months.reduce((s, m) => s + m.income, 0)

    setData({ months, categories, topMerchants, totalIncome, totalSpending, totalSaved: totalIncome - totalSpending })
    setLoading(false)
  }, [range])

  useEffect(() => { load() }, [load])

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[88, 300, 260].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  const savingsRate = data.totalIncome > 0 ? (data.totalSaved / data.totalIncome) * 100 : 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Reports</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Spending Analysis</h1>
        </div>
        {/* Range picker */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-3)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: range === r ? 600 : 400,
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
              border: range === r ? '1px solid var(--border-2)' : '1px solid transparent',
              background: range === r ? 'var(--surface)' : 'transparent',
              color: range === r ? 'var(--text)' : 'var(--text-muted)',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Income',   value: data.totalIncome,   color: 'var(--green)',    sign: '+' },
          { label: 'Total Spending', value: data.totalSpending, color: 'var(--red)',      sign: '-' },
          { label: 'Net Saved',      value: data.totalSaved,    color: data.totalSaved >= 0 ? 'var(--accent)' : 'var(--red)', sign: data.totalSaved >= 0 ? '+' : '' },
          { label: 'Savings Rate',   value: null,               color: savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--amber)' : 'var(--red)', sign: '' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: s.color }}>
              {s.value !== null
                ? `${s.sign}${formatCurrency(Math.abs(s.value))}`
                : `${savingsRate.toFixed(1)}%`}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly income vs spending chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Monthly Overview</span>
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            {[['var(--green)', 'Income'], ['var(--red)', 'Spending']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 12px 8px', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.months} barGap={3} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, name) => [formatCurrency(Number(v)), name === 'income' ? 'Income' : 'Spending']}
              />
              <Bar dataKey="income"   radius={[3, 3, 0, 0]} fill="#00D68F" fillOpacity={0.85} maxBarSize={28} />
              <Bar dataKey="spending" radius={[3, 3, 0, 0]} fill="#FF4D72" fillOpacity={0.85} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown + top merchants */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Donut + category list */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Spending by Category</span>
          </div>
          {data.categories.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No spending data for this period.</div>
          ) : (
            <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Donut */}
              <div style={{ flexShrink: 0, width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={42} outerRadius={64}
                      strokeWidth={0}
                      paddingAngle={1}
                    >
                      {data.categories.map((c) => (
                        <Cell key={c.id} fill={c.color} fillOpacity={0.9} />
                      ))}
                    </Pie>
                    <DonutCenter cx={70} cy={70} total={data.totalSpending} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 240, overflowY: 'auto' }}>
                {data.categories.map(c => (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{c.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(c.amount)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginLeft: 5 }}>{c.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 2, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top merchants */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Top Merchants</span>
          </div>
          {data.topMerchants.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No spending data for this period.</div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {data.topMerchants.map((m, i) => (
                <div key={m.description} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 20px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{m.count} transaction{m.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>{formatCurrency(m.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Savings trend */}
      {data.months.some(m => m.saved !== 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Monthly Savings</span>
          </div>
          <div style={{ padding: '16px 12px 8px', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="label" tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: '#2E4060', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Saved']} />
                <Bar dataKey="saved" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {data.months.map((m, i) => (
                    <Cell key={i} fill={m.saved >= 0 ? '#00C9A7' : '#FF4D72'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  )
}
