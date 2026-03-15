import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@renderer/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalType = 'savings' | 'emergency_fund' | 'debt_payoff' | 'purchase' | 'investment'

interface Goal {
  id: string
  name: string
  type: GoalType
  target_amount: number
  current_amount: number
  target_date: number | null
  account_id: string | null
  color: string | null
  is_completed: number
  created_at: number
}

interface Account { id: string; name: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_TYPES: { value: GoalType; label: string; icon: string; description: string }[] = [
  { value: 'savings',        label: 'Savings',        icon: '🏦', description: 'General savings target' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: '🛡️', description: '3–6 months of expenses' },
  { value: 'debt_payoff',    label: 'Debt Payoff',    icon: '💳', description: 'Pay down a balance' },
  { value: 'purchase',       label: 'Purchase',       icon: '🎯', description: 'Save for something specific' },
  { value: 'investment',     label: 'Investment',     icon: '📈', description: 'Build an investment position' },
]

const GOAL_COLORS = [
  '#00C9A7', '#3D8EFF', '#FF4D72', '#F59E0B', '#9B6DFF',
  '#00D68F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F97316',
]

const TYPE_META: Record<GoalType, { icon: string; color: string }> = {
  savings:        { icon: '🏦', color: '#00C9A7' },
  emergency_fund: { icon: '🛡️', color: '#3D8EFF' },
  debt_payoff:    { icon: '💳', color: '#FF4D72' },
  purchase:       { icon: '🎯', color: '#F59E0B' },
  investment:     { icon: '📈', color: '#9B6DFF' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(ts: number): number {
  return Math.ceil((ts - Date.now()) / 86400000)
}

function monthsUntil(ts: number): number {
  const now = new Date()
  const target = new Date(ts)
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
}

function requiredPerMonth(remaining: number, targetDate: number | null): number | null {
  if (!targetDate) return null
  const months = monthsUntil(targetDate)
  if (months <= 0) return null
  return remaining / months
}

// ─── Goal Form ────────────────────────────────────────────────────────────────

interface GoalFormProps {
  accounts: Account[]
  initial?: Goal
  onClose: () => void
  onSaved: () => void
}

function GoalForm({ accounts, initial, onClose, onSaved }: GoalFormProps) {
  const isEdit = !!initial
  const [name, setName]             = useState(initial?.name ?? '')
  const [type, setType]             = useState<GoalType>(initial?.type ?? 'savings')
  const [targetAmount, setTarget]   = useState(initial ? String(initial.target_amount) : '')
  const [currentAmount, setCurrent] = useState(initial ? String(initial.current_amount) : '0')
  const [targetDate, setTargetDate] = useState(
    initial?.target_date ? new Date(initial.target_date).toISOString().slice(0, 10) : ''
  )
  const [accountId, setAccountId]   = useState(initial?.account_id ?? '')
  const [color, setColor]           = useState(initial?.color ?? GOAL_COLORS[0])
  const [error, setError]           = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    const target = parseFloat(targetAmount)
    if (isNaN(target) || target <= 0) { setError('Enter a valid target amount'); return }
    const current = parseFloat(currentAmount) || 0
    setSaving(true)
    const dateTs = targetDate ? new Date(targetDate).getTime() : null
    if (isEdit) {
      await window.db.run(
        `UPDATE goals SET name=?,type=?,target_amount=?,current_amount=?,target_date=?,account_id=?,color=? WHERE id=?`,
        [name.trim(), type, target, current, dateTs, accountId || null, color, initial!.id]
      )
    } else {
      await window.db.run(
        `INSERT INTO goals (id,name,type,target_amount,current_amount,target_date,account_id,color,is_completed,created_at) VALUES (?,?,?,?,?,?,?,?,0,?)`,
        [crypto.randomUUID(), name.trim(), type, target, current, dateTs, accountId || null, color, Date.now()]
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, width: 500, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit Goal' : 'New Goal'}</div>
          <button onClick={onClose} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Goal Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {GOAL_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                padding: '8px 4px', borderRadius: 7, cursor: 'pointer', border: '1px solid',
                borderColor: type === t.value ? color : 'var(--border)',
                background: type === t.value ? `${color}18` : 'var(--surface-3)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: type === t.value ? color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund, New Car…" />
          </div>

          {/* Target amount */}
          <div>
            <label style={labelStyle}>Target Amount</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={targetAmount} onChange={e => setTarget(e.target.value)} placeholder="0.00" />
          </div>

          {/* Current amount */}
          <div>
            <label style={labelStyle}>Current Amount</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={currentAmount} onChange={e => setCurrent(e.target.value)} placeholder="0.00" />
          </div>

          {/* Target date */}
          <div>
            <label style={labelStyle}>Target Date (optional)</label>
            <input style={inputStyle} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>

          {/* Account */}
          <div>
            <label style={labelStyle}>Linked Account</label>
            <select style={{ ...inputStyle }} value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Color */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                  cursor: 'pointer', outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contribution Modal ───────────────────────────────────────────────────────

function ContributeModal({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const remaining = goal.target_amount - goal.current_amount

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  const presets = [
    Math.round(remaining * 0.1),
    Math.round(remaining * 0.25),
    Math.round(remaining * 0.5),
  ].filter(v => v > 0 && v < remaining)

  async function handleContribute() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)
    const newAmount = Math.min(goal.current_amount + amt, goal.target_amount)
    const isNowComplete = newAmount >= goal.target_amount ? 1 : 0
    await window.db.run(
      'UPDATE goals SET current_amount=?, is_completed=? WHERE id=?',
      [newAmount, isNowComplete, goal.id]
    )
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(7,11,18,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, width: 360, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Add to {goal.name}</div>
          <button onClick={onClose} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)} · {formatCurrency(remaining)} remaining
        </div>

        {presets.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {presets.map(p => (
              <button key={p} onClick={() => setAmount(String(p))} style={{
                padding: '5px 10px', borderRadius: 5, fontSize: 11.5, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--surface-3)',
                color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              }}>{formatCurrency(p)}</button>
            ))}
            <button onClick={() => setAmount(String(remaining))} style={{
              padding: '5px 10px', borderRadius: 5, fontSize: 11.5, cursor: 'pointer',
              border: '1px solid rgba(0,201,167,0.3)', background: 'var(--accent-glow)',
              color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            }}>Full {formatCurrency(remaining)}</button>
          </div>
        )}

        <input
          type="number" min="0" step="0.01" placeholder="0.00"
          value={amount} onChange={e => setAmount(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, outline: 'none', marginBottom: 14 }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={handleContribute} disabled={saving || !amount} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving || !amount ? 0.5 : 1 }}>
            Add Funds
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, accounts, onEdit, onContribute, onDelete, onToggleComplete }: {
  goal: Goal
  accounts: Account[]
  onEdit: () => void
  onContribute: () => void
  onDelete: () => void
  onToggleComplete: () => void
}) {
  const meta = TYPE_META[goal.type]
  const color = goal.color ?? meta.color
  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
  const remaining = goal.target_amount - goal.current_amount
  const isComplete = goal.is_completed === 1 || pct >= 100
  const acc = accounts.find(a => a.id === goal.account_id)

  const days = goal.target_date ? daysUntil(goal.target_date) : null
  const perMonth = goal.target_date && !isComplete ? requiredPerMonth(remaining, goal.target_date) : null

  let dateLabel = ''
  let dateColor = 'var(--text-muted)'
  if (goal.target_date) {
    if (days !== null && days < 0) { dateLabel = 'Overdue'; dateColor = 'var(--red)' }
    else if (days === 0) { dateLabel = 'Due today'; dateColor = 'var(--amber)' }
    else if (days !== null && days <= 30) { dateLabel = `${days}d left`; dateColor = 'var(--amber)' }
    else {
      dateLabel = new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isComplete ? `${color}40` : 'var(--border)'}`,
      borderRadius: 12, padding: '20px',
      boxShadow: isComplete ? `0 0 24px ${color}18` : 'none',
      opacity: isComplete && goal.is_completed ? 0.75 : 1,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Completed ribbon */}
      {isComplete && (
        <div style={{ position: 'absolute', top: 10, right: -18, background: color, color: '#000', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', padding: '3px 28px', transform: 'rotate(35deg)', opacity: 0.85 }}>DONE</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{goal.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${color}18`, color }}>{GOAL_TYPES.find(t => t.value === goal.type)?.label}</span>
            {acc && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{acc.name}</span>}
            {dateLabel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: dateColor }}>{dateLabel}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>
            {pct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.6s ease' }} />
      </div>

      {/* Amounts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: perMonth ? 10 : 14 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formatCurrency(goal.current_amount)}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>of {formatCurrency(goal.target_amount)}</span>
        </div>
        {!isComplete && remaining > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{formatCurrency(remaining)} to go</span>
        )}
      </div>

      {/* Monthly pace hint */}
      {perMonth && perMonth > 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, padding: '7px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {formatCurrency(perMonth)}/mo needed to hit your target
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        {!isComplete && (
          <button onClick={onContribute} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
            background: color, color: '#000', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600,
          }}>+ Add Funds</button>
        )}
        <button onClick={onToggleComplete} title={isComplete ? 'Mark incomplete' : 'Mark complete'} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${isComplete ? `${color}40` : 'var(--border)'}`, background: isComplete ? `${color}20` : 'var(--surface-3)', cursor: 'pointer', color: isComplete ? color : 'var(--text-dim)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
        <button onClick={onEdit} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-3)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
        <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid rgba(255,77,114,0.2)', background: 'rgba(255,77,114,0.06)', cursor: 'pointer', color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Goals() {
  const [goals, setGoals]       = useState<Goal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [showCompleted, setShowCompleted]   = useState(false)

  const load = useCallback(async () => {
    const [goalsRes, accRes] = await Promise.all([
      window.db.query('SELECT * FROM goals ORDER BY is_completed ASC, created_at DESC'),
      window.db.query('SELECT id, name FROM accounts WHERE is_hidden = 0 ORDER BY name'),
    ])
    if (goalsRes.data) setGoals(goalsRes.data as Goal[])
    if (accRes.data)   setAccounts(accRes.data as Account[])
  }, [])

  useEffect(() => { load() }, [load])

  const deleteGoal = useCallback(async (id: string) => {
    await window.db.run('DELETE FROM goals WHERE id=?', [id])
    load()
  }, [load])

  const toggleComplete = useCallback(async (goal: Goal) => {
    await window.db.run('UPDATE goals SET is_completed=? WHERE id=?', [goal.is_completed ? 0 : 1, goal.id])
    load()
  }, [load])

  const active    = goals.filter(g => !g.is_completed)
  const completed = goals.filter(g => g.is_completed)

  // Summary stats
  const totalTarget  = active.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved   = active.reduce((s, g) => s + g.current_amount, 0)
  const overallPct   = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Goals</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Savings Goals</h1>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 0 20px rgba(0,201,167,0.2)' }}>
          + New Goal
        </button>
      </div>

      {/* Summary bar */}
      {active.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Total Saved</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(totalSaved)}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Total Target</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{formatCurrency(totalTarget)}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Remaining</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>{formatCurrency(totalTarget - totalSaved)}</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{overallPct.toFixed(0)}%</div>
          </div>
          {/* Combined progress bar */}
          <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--accent)', borderRadius: 6, boxShadow: '0 0 8px rgba(0,201,167,0.5)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}

      {/* Active goals grid */}
      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 14 }}>No goals yet.</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Create a savings goal, emergency fund, or payoff target.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {active.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              accounts={accounts}
              onEdit={() => setEditGoal(goal)}
              onContribute={() => setContributeGoal(goal)}
              onDelete={() => deleteGoal(goal.id)}
              onToggleComplete={() => toggleComplete(goal)}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <button onClick={() => setShowCompleted(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            <span style={{ fontSize: 10, transform: showCompleted ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
            {completed.length} completed goal{completed.length !== 1 ? 's' : ''}
          </button>
          {showCompleted && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {completed.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  accounts={accounts}
                  onEdit={() => setEditGoal(goal)}
                  onContribute={() => setContributeGoal(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                  onToggleComplete={() => toggleComplete(goal)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showAdd || editGoal) && (
        <GoalForm
          accounts={accounts}
          initial={editGoal ?? undefined}
          onClose={() => { setShowAdd(false); setEditGoal(null) }}
          onSaved={() => { setShowAdd(false); setEditGoal(null); load() }}
        />
      )}
      {contributeGoal && (
        <ContributeModal
          goal={contributeGoal}
          onClose={() => setContributeGoal(null)}
          onSaved={() => { setContributeGoal(null); load() }}
        />
      )}
    </div>
  )
}
