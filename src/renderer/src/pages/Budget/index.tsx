import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatMonthLabel } from '@renderer/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetRow {
  id: string
  budget_amount: number
  period: string
  category_id: string
  category_name: string
  category_color: string | null
  spent: number
}

interface CategoryOption {
  id: string
  name: string
  color: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthBounds(offset: number): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  return [start.getTime(), end.getTime()]
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'var(--red)'
  if (pct >= 75) return 'var(--amber)'
  return 'var(--accent-2)'
}

// ─── Add Budget Modal ─────────────────────────────────────────────────────────

interface AddBudgetModalProps {
  categories: CategoryOption[]
  existingCategoryIds: Set<string>
  onClose: () => void
  onCreated: () => void
}

function AddBudgetModal({ categories, existingCategoryIds, onClose, onCreated }: AddBudgetModalProps) {
  const available = categories.filter(c => !existingCategoryIds.has(c.id))
  const [categoryId, setCategoryId] = useState(available[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!categoryId) { setError('Please select a category'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Please enter a valid amount'); return }
    setSaving(true)
    try {
      await window.db.run(
        "INSERT INTO budgets (id, category_id, amount, period, created_at) VALUES (?,?,?,'monthly',?)",
        [crypto.randomUUID(), categoryId, amt, Date.now()]
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
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>Add Budget</div>

        {available.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
            All categories already have a budget. Create new categories first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
                {available.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Monthly Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, paddingLeft: 22, fontFamily: 'var(--font-mono)' }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14 }}>Cancel</button>
          {available.length > 0 && (
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Adding…' : 'Add Budget'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

interface BudgetCardProps {
  budget: BudgetRow
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDelete: (id: string) => void
  onUpdate: (id: string, amount: number) => void
}

function BudgetCard({ budget, hovered, onMouseEnter, onMouseLeave, onDelete, onUpdate }: BudgetCardProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(budget.budget_amount))

  const pct = budget.budget_amount > 0 ? (budget.spent / budget.budget_amount) * 100 : 0
  const pctCapped = Math.min(pct, 100)
  const over = pct >= 100
  const remaining = budget.budget_amount - budget.spent
  const barColor = getBarColor(pct)
  const dotColor = budget.category_color ?? 'var(--accent)'

  function commitEdit() {
    const val = parseFloat(editValue)
    if (!isNaN(val) && val > 0 && val !== budget.budget_amount) {
      onUpdate(budget.id, val)
    }
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 10, position: 'relative', transition: 'border-color 0.15s', borderColor: hovered ? 'var(--border-2)' : 'var(--border)' }}
    >
      {/* Action buttons (hover) */}
      {hovered && !editing && (
        <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 4 }}>
          <button
            onClick={() => { setEditing(true); setEditValue(String(budget.budget_amount)) }}
            title="Edit"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-ui)' }}
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            title="Delete"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-ui)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Row 1: Category name + amounts */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{budget.category_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <span style={{ color: over ? 'var(--red)' : 'var(--text)', fontWeight: 600 }}>{formatCurrency(budget.spent)}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          {editing ? (
            <input
              autoFocus
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
              style={{ width: 80, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '2px 6px', outline: 'none', textAlign: 'right' }}
            />
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(budget.budget_amount)}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%',
          width: `${pctCapped}%`,
          borderRadius: 6,
          background: barColor,
          boxShadow: `0 0 8px ${barColor}80`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Row 3: percentage + remaining/over */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
        {over ? (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--red)', fontWeight: 600 }}>
            OVER {formatCurrency(Math.abs(remaining))}
          </span>
        ) : (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {formatCurrency(remaining)} left
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Budget() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [start, end] = monthBounds(monthOffset)
    try {
      const [budgetRes, catRes] = await Promise.all([
        window.db.query(
          `SELECT b.id, b.amount AS budget_amount, b.period,
                  c.id AS category_id, c.name AS category_name, c.color AS category_color,
                  COALESCE(SUM(CASE WHEN t.amount < 0 AND t.date >= ? AND t.date < ? AND COALESCE(t.is_transfer,0)=0 THEN ABS(t.amount) ELSE 0 END), 0) AS spent
           FROM budgets b
           JOIN categories c ON b.category_id = c.id
           LEFT JOIN transactions t ON t.category_id = b.category_id
           WHERE b.period = 'monthly'
           GROUP BY b.id
           ORDER BY c.name`,
          [start, end]
        ),
        window.db.query('SELECT id, name, color FROM categories ORDER BY name'),
      ])
      setBudgets((budgetRes.data ?? []) as BudgetRow[])
      setCategories((catRes.data ?? []) as CategoryOption[])
    } catch (_) {
      // ignore
    }
    setLoading(false)
  }, [monthOffset])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    await window.db.run('DELETE FROM budgets WHERE id=?', [id])
    fetchData()
  }

  async function handleUpdate(id: string, amount: number) {
    await window.db.run('UPDATE budgets SET amount=? WHERE id=?', [amount, id])
    fetchData()
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.budget_amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalRemaining = totalBudgeted - totalSpent

  const existingCategoryIds = new Set(budgets.map(b => b.category_id))

  // Build display month label
  const now = new Date()
  const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = formatMonthLabel(displayDate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}
            >
              ←
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 130, textAlign: 'center' }}>{monthLabel}</span>
            <button
              onClick={() => setMonthOffset(o => o + 1)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}
            >
              →
            </button>
          </div>

          {/* Add Budget button */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 0 16px rgba(0,201,167,0.2)' }}
          >
            + Add Budget
          </button>
        </div>

        {/* Stats row */}
        {budgets.length > 0 && (
          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { label: 'Total Budgeted', value: formatCurrency(totalBudgeted), color: 'var(--text)' },
              { label: 'Total Spent', value: formatCurrency(totalSpent), color: totalSpent > totalBudgeted ? 'var(--red)' : 'var(--text)' },
              { label: 'Remaining', value: formatCurrency(totalRemaining), color: totalRemaining < 0 ? 'var(--red)' : 'var(--green)' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 3 }}>{stat.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 88, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320, gap: 12 }}>
            <div style={{ fontSize: 40 }}>🗂️</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>No budgets yet</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340 }}>
              Set monthly spending targets to track where your money goes.
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ marginTop: 8, padding: '9px 22px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 600, boxShadow: '0 0 16px rgba(0,201,167,0.2)' }}
            >
              + Add your first budget
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 700 }}>
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                hovered={hoveredId === budget.id}
                onMouseEnter={() => setHoveredId(budget.id)}
                onMouseLeave={() => setHoveredId(null)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <AddBudgetModal
          categories={categories}
          existingCategoryIds={existingCategoryIds}
          onClose={() => setShowAddModal(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  )
}
