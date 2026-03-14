import { formatCurrency, formatRelativeDate } from '@renderer/utils/formatters'
import { getCategoryEmoji } from '@renderer/utils/categoryEmoji'
import type { TransactionRow } from '@renderer/hooks/useDashboardData'

export default function RecentTransactions({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Recent Transactions</span>
        <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>View all</button>
      </div>
      {transactions.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No transactions yet. Import a CSV to get started.
        </div>
      ) : (
        transactions.map((tx, i) => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 20px',
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, flexShrink: 0,
                background: 'var(--surface-3)', border: '1px solid var(--border)',
              }}>
                {getCategoryEmoji(tx.category_name)}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{tx.description}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {formatRelativeDate(tx.date)}{tx.account_name ? ` · ${tx.account_name}` : ''}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: tx.amount >= 0 ? 'var(--green)' : 'var(--text)' }}>
                {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
              </div>
              {tx.category_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.category_name}</div>}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
