import { useState } from 'react'
import type { ColumnMapping } from '@renderer/utils/csvParser'

interface Account { id: string; name: string; type: string }

interface Props {
  headers: string[]
  initialMapping: Partial<ColumnMapping>
  accounts: Account[]
  initialAccountId: string
  previewRows: Record<string, string>[]
  onConfirm: (mapping: ColumnMapping, accountId: string) => void
}

const ACCOUNT_TYPES = [
  { value: 'checking',    label: 'Checking' },
  { value: 'savings',     label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment',  label: 'Investment' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle',     label: 'Vehicle' },
  { value: 'loan',        label: 'Loan' },
  { value: 'other',       label: 'Other' },
]

const SELECT_STYLE = {
  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
  borderRadius: 6, color: 'var(--text)', padding: '6px 10px',
  fontFamily: 'var(--font-ui)', fontSize: 13, width: '100%', cursor: 'pointer'
}

const INPUT_STYLE = {
  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
  borderRadius: 6, color: 'var(--text)', padding: '6px 10px',
  fontFamily: 'var(--font-ui)', fontSize: 13, width: '100%', outline: 'none',
}

const LABEL_STYLE = {
  fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 4
}

function CreateAccountForm({ onCreated }: { onCreated: (account: Account) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [institution, setInstitution] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Account name is required'); return }
    setSaving(true)
    const id = crypto.randomUUID()
    const now = Date.now()
    const res = await window.db.run(
      'INSERT INTO accounts (id, name, type, institution, balance, currency, is_hidden, created_at, updated_at) VALUES (?, ?, ?, ?, 0, \'USD\', 0, ?, ?)',
      [id, name.trim(), type, institution.trim() || null, now, now]
    )
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onCreated({ id, name: name.trim(), type })
  }

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-2)',
      borderRadius: 8, padding: 16, marginTop: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
        NEW ACCOUNT
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={LABEL_STYLE}>Name *</div>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="e.g. Chase Checking"
            style={INPUT_STYLE}
            autoFocus
          />
        </div>
        <div>
          <div style={LABEL_STYLE}>Type *</div>
          <select value={type} onChange={e => setType(e.target.value)} style={SELECT_STYLE}>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={LABEL_STYLE}>Institution <span style={{ color: 'var(--text-dim)' }}>(optional)</span></div>
        <input
          value={institution}
          onChange={e => setInstitution(e.target.value)}
          placeholder="e.g. Chase Bank"
          style={INPUT_STYLE}
        />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>{error}</div>}
      <button onClick={handleSave} disabled={saving} style={{
        padding: '7px 18px', borderRadius: 6, border: 'none',
        background: name.trim() ? 'var(--accent)' : 'var(--surface-3)',
        color: name.trim() ? 'var(--bg)' : 'var(--text-muted)',
        cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
        boxShadow: name.trim() ? '0 0 16px rgba(0,201,167,0.2)' : 'none',
      }}>
        {saving ? 'Creating…' : 'Create Account'}
      </button>
    </div>
  )
}

