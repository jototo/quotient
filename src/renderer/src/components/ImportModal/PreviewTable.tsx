import { useState } from 'react'
import type { ImportRow } from '@renderer/utils/csvParser'
import { formatCurrency, formatRelativeDate } from '@renderer/utils/formatters'

const CATEGORY_NAMES: Record<string, string> = {
  cat_paycheck: 'Paycheck', cat_refund: 'Refund', cat_interest: 'Interest',
  cat_groceries: 'Groceries', cat_restaurants: 'Restaurants', cat_coffee: 'Coffee',
  cat_gas: 'Gas', cat_rideshare: 'Rideshare', cat_parking: 'Parking',
  cat_transit: 'Transit', cat_rent: 'Rent', cat_utilities: 'Utilities',
  cat_internet: 'Internet', cat_streaming: 'Streaming', cat_online: 'Online',
  cat_shopping: 'Shopping', cat_clothing: 'Clothing', cat_electronics: 'Electronics',
  cat_gaming: 'Gaming', cat_flights: 'Flights', cat_hotels: 'Hotels',
  cat_pharmacy: 'Pharmacy', cat_medical: 'Medical', cat_gym: 'Gym',
  cat_personal: 'Personal Care', cat_pets: 'Pets', cat_education: 'Education',
  cat_financial: 'Fees', cat_gifts: 'Gifts',
  cat_savings_transfer: 'Savings Transfer', cat_cc_payment: 'CC Payment',
}

interface Props {
  rows: ImportRow[]
  errorCount: number
  onBack: () => void
  onImport: (rows: ImportRow[]) => void
}

type ViewMode = 'all' | 'transfers'

export default function PreviewTable({ rows, errorCount, onBack, onImport }: Props) {
  // Local copy so user can toggle transfer flags
  const [localRows, setLocalRows] = useState<ImportRow[]>(rows)
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  const transferCount = localRows.filter(r => r.isTransfer).length
  const expenseCount = localRows.filter(r => !r.isTransfer).length

  const toggleTransfer = (idx: number) => {
    setLocalRows(prev => prev.map((r, i) => i === idx ? { ...r, isTransfer: !r.isTransfer } : r))
  }

  const displayRows = viewMode === 'transfers'
    ? localRows.map((r, i) => ({ ...r, _idx: i })).filter(r => r.isTransfer)
    : localRows.map((r, i) => ({ ...r, _idx: i })).slice(0, 12)

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Transactions</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>{expenseCount}</div>
        </div>
        <div
          onClick={() => setViewMode(v => v === 'transfers' ? 'all' : 'transfers')}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${viewMode === 'transfers' ? 'rgba(0,201,167,0.4)' : 'rgba(245,158,11,0.3)'}`,
            background: viewMode === 'transfers' ? 'var(--accent-glow)' : 'rgba(245,158,11,0.05)',
          }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: viewMode === 'transfers' ? 'var(--accent)' : 'var(--amber)', marginBottom: 4 }}>
            Transfers {viewMode === 'transfers' ? '· click to show all' : '· click to review'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: viewMode === 'transfers' ? 'var(--accent)' : 'var(--amber)' }}>{transferCount}</div>
        </div>
        {errorCount > 0 && (
          <div style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,77,114,0.3)', background: 'rgba(255,77,114,0.05)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>Skipped Rows</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--red)' }}>{errorCount}</div>
          </div>
        )}
      </div>

      {/* Transfer note */}
      {transferCount > 0 && viewMode === 'all' && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 7, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{transferCount} transfer{transferCount !== 1 ? 's' : ''}</span> detected (credit card payments, account transfers) and will be excluded from your spending totals.
          Click the Transfers card above to review and adjust.
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 90px 80px', padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {['Date', 'Description', 'Category', 'Amount', viewMode === 'transfers' ? 'Transfer?' : ''].map((h, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {displayRows.length === 0 && (
          <div style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            No transactions in this view.
          </div>
        )}

        {displayRows.map((row, i) => (
          <div key={row._idx} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 120px 90px 80px',
            padding: '9px 14px',
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            opacity: row.isTransfer && viewMode === 'all' ? 0.45 : 1,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{formatRelativeDate(row.date)}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{row.description}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
              {row.categoryId ? (CATEGORY_NAMES[row.categoryId] ?? row.categoryId) : ''}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: row.amount >= 0 ? 'var(--green)' : 'var(--text)', textAlign: 'right' }}>
              {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => toggleTransfer(row._idx)}
                title={row.isTransfer ? 'Mark as expense' : 'Mark as transfer'}
                style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10.5, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontWeight: 600, border: 'none',
                  background: row.isTransfer ? 'rgba(245,158,11,0.15)' : 'var(--surface-3)',
                  color: row.isTransfer ? 'var(--amber)' : 'var(--text-dim)',
                }}
              >
                {row.isTransfer ? 'XFER' : '—'}
              </button>
            </div>
          </div>
        ))}

        {viewMode === 'all' && localRows.length > 12 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            +{localRows.length - 12} more rows…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
        <button onClick={onBack} style={{
          padding: '9px 20px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: 14
        }}>← Back</button>
        <button onClick={() => onImport(localRows)} style={{
          padding: '9px 24px', borderRadius: 7, border: 'none',
          background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          boxShadow: '0 0 20px rgba(0,201,167,0.25)',
        }}>
          Import {expenseCount} Transactions{transferCount > 0 ? ` + ${transferCount} Transfers` : ''}
        </button>
      </div>
    </div>
  )
}
