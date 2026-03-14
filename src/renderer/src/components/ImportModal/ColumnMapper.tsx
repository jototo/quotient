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

const SELECT_STYLE = {
  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
  borderRadius: 6, color: 'var(--text)', padding: '6px 10px',
  fontFamily: 'var(--font-ui)', fontSize: 13, width: '100%', cursor: 'pointer'
}

const LABEL_STYLE = {
  fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 4
}

export default function ColumnMapper({ headers, initialMapping, accounts, initialAccountId, previewRows, onConfirm }: Props) {
  const [accountId, setAccountId] = useState(initialAccountId)
  const [dateCol, setDateCol] = useState(initialMapping.date ?? '')
  const [descCol, setDescCol] = useState(initialMapping.description ?? '')
  const [amountCol, setAmountCol] = useState(initialMapping.amount ?? '')
  const [creditCol, setCreditCol] = useState(initialMapping.creditAmount ?? '')
  const [debitCol, setDebitCol] = useState(initialMapping.debitAmount ?? '')
  const [usesSplitAmount, setUsesSplitAmount] = useState(!initialMapping.amount && (!!initialMapping.creditAmount || !!initialMapping.debitAmount))

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
    }, accountId)
  }

  const headerOptions = ['', ...headers].map(h => <option key={h} value={h}>{h || '— select —'}</option>)

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Map your CSV columns to the required fields. Preview values are shown to help you identify the right columns.
      </p>

      {/* Account selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={LABEL_STYLE}>Account *</div>
        {accounts.length === 0 ? (
          <div style={{ color: 'var(--amber)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
            No accounts found. Create an account first in the Accounts page.
          </div>
        ) : (
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={SELECT_STYLE}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
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
