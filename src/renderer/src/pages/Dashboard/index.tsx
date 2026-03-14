import { useDashboardData } from '@renderer/hooks/useDashboardData'
import StatCards from './components/StatCards'
import NetWorthChart from './components/NetWorthChart'
import AllocationPanel from './components/AllocationPanel'
import RecentTransactions from './components/RecentTransactions'
import BudgetProgress from './components/BudgetProgress'
import EmptyState from './components/EmptyState'
import { formatMonthLabel } from '@renderer/utils/formatters'

export default function Dashboard() {
  const { data, loading } = useDashboardData()
  const currentMonth = formatMonthLabel(new Date())

  if (loading || !data) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 88, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ height: 320, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 320, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  if (!data.hasAnyData) return <EmptyState />

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <StatCards data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <NetWorthChart history={data.netWorthHistory} currentNetWorth={data.netWorth} />
        <AllocationPanel accounts={data.accounts} assets={data.assets} liabilities={data.liabilities} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RecentTransactions transactions={data.recentTransactions} />
        <BudgetProgress budgets={data.budgetProgress} month={currentMonth} />
      </div>
    </div>
  )
}
