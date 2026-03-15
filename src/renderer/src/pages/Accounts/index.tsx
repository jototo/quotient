import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@renderer/utils/formatters'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountRow {
  id: string
  name: string
  type: string
  institution: string | null
  balance: number
  color: string | null
  is_hidden: number
  tx_count: number
  last_tx_date: number | null
}

interface RecentTx {
  date: number
  description: string
  amount: number
}

interface GroupedAsset {
  label: string
  value: number
  color: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ORDER = ['checking', 'savings', 'credit_card', 'investment', 'real_estate', 'vehicle', 'loan', 'other']

const TYPE_GROUP: Record<string, string> = {
  checking: 'Cash',
  savings: 'Cash',
  credit_card: 'Credit Cards',
  investment: 'Investments',
  real_estate: 'Real Estate',
  vehicle: 'Vehicles',
  loan: 'Loans',
  other: 'Other',
}

const TYPE_ICON: Record<string, string> = {
  Cash: '🏦',
  'Credit Cards': '💳',
  Investments: '📈',
  'Real Estate': '🏠',
  Vehicles: '🚗',
  Loans: '📋',
  Other: '📁',
}

const TYPE_GRADIENT: Record<string, string> = {
  checking: 'linear-gradient(135deg, #3D8EFF, #00C9A7)',
  savings: 'linear-gradient(135deg, #3D8EFF, #00C9A7)',
  credit_card: 'linear-gradient(135deg, #FF4D72, #F59E0B)',
  investment: 'linear-gradient(135deg, #9B6DFF, #3D8EFF)',
  real_estate: 'linear-gradient(135deg, #9B6DFF, #FF4D72)',
  vehicle: 'linear-gradient(135deg, #F59E0B, #FF4D72)',
  loan: 'linear-gradient(135deg, #FF4D72, #9B6DFF)',
  other: 'linear-gradient(135deg, #4E6080, #2E4060)',
}

const ASSET_TYPE_COLOR: Record<string, string> = {
  investment: '#3D8EFF',
  checking: '#00C9A7',
  savings: '#00C9A7',
  real_estate: '#9B6DFF',
  vehicle: '#F59E0B',
  other: '#4E6080',
}

const ASSET_TYPE_LABEL: Record<string, string> = {
  investment: 'Investments',
  checking: 'Cash',
  savings: 'Cash',
  real_estate: 'Real Estate',
  vehicle: 'Vehicles',
  other: 'Other',
}

const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'investment', 'real_estate', 'vehicle', 'loan', 'other']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function groupAccountsForAllocation(accounts: AccountRow[]): GroupedAsset[] {
  const map = new Map<string, GroupedAsset>()
  for (const acc of accounts) {
    if (['credit_card', 'loan'].includes(acc.type)) continue
    const label = ASSET_TYPE_LABEL[acc.type] ?? 'Other'
    const color = ASSET_TYPE_COLOR[acc.type] ?? '#4E6080'
    const existing = map.get(label)
    if (existing) existing.value += acc.balance
    else map.set(label, { label, value: acc.balance, color })
  }
  return Array.from(map.values()).filter(g => g.value > 0).sort((a, b) => b.value - a.value)
}

function groupAccountsByType(accounts: AccountRow[]): { groupLabel: string; groupTotal: number; items: AccountRow[] }[] {
  // Deduplicate group labels, preserving order
  const seen = new Set<string>()
  const groups: { groupLabel: string; groupTotal: number; items: AccountRow[] }[] = []

  for (const type of TYPE_ORDER) {
    const label = TYPE_GROUP[type] ?? 'Other'
    if (seen.has(label)) continue
    // Collect all types that map to this label
    const typesForLabel = TYPE_ORDER.filter(t => TYPE_GROUP[t] === label)
    const items = accounts.filter(a => typesForLabel.includes(a.type))
    if (items.length === 0) continue
    seen.add(label)
    const groupTotal = items.reduce((s, a) => s + a.balance, 0)
    groups.push({ groupLabel: label, groupTotal, items })
  }
  return groups
}

// ─── Add Account Modal ────────────────────────────────────────────────────────

interface AddAccountModalProps {
  onClose: () => void
  onCreated: () => void
}

function AddAccountModal({ onClose, onCreated }: AddAccountModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [institution, setInstitution] = useState('')
  const [balance, setBalance] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return }
    const bal = parseFloat(balance)
    if (isNaN(bal)) { setError('Balance must be a number'); return }
    setSaving(true)
    try {
      await window.db.run(
        "INSERT INTO accounts (id, name, type, institution, balance, currency, is_hidden, created_at, updated_at) VALUES (?,?,?,?,?,'USD',0,?,?)",
        [crypto.randomUUID(), name.trim(), type, institution.trim() || null, bal, Date.now(), Date.now()]
      )
      onCreated()
      onClose()
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border-2)', background: 'var(--surface-2)',
    color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13,
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>Add Account</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Account Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chase Checking" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {ACCOUNT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_GROUP[t]} ({t.replace('_', ' ')})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Institution</label>
            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Chase, Fidelity" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Initial Balance</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>$</span>
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 22 }}
              />
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14 }}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Account Panel ───────────────────────────────────────────────────────