export default function ColumnMapper({ headers, initialMapping, accounts: initialAccounts, initialAccountId, previewRows, onConfirm }: Props) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [accountId, setAccountId] = useState(initialAccountId)
  const [showCreate, setShowCreate] = useState(initialAccounts.length === 0)
  const [dateCol, setDateCol] = useState(initialMapping.date ?? '')
  const [descCol, setDescCol] = useState(initialMapping.description ?? '')
  const [amountCol, setAmountCol] = useState(initialMapping.amount ?? '')
  const [creditCol, setCreditCol] = useState(initialMapping.creditAmount ?? '')
  const [debitCol, setDebitCol] = useState(initialMapping.debitAmount ?? '')
  const [usesSplitAmount, setUsesSplitAmount] = useState(!initialMapping.amount && (!!initialMapping.creditAmount || !!initialMapping.debitAmount))
  const [typeCol, setTypeCol] = useState(initialMapping.typeColumn ?? '')

  const preview = (col: string) => previewRows.map(r => r[col] ?? '—').filter(Boolean).slice(0, 2).join(', ')

  const canConfirm = accountId && dateCol && descCol && (usesSplitAmount ? (creditCol || debitCol) : amountCol)

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      date: dateCol,
      description: descCol,
      amount: usesSplitAmount ? null : amountCol || null,
      creditAmount: usesSplitAmount ? creditCol || null : null,
      debitAmount: usesSplitAmount ? debitCol || null : null,
      typeColumn: typeCol || null,
    }, accountId)
  }

  const handleAccountCreated = (account: Account) => {
    setAccounts(prev => [...prev, account])
    setAccountId(account.id)
    setShowCreate(false)
  }

  const headerOptions = ['', ...headers].map(h => <option key={h} value={h}>{h || '— select —'}</option>)

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Map your CSV columns to the required fields. Preview values are shown to help you identify the right columns.
      </p>

      {/* Account selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={LABEL_STYLE}>Account *</div>
          {accounts.length > 0 && (
            <button onClick={() => setShowCreate(v => !v)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              color: showCreate ? 'var(--text-muted)' : 'var(--accent)',
            }}>
              {showCreate ? '— CANCEL' : '+ NEW ACCOUNT'}
            </button>
          )}
        </div>

        {accounts.length > 0 && !showCreate && (
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={SELECT_STYLE}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        {showCreate && (
          <CreateAccountForm onCreated={handleAccountCreated} />
        )}

        {accounts.length === 0 && !showCreate && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
            No accounts yet.
          </div>
        )}
      </div>

      {/* Column mappings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={LABEL_STYLE}>Date Column *</div>
          <select value={dateCol} onChange={e => setDateCol(e.target.value)} style={SELECT_STYLE}>{headerOptions}</select>
          {dateCol && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{preview(dateCol)}</div>}
        </div>
        <div>
          <div style={LABEL_STYLE}>Description Column *</div>
          <select value={descCol} onChange={e => setDescCol(e.target.value)} style={SELECT_STYLE}>{headerOptions}</select>
          {descCol && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{preview(descCol)}</div>}
        </div>
      </div>

      {/* Amount type toggle */}
      <div style={{ marginBottom: 16 }}>
        <div style={LABEL_STYLE}>Amount Format *</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[false, true].map(split => (
            <button key={String(split)} onClick={() => setUsesSplitAmount(split)} style={{
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${usesSplitAmount === split ? 'var(--accent)' : 'var(--border)'}`,
              background: usesSplitAmount === split ? 'var(--accent-glow)' : 'transparent',
              color: usesSplitAmount === split ? 'var(--accent)' : 'var(--text-muted)',
              fontFamily: 'var(--font-ui)',
            }}>
              {split ? 'Split (Credit / Debit)' : 'Single Amount column'}
            </button>
          ))}
        </div>

        {!usesSplitAmount && (
          <div>
            <div style={LABEL_STYLE}>Amount Column</div>
            <select value={amountCol} onChange={e => setAmountCol(e.target.value)} style={SELECT_STYLE}>{headerOptions}</select>
            {amountCol && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{preview(amountCol)}</div>}
          </div>
        )}

        {usesSplitAmount && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={LABEL_STYLE}>Credit / Deposits Column</div>
              <select value={creditCol} onChange={e => setCreditCol(e.target.value)} style={SELECT_STYLE}>{headerOptions}</select>
            </div>
            <div>
              <div style={LABEL_STYLE}>Debit / Withdrawals Column</div>
              <select value={debitCol} onChange={e => setDebitCol(e.target.value)} style={SELECT_STYLE}>{headerOptions}</select>
            </div>
          </div>
        )}
      </div>

      {/* Type / Category column */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={LABEL_STYLE}>Transaction Type Column</div>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>(optional)</span>
        </div>
        <select value={typeCol} onChange={e => setTypeCol(e.target.value)} style={SELECT_STYLE}>
          <option value="">— none —</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          If your CSV has a Type or Category column, selecting it helps automatically detect transfers
          (credit card payments, account transfers) and exclude them from spending totals.
          {typeCol && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>Preview: {previewRows.map(r => r[typeCol] || '—').slice(0, 3).join(', ')}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button onClick={handleConfirm} disabled={!canConfirm} style={{
          padding: '9px 24px', borderRadius: 7, border: 'none',
          background: canConfirm ? 'var(--accent)' : 'var(--surface-3)',
          color: canConfirm ? 'var(--bg)' : 'var(--text-muted)',
          cursor: canConfirm ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          boxShadow: canConfirm ? '0 0 20px rgba(0,201,167,0.25)' : 'none',
        }}>
          Preview →
        </button>
      </div>
    </div>
  )
}
