import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@renderer/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = 'bill' | 'subscription' | 'income'
type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
type FilterTab = 'all' | ItemType

interface RecurringItem {
  id: string
  name: string
  amount: number
  frequency: Frequency
  next_due_date: number | null
  category_id: string | null
  account_id: string | null
  type: ItemType
  is_active: number
  icon: string | null
  last_paid_date: number | null
}

interface Account { id: string; name: string }
interface Category { id: string; name: string; color: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: '/wk', biweekly: '/2wk', monthly: '/mo', quarterly: '/qtr', yearly: '/yr'
}

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'bill', label: 'Bill' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'income', label: 'Income' },
]

const TYPE_META: Record<ItemType, { label: string; color: string; defaultIcon: string }> = {
  bill:         { label: 'Bill',         color: 'var(--accent-2)',  defaultIcon: '🧾' },
  subscription: { label: 'Subscription', color: 'var(--accent)',    defaultIcon: '📱' },
  income:       { label: 'Income',       color: 'var(--green)',     defaultIcon: '💰' },
}

function toMonthly(amount: number, freq: Frequency): number {
  switch (freq) {
    case 'weekly':    return amount * 52 / 12
    case 'biweekly':  return amount * 26 / 12
    case 'monthly':   return amount
    case 'quarterly': return amount / 3
    case 'yearly':    return amount / 12
  }
}

const FREQ_ADVANCE_MS: Record<Frequency, number> = {
  weekly:    7  * 86400000,
  biweekly:  14 * 86400000,
  monthly:   30 * 86400000,  // approximate; bumped from current next_due or today
  quarterly: 91 * 86400000,
  yearly:    365 * 86400000,
}

function advanceDueDate(current: number | null, freq: Frequency): number {
  const base = current && current > Date.now() ? current : Date.now()
  if (freq === 'monthly') {
    const d = new Date(base)
    return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()).getTime()
  }
  if (freq === 'quarterly') {
    const d = new Date(base)
    return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate()).getTime()
  }
  if (freq === 'yearly') {
    const d = new Date(base)
    return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()).getTime()
  }
  return base + FREQ_ADVANCE_MS[freq]
}

function dueLabel(ts: number | null): { text: string; color: string } {
  if (!ts) return { text: '—', color: 'var(--text-dim)' }
  const now = Date.now()
  const days = Math.round((ts - now) / 86400000)
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, color: 'var(--red)' }
  if (days === 0) return { text: 'Due today',                  color: 'var(--amber)' }
  if (days <= 7)  return { text: `in ${days}d`,                color: 'var(--amber)' }
  if (days <= 30) return { text: `in ${days}d`,                color: 'var(--text-muted)' }
  const d = new Date(ts)
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'var(--text-muted)' }
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ItemFormProps {
  accounts: Account[]
  categories: Category[]
  initial?: RecurringItem
  onClose: () => void
  onSaved: () => void
}

