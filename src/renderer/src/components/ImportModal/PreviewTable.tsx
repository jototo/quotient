import type { ImportRow } from '@renderer/utils/csvParser'
import { formatCurrency, formatRelativeDate } from '@renderer/utils/formatters'

interface Props {
  rows: ImportRow[]
  errorCount: number
  onBack: () => void
  onImport: () => void
}

export default function PreviewTable({ rows, errorCount, onBack, onImport }: Props) {
  const preview = rows.slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{
          flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--surface-2)'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Transactions</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>{rows.length}</div>
        </div>
        {errorCount > 0 && (
          <div style={{
            flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.05)'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 4 }}>Skipped Rows</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--amber)' }}>{errorCount}</div>
          </div>
        )}
      </div>

      <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {['Date', 'Description', 'Amount'].map(h => (
            <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
          ))}
        </div>
        {preview.map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 2fr 1fr',
            padding: '9px 14px',
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{formatRelativeDate(row.date)}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: row.amount >= 0 ? 'var(--green)' : 'var(--text)', textAlign: 'right' }}>
              {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
            </div>
          </div>
        ))}
        {rows.length > 10 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            +{rows.length - 10} more rows…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
        <button onClick={onBack} style={{
          padding: '9px 20px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: 14
        }}>← Back</button>
        <button onClick={onImport} style={{
          padding: '9px 24px', borderRadius: 7, border: 'none',
          background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          boxShadow: '0 0 20px rgba(0,201,167,0.25)',
        }}>
          Import {rows.length} Transactions
        </button>
      </div>
    </div>
  )
}