interface EditAccountPanelProps {
  account: AccountRow
  onClose: () => void
  onSaved: () => void
}

function EditAccountPanel({ account, onClose, onSaved }: EditAccountPanelProps) {
  const [name, setName] = useState(account.name)
  const [type, setType] = useState(account.type)
  const [institution, setInstitution] = useState(account.institution ?? '')
  const [balance, setBalance] = useState(String(account.balance))
  const [saving, setSaving] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([])

  useEffect(() => {
    window.db.query(
      'SELECT date, description, amount FROM transactions WHERE account_id = ? ORDER BY date DESC LIMIT 5',
      [account.id]
    ).then(r => {
      setRecentTxs((r.data ?? []) as RecentTx[])
    }).catch(() => {})
  }, [account.id])

  async function handleSave() {
    const bal = parseFloat(balance)
    if (isNaN(bal)) return
    setSaving(true)
    await window.db.run(
      'UPDATE accounts SET name=?, type=?, institution=?, balance=?, updated_at=? WHERE id=?',
      [name.trim(), type, institution.trim() || null, bal, Date.now(), account.id]
    )
    onSaved()
  }

  async function handleDelete() {
    if (deleteStep === 'idle') { setDeleteStep('confirm'); return }
    // Delete transactions first, then account
    await window.db.run('DELETE FROM transactions WHERE account_id = ?', [account.id])
    await window.db.run('DELETE FROM accounts WHERE id = ?', [account.id])
    onSaved()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 11px', borderRadius: 6,
    border: '1px solid var(--border-2)', background: 'var(--surface-2)',
    color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13,
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border-2)', zIndex: 10, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Accounts
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: TYPE_GRADIENT[account.type] ?? TYPE_GRADIENT.other, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--bg)', flexShrink: 0 }}>
            {getInitials(account.name)}
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 600, background: 'transparent', border: '1px solid transparent', padding: '4px 6px', flex: 1 }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {ACCOUNT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_GROUP[t]} ({t.replace('_', ' ')})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Institution</label>
            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Chase" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Current Balance</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>$</span>
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', paddingLeft: 22 }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Recent Transactions */}
        {recentTxs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 10 }}>Recent Transactions</div>
            {recentTxs.map((tx, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: tx.amount >= 0 ? 'var(--green)' : 'var(--text)' }}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Danger Zone */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--red)', marginBottom: 10, opacity: 0.7 }}>Danger Zone</div>
          {deleteStep === 'confirm' && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, lineHeight: 1.5 }}>
              This will delete the account and all its transactions. This cannot be undone.
            </div>
          )}
          <button
            onClick={handleDelete}
            style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: '1px solid var(--red)', background: deleteStep === 'confirm' ? 'var(--red)' : 'transparent', color: deleteStep === 'confirm' ? 'white' : 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}
          >
            {deleteStep === 'confirm' ? 'Confirm Delete' : 'Delete Account'}
          </button>
          {deleteStep === 'confirm' && (
            <button onClick={() => setDeleteStep('idle')} style={{ width: '100%', marginTop: 6, padding: '8px 0', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  )
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

interface SummaryPanelProps {
  accounts: AccountRow[]
  assets: number
  liabilities: number
  editingAccount: AccountRow | null
  onCloseEdit: () => void
  onRefetch: () => void
}

function SummaryPanel({ accounts, assets, liabilities, editingAccount, onCloseEdit, onRefetch }: SummaryPanelProps) {
  const groups = groupAccountsForAllocation(accounts)
  const total = groups.reduce((s, g) => s + g.value, 0)

  // Liability groups
  const liabilityMap = new Map<string, { label: string; value: number; color: string }>()
  for (const acc of accounts) {
    if (!['credit_card', 'loan'].includes(acc.type)) continue
    const label = TYPE_GROUP[acc.type] ?? 'Other'
    const existing = liabilityMap.get(label)
    if (existing) existing.value += Math.abs(acc.balance)
    else liabilityMap.set(label, { label, value: Math.abs(acc.balance), color: acc.type === 'credit_card' ? '#FF4D72' : '#9B6DFF' })
  }
  const liabilityGroups = Array.from(liabilityMap.values())

  return (
    <div style={{ position: 'relative', borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Scrollable content */}
      <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 12 }}>Summary</div>

        {/* Allocation bar */}
        <div style={{ height: 6, borderRadius: 6, display: 'flex', overflow: 'hidden', gap: 2, marginBottom: 14 }}>
          {groups.map(g => (
            <div key={g.label} style={{
              height: '100%', borderRadius: 6,
              width: `${total > 0 ? (g.value / total) * 100 : 0}%`,
              background: g.color,
              boxShadow: `0 0 8px ${g.color}80`,
              transition: 'width 0.6s ease',
            }} />
          ))}
        </div>

        {/* Assets section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assets</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--green)' }}>{formatCurrency(assets)}</span>
        </div>
        {groups.map(g => (
          <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: g.color, boxShadow: `0 0 5px ${g.color}`, flexShrink: 0 }} />
              {g.label}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{formatCurrency(g.value)}</div>
          </div>
        ))}

        {liabilities > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Liabilities</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>{formatCurrency(liabilities)}</span>
            </div>
            {liabilityGroups.map(g => (
              <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                  {g.label}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{formatCurrency(g.value)}</div>
              </div>
            ))}
          </>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ color: 'var(--text)', fontSize: 12.5, fontWeight: 600 }}>Net Worth</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{formatCurrency(assets - liabilities)}</span>
        </div>
      </div>

      {/* Edit panel overlay */}
      {editingAccount && (
        <EditAccountPanel
          account={editingAccount}
          onClose={onCloseEdit}
          onSaved={() => { onRefetch(); onCloseEdit() }}
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [netWorthDelta, setNetWorthDelta] = useState<{ amount: number; pct: number } | null>(null)
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, histRes] = await Promise.all([
        window.db.query(
          `SELECT a.id, a.name, a.type, a.institution, a.balance, a.color, a.is_hidden,
                  COUNT(t.id) AS tx_count,
                  MAX(t.date) AS last_tx_date
           FROM accounts a
           LEFT JOIN transactions t ON t.account_id = a.id
           WHERE a.is_hidden = 0
           GROUP BY a.id
           ORDER BY a.type, a.balance DESC`
        ),
        window.db.query('SELECT net_worth FROM net_worth_history ORDER BY date DESC LIMIT 2'),
      ])

      const rows = (accRes.data ?? []) as AccountRow[]
      setAccounts(rows)

      // Compute delta vs last net_worth_history entry
      const hist = (histRes.data ?? []) as { net_worth: number }[]
      if (hist.length >= 2) {
        const current = hist[0].net_worth
        const prev = hist[1].net_worth
        if (prev !== 0) {
          setNetWorthDelta({ amount: current - prev, pct: ((current - prev) / Math.abs(prev)) * 100 })
        }
      }
    } catch (_) {
      // ignore
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // Recalculate when editing account changes (in case it was updated)
  useEffect(() => {
    if (editingAccount) {
      const fresh = accounts.find(a => a.id === editingAccount.id)
      if (fresh) setEditingAccount(fresh)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  const assets = accounts
    .filter(a => !['credit_card', 'loan'].includes(a.type))
    .reduce((s, a) => s + (a.balance ?? 0), 0)
  const liabilities = accounts
    .filter(a => ['credit_card', 'loan'].includes(a.type))
    .reduce((s, a) => s + Math.abs(a.balance ?? 0), 0)
  const netWorth = assets - liabilities

  const groups = groupAccountsByType(accounts)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 2 }}>Net Worth</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {loading ? '—' : formatCurrency(netWorth)}
            </div>
            {netWorthDelta && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: netWorthDelta.amount >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {netWorthDelta.amount >= 0 ? '+' : ''}{formatCurrency(netWorthDelta.amount)} ({netWorthDelta.amount >= 0 ? '+' : ''}{netWorthDelta.pct.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 0 16px rgba(0,201,167,0.2)' }}
        >
          + Add Account
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>
        {/* Account List */}
        <div style={{ overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 64, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32 }}>🏦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>No accounts yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add an account to get started.</div>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>+ Add Account</button>
            </div>
          ) : (
            groups.map(({ groupLabel, groupTotal, items }) => (
              <div key={groupLabel}>
                {/* Group header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', background: 'var(--bg)' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{TYPE_ICON[groupLabel] ?? '📁'}</span>
                    {groupLabel}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}>{formatCurrency(groupTotal)}</span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '0 24px' }} />

                {/* Account rows */}
                {items.map(account => (
                  <div
                    key={account.id}
                    onClick={() => setEditingAccount(account)}
                    onMouseEnter={() => setHoveredRow(account.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 0, padding: '14px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: hoveredRow === account.id ? 'var(--surface-2)' : 'transparent', transition: 'background 0.12s' }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: TYPE_GRADIENT[account.type] ?? TYPE_GRADIENT.other, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--bg)', flexShrink: 0, alignSelf: 'center' }}>
                      {getInitials(account.name)}
                    </div>

                    {/* Name & info */}
                    <div style={{ paddingLeft: 12, alignSelf: 'center', minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                        {TYPE_GROUP[account.type] ?? account.type}{account.institution ? ` · ${account.institution}` : ''}
                      </div>
                    </div>

                    {/* Balance & tx count */}
                    <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: ['credit_card', 'loan'].includes(account.type) ? 'var(--red)' : 'var(--text)' }}>
                        {formatCurrency(account.balance)}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                        {account.tx_count} transaction{account.tx_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Summary Panel */}
        <SummaryPanel
          accounts={accounts}
          assets={assets}
          liabilities={liabilities}
          editingAccount={editingAccount}
          onCloseEdit={() => setEditingAccount(null)}
          onRefetch={fetchAccounts}
        />
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onCreated={fetchAccounts}
        />
      )}
    </div>
  )
}
