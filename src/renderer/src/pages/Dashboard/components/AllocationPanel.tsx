import type { AccountRow } from '@renderer/hooks/useDashboardData'
import { formatCurrency } from '@renderer/utils/formatters'

const TYPE_COLOR: Record<string, string> = {
  investment: '#3D8EFF',
  checking: '#00C9A7',
  savings: '#00C9A7',
  real_estate: '#9B6DFF',
  vehicle: '#F59E0B',
  other: '#4E6080',
}

const TYPE_LABEL: Record<string, string> = {
  investment: 'Investments',
  checking: 'Cash',
  savings: 'Cash',
  real_estate: 'Real Estate',
  vehicle: 'Vehicles',
  other: 'Other',
}

interface GroupedAsset { label: string; value: number; color: string }

function groupAccounts(accounts: AccountRow[]): GroupedAsset[] {
  const map = new Map<string, GroupedAsset>()
  for (const acc of accounts) {
    if (['credit_card', 'loan'].includes(acc.type)) continue
    const label = TYPE_LABEL[acc.type] ?? 'Other'
    const color = TYPE_COLOR[acc.type] ?? '#4E6080'
    const existing = map.get(label)
    if (existing) existing.value += acc.balance
    else map.set(label, { label, value: acc.balance, color })
  }
  return Array.from(map.values()).filter(g => g.value > 0).sort((a, b) => b.value - a.value)
}

interface Props {
  accounts: AccountRow[]
  assets: number
  liabilities: number
}

export default function AllocationPanel({ accounts, assets, liabilities }: Props) {
  const groups = groupAccounts(accounts)
  const total = groups.reduce((s, g) => s + g.value, 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Allocation</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)', background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(0,201,167,0.25)' }}>Assets</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {/* Allocation bar */}
        <div style={{ height: 6, borderRadius: 6, display: 'flex', overflow: 'hidden', gap: 2, marginBottom: 16 }}>
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

        {/* Groups */}
        {groups.map(g => (
          <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, boxShadow: `0 0 6px ${g.color}`, flexShrink: 0 }} />
              {g.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{formatCurrency(g.value)}</div>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ color: 'var(--text)', fontSize: 12.5 }}>Total Assets</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--green)' }}>{formatCurrency(assets)}</span>
        </div>
        {liabilities > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--text)', fontSize: 12.5 }}>Total Liabilities</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>{formatCurrency(liabilities)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
