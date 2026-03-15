import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@renderer/utils/formatters'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType = 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond' | 'other'

interface Holding {
  id: string
  account_id: string
  ticker: string
  name: string | null
  shares: number
  cost_basis: number | null
  current_price: number | null
  asset_type: AssetType | null
  updated_at: number
}

interface Account { id: string; name: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock',       label: 'Stock' },
  { value: 'etf',         label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'crypto',      label: 'Crypto' },
  { value: 'bond',        label: 'Bond' },
  { value: 'other',       label: 'Other' },
]

const ASSET_COLORS: Record<AssetType, string> = {
  stock:       '#3D8EFF',
  etf:         '#00C9A7',
  mutual_fund: '#9B6DFF',
  crypto:      '#F59E0B',
  bond:        '#00D68F',
  other:       '#4E6080',
}

const SLICE_COLORS = [
  '#00C9A7', '#3D8EFF', '#FF4D72', '#F59E0B', '#9B6DFF',
  '#00D68F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F97316',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function marketValue(h: Holding): number {
  return h.shares * (h.current_price ?? 0)
}

function gainLoss(h: Holding): number | null {
  if (h.cost_basis == null || h.current_price == null) return null
  return h.shares * h.current_price - h.cost_basis
}

function gainLossPct(h: Holding): number | null {
  if (h.cost_basis == null || h.cost_basis === 0 || h.current_price == null) return null
  return ((h.shares * h.current_price - h.cost_basis) / h.cost_basis) * 100
}

// ─── Holding Form ─────────────────────────────────────────────────────────────

interface HoldingFormProps {
  accounts: Account[]
  initial?: Holding
  onClose: () => void
  onSaved: () => void
}

function HoldingForm({ accounts, initial, onClose, onSaved }: HoldingFormProps) {
  const isEdit = !!initial
  const [accountId, setAccountId]   = useState(initial?.account_id ?? accounts[0]?.id ?? '')
  const [ticker, setTicker]         = useState(initial?.ticker ?? '')
  const [name, setName]             = useState(initial?.name ?? '')
  const [shares, setShares]         = useState(initial ? String(initial.shares) : '')
  const [costBasis, setCostBasis]   = useState(initial?.cost_basis != null ? String(initial.cost_basis) : '')
  const [currentPrice, setCurrentPrice] = useState(initial?.current_price != null ? String(initial.current_price) : '')
  const [assetType, setAssetType]   = useState<AssetType>(initial?.asset_type ?? 'stock')
  const [error, setError]           = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  async function handleSave() {
    if (!ticker.trim()) { setError('Ticker is required'); return }
    const sharesN = parseFloat(shares)
    if (isNaN(sharesN) || sharesN <= 0) { setError('Enter a valid number of shares'); return }
    setSaving(true)
    const cb = costBasis ? parseFloat(costBasis) : null
    const cp = currentPrice ? parseFloat(currentPrice) : null
    if (isEdit) {
      await window.db.run(
        `UPDATE investment_holdings SET account_id=?,ticker=?,name=?,shares=?,cost_basis=?,current_price=?,asset_type=?,updated_at=? WHERE id=?`,
        [accountId, ticker.trim().toUpperCase(), name.trim() || null, sharesN, cb, cp, assetType, Date.now(), initial!.id]
      )
    } else {
      await window.db.run(
        `INSERT INTO investment_holdings (id,account_id,ticker,name,shares,cost_basis,current_price,asset_type,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), accountId, ticker.trim().toUpperCase(), name.trim() || null, sharesN, cb, cp, assetType, Date.now()]
      )
    }
    setSaving(false)
    onSaved()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 6,
    background: 'var(--surface-3)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(7,11,18,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, width: 480, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit Holding' : 'Add Holding'}</div>
          <button onClick={onClose} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
        </div>

        {/* Asset type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Asset Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASSET_TYPES.map(t => (
              <button key={t.value} onClick={() => setAssetType(t.value)} style={{
                padding: '5px 12px', borderRadius: 5, fontSize: 11.5, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', border: '1px solid',
                borderColor: assetType === t.value ? ASSET_COLORS[t.value] : 'var(--border)',
                background: assetType === t.value ? `${ASSET_COLORS[t.value]}18` : 'var(--surface-3)',
                color: assetType === t.value ? ASSET_COLORS[t.value] : 'var(--text-muted)',
                fontWeight: assetType === t.value ? 600 : 400,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Ticker</label>
            <input style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600 }} value={ticker} onChange={e => setTicker(e.target.value)} placeholder="AAPL" />
          </div>
          <div>
            <label style={labelStyle}>Name (optional)</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Apple Inc." />
          </div>
          <div>
            <label style={labelStyle}>Shares</label>
            <input style={inputStyle} type="number" min="0" step="any" value={shares} onChange={e => setShares(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>Current Price</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>Total Cost Basis</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={costBasis} onChange={e => setCostBasis(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>Account</label>
            <select style={{ ...inputStyle }} value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Value preview */}
        {shares && currentPrice && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Market value: </span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatCurrency(parseFloat(shares) * parseFloat(currentPrice))}</span>
            {costBasis && (
              <>
                <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>·</span>
                <span style={{ color: 'var(--text-muted)' }}>G/L: </span>
                {(() => {
                  const gl = parseFloat(shares) * parseFloat(currentPrice) - parseFloat(costBasis)
                  return <span style={{ color: gl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{gl >= 0 ? '+' : ''}{formatCurrency(gl)}</span>
                })()}
              </>
            )}
          </div>
        )}

        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Holding'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Investments() {
  const [holdings, setHoldings]   = useState<Holding[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [showAdd, setShowAdd]     = useState(false)
  const [editItem, setEditItem]   = useState<Holding | null>(null)
  const [sortBy, setSortBy]       = useState<'value' | 'gl' | 'ticker'>('value')

  const load = useCallback(async () => {
    const [hRes, aRes] = await Promise.all([
      window.db.query('SELECT * FROM investment_holdings ORDER BY ticker ASC'),
      window.db.query('SELECT id, name FROM accounts WHERE is_hidden = 0 ORDER BY name'),
    ])
    if (hRes.data) setHoldings(hRes.data as Holding[])
    if (aRes.data) setAccounts(aRes.data as Account[])
  }, [])

  useEffect(() => { load() }, [load])

  const deleteHolding = useCallback(async (id: string) => {
    await window.db.run('DELETE FROM investment_holdings WHERE id=?', [id])
    load()
  }, [load])

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalValue    = holdings.reduce((s, h) => s + marketValue(h), 0)
  const totalCost     = holdings.reduce((s, h) => s + (h.cost_basis ?? 0), 0)
  const totalGL       = totalCost > 0 ? totalValue - totalCost : null
  const totalGLPct    = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null

  // Allocation by asset type
  const byType = Object.entries(
    holdings.reduce<Record<string, number>>((acc, h) => {
      const key = h.asset_type ?? 'other'
      acc[key] = (acc[key] ?? 0) + marketValue(h)
      return acc
    }, {})
  ).map(([type, value]) => ({ type: type as AssetType, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  // Sorted holdings
  const sorted = [...holdings].sort((a, b) => {
    if (sortBy === 'value')  return marketValue(b) - marketValue(a)
    if (sortBy === 'gl')     return (gainLoss(b) ?? 0) - (gainLoss(a) ?? 0)
    return a.ticker.localeCompare(b.ticker)
  })

  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]))

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Investments</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Portfolio</h1>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 0 20px rgba(0,201,167,0.2)' }}>
          + Add Holding
        </button>
      </div>

      {holdings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 14 }}>No holdings yet.</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Add stocks, ETFs, crypto, or other positions to track your portfolio.</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Portfolio Value', value: formatCurrency(totalValue), color: 'var(--accent)' },
              { label: 'Total Cost',      value: formatCurrency(totalCost),  color: 'var(--text-muted)' },
              {
                label: 'Total Gain / Loss',
                value: totalGL != null ? `${totalGL >= 0 ? '+' : ''}${formatCurrency(totalGL)}` : '—',
                color: totalGL == null ? 'var(--text-muted)' : totalGL >= 0 ? 'var(--green)' : 'var(--red)',
              },
              {
                label: 'Return',
                value: totalGLPct != null ? `${totalGLPct >= 0 ? '+' : ''}${totalGLPct.toFixed(2)}%` : '—',
                color: totalGLPct == null ? 'var(--text-muted)' : totalGLPct >= 0 ? 'var(--green)' : 'var(--red)',
              },
            ].map(s => (
              <div key={s.label} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Allocation chart + breakdown */}
          {byType.length > 1 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="type" cx="50%" cy="50%" innerRadius={34} outerRadius={54} strokeWidth={0} paddingAngle={2}>
                      {byType.map((entry, i) => (
                        <Cell key={entry.type} fill={ASSET_COLORS[entry.type] ?? SLICE_COLORS[i % SLICE_COLORS.length]} fillOpacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      formatter={(v) => [formatCurrency(Number(v))]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byType.map((entry, i) => (
                  <div key={entry.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: ASSET_COLORS[entry.type] ?? SLICE_COLORS[i % SLICE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{ASSET_TYPES.find(t => t.value === entry.type)?.label ?? entry.type}</span>
                      </div>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(entry.value)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>{entry.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 2, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${entry.pct}%`, background: ASSET_COLORS[entry.type] ?? SLICE_COLORS[i % SLICE_COLORS.length], borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Holdings table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 110px 120px 100px 80px', padding: '9px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              {[
                { label: 'Ticker', key: 'ticker' as const },
                { label: 'Name / Account', key: null },
                { label: 'Shares', key: null },
                { label: 'Price', key: null },
                { label: 'Value', key: 'value' as const },
                { label: 'Gain / Loss', key: 'gl' as const },
                { label: '', key: null },
              ].map(({ label, key }, i) => (
                <div key={i} onClick={key ? () => setSortBy(key) : undefined} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: sortBy === key ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: key ? 'pointer' : 'default',
                  textAlign: i >= 2 ? 'right' : 'left',
                }}>{label}{sortBy === key ? ' ↓' : ''}</div>
              ))}
            </div>

            {sorted.map((h, i) => {
              const value = marketValue(h)
              const gl = gainLoss(h)
              const glPct = gainLossPct(h)
              const color = ASSET_COLORS[h.asset_type ?? 'other']
              const acc = accMap[h.account_id]
              const allocationPct = totalValue > 0 ? (value / totalValue) * 100 : 0

              return (
                <div key={h.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 110px 120px 100px 80px', padding: '11px 16px', alignItems: 'center' }}>
                    {/* Ticker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 28, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{h.ticker}</div>
                        {h.asset_type && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ASSET_TYPES.find(t => t.value === h.asset_type)?.label}</div>}
                      </div>
                    </div>
                    {/* Name / account */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name ?? '—'}</div>
                      {acc && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{acc.name}</div>}
                    </div>
                    {/* Shares */}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {h.shares % 1 === 0 ? h.shares.toLocaleString() : h.shares.toFixed(4)}
                    </div>
                    {/* Price */}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {h.current_price != null ? formatCurrency(h.current_price) : '—'}
                    </div>
                    {/* Value + allocation bar */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value > 0 ? formatCurrency(value) : '—'}</div>
                      {value > 0 && (
                        <div style={{ height: 2, background: 'var(--surface-3)', borderRadius: 2, marginTop: 3 }}>
                          <div style={{ height: '100%', width: `${allocationPct}%`, background: color, borderRadius: 2, opacity: 0.6 }} />
                        </div>
                      )}
                    </div>
                    {/* Gain / loss */}
                    <div style={{ textAlign: 'right' }}>
                      {gl != null ? (
                        <>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: gl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {gl >= 0 ? '+' : ''}{formatCurrency(gl)}
                          </div>
                          {glPct != null && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: gl >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.7 }}>
                              {glPct >= 0 ? '+' : ''}{glPct.toFixed(2)}%
                            </div>
                          )}
                        </>
                      ) : <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>—</div>}
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditItem(h)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-3)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
                      <button onClick={() => deleteHolding(h.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,77,114,0.2)', background: 'rgba(255,77,114,0.06)', cursor: 'pointer', color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Footer totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 110px 120px 100px 80px', padding: '10px 16px', borderTop: '1px solid var(--border-2)', background: 'var(--surface-2)' }}>
              <div style={{ gridColumn: '1 / 5', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(totalValue)}</div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: totalGL != null && totalGL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {totalGL != null ? `${totalGL >= 0 ? '+' : ''}${formatCurrency(totalGL)}` : '—'}
              </div>
              <div />
            </div>
          </div>

          <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            Prices are manually entered. Update current price on each holding to refresh values.
          </div>
        </>
      )}

      {/* Modals */}
      {(showAdd || editItem) && (
        <HoldingForm
          accounts={accounts}
          initial={editItem ?? undefined}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          onSaved={() => { setShowAdd(false); setEditItem(null); load() }}
        />
      )}
    </div>
  )
}