function ItemForm({ accounts, categories, initial, onClose, onSaved }: ItemFormProps) {
  const isEdit = !!initial
  const [name, setName]               = useState(initial?.name ?? '')
  const [amount, setAmount]           = useState(initial ? String(Math.abs(initial.amount)) : '')
  const [type, setType]               = useState<ItemType>(initial?.type ?? 'bill')
  const [frequency, setFrequency]     = useState<Frequency>(initial?.frequency ?? 'monthly')
  const [nextDue, setNextDue]         = useState(
    initial?.next_due_date ? new Date(initial.next_due_date).toISOString().slice(0, 10) : ''
  )
  const [categoryId, setCategoryId]   = useState(initial?.category_id ?? '')
  const [accountId, setAccountId]     = useState(initial?.account_id ?? '')
  const [icon, setIcon]               = useState(initial?.icon ?? '')
  const [error, setError]             = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    const storedAmount = type === 'income' ? amt : -amt
    const dueTs = nextDue ? new Date(nextDue).getTime() : null
    const iconVal = icon.trim() || TYPE_META[type].defaultIcon
    if (isEdit) {
      await window.db.run(
        `UPDATE recurring_items SET name=?,amount=?,type=?,frequency=?,next_due_date=?,category_id=?,account_id=?,icon=? WHERE id=?`,
        [name.trim(), storedAmount, type, frequency, dueTs, categoryId || null, accountId || null, iconVal, initial!.id]
      )
    } else {
      await window.db.run(
        `INSERT INTO recurring_items (id,name,amount,type,frequency,next_due_date,category_id,account_id,icon,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
        [crypto.randomUUID(), name.trim(), storedAmount, type, frequency, dueTs, categoryId || null, accountId || null, iconVal, Date.now()]
      )
    }
    setSaving(false)
    onSaved()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 6,
    background: 'var(--surface-3)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13,
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(7,11,18,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-2)',
        borderRadius: 12, width: 480, padding: 24,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit Item' : 'Add Recurring Item'}</div>
          <button onClick={onClose} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix, Rent, Salary…" />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setType(opt.value)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 11.5,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer', border: '1px solid',
                  fontWeight: type === opt.value ? 600 : 400,
                  borderColor: type === opt.value ? TYPE_META[opt.value].color : 'var(--border)',
                  background: type === opt.value ? `${TYPE_META[opt.value].color}18` : 'var(--surface-3)',
                  color: type === opt.value ? TYPE_META[opt.value].color : 'var(--text-muted)',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <select style={{ ...inputStyle }} value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          {/* Next due date */}
          <div>
            <label style={labelStyle}>Next Due Date</label>
            <input style={inputStyle} type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} />
          </div>

          {/* Icon */}
          <div>
            <label style={labelStyle}>Icon (emoji)</label>
            <input style={inputStyle} value={icon} onChange={e => setIcon(e.target.value)} placeholder={TYPE_META[type].defaultIcon} maxLength={4} />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select style={{ ...inputStyle }} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Account */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Account</label>
            <select style={{ ...inputStyle }} value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface RecentTx { id: string; description: string; amount: number; date: number }

function matchRecurring(itemName: string, txDesc: string): boolean {
  const keywords = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const desc = txDesc.toLowerCase()
  return keywords.length > 0 && keywords.some(w => desc.includes(w))
}

export default function Recurring() {
  const [items, setItems]         = useState<RecurringItem[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([])
  const [tab, setTab]             = useState<FilterTab>('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [editItem, setEditItem]   = useState<RecurringItem | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
    const [itemsRes, accRes, catRes, txRes] = await Promise.all([
      window.db.query('SELECT * FROM recurring_items ORDER BY is_active DESC, next_due_date ASC'),
      window.db.query('SELECT id, name FROM accounts WHERE is_hidden = 0 ORDER BY name'),
      window.db.query('SELECT id, name, color FROM categories ORDER BY name'),
      window.db.query(
        'SELECT id, description, amount, date FROM transactions WHERE date >= ? AND date < ? AND COALESCE(is_transfer,0)=0 ORDER BY date DESC',
        [monthStart, monthEnd]
      ),
    ])
    if (itemsRes.data) setItems(itemsRes.data as RecurringItem[])
    if (accRes.data)   setAccounts(accRes.data as Account[])
    if (catRes.data)   setCategories(catRes.data as Category[])
    if (txRes.data)    setRecentTxs(txRes.data as RecentTx[])
  }, [])

  useEffect(() => { load() }, [load])

  const toggleActive = useCallback(async (item: RecurringItem) => {
    await window.db.run('UPDATE recurring_items SET is_active=? WHERE id=?', [item.is_active ? 0 : 1, item.id])
    load()
  }, [load])

  const markPaid = useCallback(async (item: RecurringItem) => {
    const nextDue = advanceDueDate(item.next_due_date, item.frequency)
    await window.db.run(
      'UPDATE recurring_items SET last_paid_date=?, next_due_date=? WHERE id=?',
      [Date.now(), nextDue, item.id]
    )
    load()
  }, [load])

  const deleteItem = useCallback(async (id: string) => {
    await window.db.run('DELETE FROM recurring_items WHERE id=?', [id])
    load()
  }, [load])

  // ── Derived stats ────────────────────────────────────────────────────────
  const active = items.filter(i => i.is_active)
  const bills  = active.filter(i => i.type === 'bill')
  const subs   = active.filter(i => i.type === 'subscription')
  const income = active.filter(i => i.type === 'income')

  const monthlyBills = bills.reduce((s, i)  => s + toMonthly(Math.abs(i.amount), i.frequency), 0)
  const monthlySubs  = subs.reduce((s, i)   => s + toMonthly(Math.abs(i.amount), i.frequency), 0)
  const monthlyIncome = income.reduce((s, i) => s + toMonthly(Math.abs(i.amount), i.frequency), 0)
  const monthlyNet   = monthlyIncome - monthlyBills - monthlySubs

  // ── Filtered list ────────────────────────────────────────────────────────
  const displayed = items.filter(i => {
    if (!showInactive && !i.is_active) return false
    if (tab !== 'all' && i.type !== tab) return false
    return true
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]))

  const TABS: { value: FilterTab; label: string }[] = [
    { value: 'all',          label: 'All' },
    { value: 'bill',         label: 'Bills' },
    { value: 'subscription', label: 'Subscriptions' },
    { value: 'income',       label: 'Income' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Recurring</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Bills & Subscriptions</h1>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
          boxShadow: '0 0 20px rgba(0,201,167,0.2)',
        }}>+ Add Item</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Monthly Bills',  value: -monthlyBills,  color: 'var(--accent-2)' },
          { label: 'Subscriptions',  value: -monthlySubs,   color: 'var(--accent)' },
          { label: 'Recurring Income', value: monthlyIncome, color: 'var(--green)' },
          { label: 'Net Monthly',    value: monthlyNet,     color: monthlyNet >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: s.color }}>
              {s.value >= 0 ? '+' : ''}{formatCurrency(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', border: '1px solid',
              fontWeight: tab === t.value ? 600 : 400,
              borderColor: tab === t.value ? 'var(--accent)' : 'var(--border)',
              background:  tab === t.value ? 'var(--accent-glow)' : 'transparent',
              color:       tab === t.value ? 'var(--accent)' : 'var(--text-muted)',
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setShowInactive(v => !v)} style={{
          fontSize: 11.5, fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: '5px 10px',
          borderRadius: 5, border: '1px solid var(--border)', background: 'transparent',
          color: showInactive ? 'var(--text)' : 'var(--text-dim)',
        }}>
          {showInactive ? 'Hide' : 'Show'} inactive
        </button>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
          <div style={{ fontSize: 14 }}>No recurring items yet.</div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>Add bills, subscriptions, and income sources above.</div>
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {displayed.map((item, i) => {
            const due  = dueLabel(item.next_due_date)
            const meta = TYPE_META[item.type]
            const cat  = item.category_id ? catMap[item.category_id] : null
            const acc  = item.account_id  ? accMap[item.account_id]  : null
            const monthlyAmt = toMonthly(Math.abs(item.amount), item.frequency)
            const isIncome = item.type === 'income'
            const matchedTx = recentTxs.find(tx => matchRecurring(item.name, tx.description))

            return (
              <div key={item.id} style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto auto',
                alignItems: 'center',
                gap: 12,
                padding: '13px 16px',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                background: item.is_active ? 'transparent' : 'rgba(255,255,255,0.01)',
                opacity: item.is_active ? 1 : 0.45,
              }}>
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 9, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
                }}>
                  {item.icon || meta.defaultIcon}
                </div>

                {/* Name / meta */}
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{item.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                    {cat && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{cat.name}</span>}
                    {acc && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>· {acc.name}</span>}
                    {item.next_due_date && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: due.color }}>· due {due.text}</span>
                    )}
                    {item.last_paid_date && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                        · paid {new Date(item.last_paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {matchedTx && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)', padding: '1px 5px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                        title={`Matched: ${matchedTx.description}`}
                      >
                        ✓ {new Date(matchedTx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {formatCurrency(Math.abs(matchedTx.amount))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: isIncome ? 'var(--green)' : 'var(--text)' }}>
                    {isIncome ? '+' : ''}{formatCurrency(Math.abs(item.amount))}<span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 2 }}>{FREQ_LABELS[item.frequency]}</span>
                  </div>
                  {item.frequency !== 'monthly' && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                      {formatCurrency(monthlyAmt)}/mo
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {item.type !== 'income' && item.is_active === 1 && (
                    <button
                      onClick={() => markPaid(item)}
                      title="Mark as paid — advances next due date"
                      style={{
                        padding: '3px 10px', borderRadius: 5, fontSize: 10.5, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid rgba(0,201,167,0.3)',
                        background: 'rgba(0,201,167,0.08)', color: 'var(--accent)',
                      }}
                    >PAID</button>
                  )}
                  <button
                    onClick={() => toggleActive(item)}
                    title={item.is_active ? 'Deactivate' : 'Activate'}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: '1px solid',
                      cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderColor: item.is_active ? 'rgba(0,201,167,0.3)' : 'var(--border)',
                      background: item.is_active ? 'rgba(0,201,167,0.1)' : 'var(--surface-3)',
                      color: item.is_active ? 'var(--accent)' : 'var(--text-dim)',
                    }}
                  >✓</button>
                  <button
                    onClick={() => setEditItem(item)}
                    title="Edit"
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, background: 'var(--surface-3)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✏</button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,77,114,0.2)', cursor: 'pointer', fontSize: 12, background: 'rgba(255,77,114,0.06)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {(showAdd || editItem) && (
        <ItemForm
          accounts={accounts}
          categories={categories}
          initial={editItem ?? undefined}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          onSaved={() => { setShowAdd(false); setEditItem(null); load() }}
        />
      )}
    </div>
  )
}
