import { useState, useEffect } from 'react'

function monthBounds(offset = 0): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  return [start.getTime(), end.getTime()]
}

export interface TransactionRow {
  id: string
  date: number
  description: string
  amount: number
  category_name: string | null
  category_color: string | null
  account_name: string | null
}

export interface BudgetProgressRow {
  id: string
  name: string
  color: string | null
  budget_amount: number
  spent: number
}

export interface AccountRow {
  id: string
  name: string
  type: string
  balance: number
  color: string | null
}

export interface DashboardData {
  netWorth: number
  assets: number
  liabilities: number
  currentMonthSpending: number
  previousMonthSpending: number
  currentMonthIncome: number
  previousMonthIncome: number
  netWorthHistory: { date: number; value: number }[]
  recentTransactions: TransactionRow[]
  budgetProgress: BudgetProgressRow[]
  accounts: AccountRow[]
  hasAnyData: boolean
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const [curStart, curEnd] = monthBounds(0)
    const [prevStart, prevEnd] = monthBounds(-1)

    Promise.all([
      // 1. Net worth from accounts
      window.db.query('SELECT type, balance FROM accounts WHERE is_hidden = 0'),
      // 2. Current month spending/income
      window.db.query(
        'SELECT SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS spending, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income FROM transactions WHERE date >= ? AND date < ? AND is_pending = 0',
        [curStart, curEnd]
      ),
      // 3. Previous month spending/income
      window.db.query(
        'SELECT SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS spending, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income FROM transactions WHERE date >= ? AND date < ? AND is_pending = 0',
        [prevStart, prevEnd]
      ),
      // 4. Net worth history
      window.db.query('SELECT date, net_worth FROM net_worth_history ORDER BY date ASC LIMIT 365'),
      // 5. Recent transactions
      window.db.query(
        `SELECT t.id, t.date, t.description, t.amount, c.name AS category_name, c.color AS category_color, a.name AS account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE t.is_pending = 0
         ORDER BY t.date DESC, t.created_at DESC
         LIMIT 8`
      ),
      // 6. Budget progress
      window.db.query(
        `SELECT b.id, c.name, c.color, b.amount AS budget_amount,
                COALESCE(SUM(ABS(t.amount)), 0) AS spent
         FROM budgets b
         JOIN categories c ON b.category_id = c.id
         LEFT JOIN transactions t ON t.category_id = b.category_id AND t.date >= ? AND t.date < ? AND t.amount < 0 AND t.is_pending = 0
         WHERE b.period = 'monthly'
         GROUP BY b.id, c.name, c.color, b.amount
         ORDER BY (COALESCE(SUM(ABS(t.amount)), 0) / b.amount) DESC
         LIMIT 7`,
        [curStart, curEnd]
      ),
      // 7. Accounts list
      window.db.query('SELECT id, name, type, balance, color FROM accounts WHERE is_hidden = 0 ORDER BY balance DESC'),
    ]).then((results) => {
      if (cancelled) return

      const [accRes, curRes, prevRes, histRes, txRes, budgetRes, accsRes] = results

      const accs = (accRes.data ?? []) as { type: string; balance: number }[]
      const assets = accs.filter(a => !['credit_card', 'loan'].includes(a.type)).reduce((s, a) => s + (a.balance ?? 0), 0)
      const liabilities = accs.filter(a => ['credit_card', 'loan'].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0)

      const curMonth = (curRes.data?.[0] ?? {}) as { spending: number; income: number }
      const prevMonth = (prevRes.data?.[0] ?? {}) as { spending: number; income: number }

      const history = ((histRes.data ?? []) as { date: number; net_worth: number }[]).map(r => ({ date: r.date, value: r.net_worth }))

      const hasAnyData = (accsRes.data ?? []).length > 0

      if (!cancelled) {
        setData({
          netWorth: assets - liabilities,
          assets,
          liabilities,
          currentMonthSpending: curMonth.spending ?? 0,
          previousMonthSpending: prevMonth.spending ?? 0,
          currentMonthIncome: curMonth.income ?? 0,
          previousMonthIncome: prevMonth.income ?? 0,
          netWorthHistory: history,
          recentTransactions: (txRes.data ?? []) as TransactionRow[],
          budgetProgress: (budgetRes.data ?? []) as BudgetProgressRow[],
          accounts: (accsRes.data ?? []) as AccountRow[],
          hasAnyData,
        })
        setLoading(false)
      }
    }).catch(e => {
      if (!cancelled) { setError(String(e)); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [])

  const refetch = () => {
    setLoading(true)
    setData(null)
  }

  return { data, loading, error, refetch }
}
