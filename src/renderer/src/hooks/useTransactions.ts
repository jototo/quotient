import { useState, useEffect, useCallback, useRef } from 'react'

export interface TransactionFilters {
  search: string
  accountIds: string[]     // replaces single accountId
  dateFrom: number | null
  dateTo: number | null
  amountMin: number | null
  amountMax: number | null
  showTransfers: boolean
  onlyUncategorized: boolean
  sortBy: 'date' | 'amount'
  sortDir: 'asc' | 'desc'
  page: number
}

export interface TransactionRecord {
  id: string
  date: number
  description: string
  amount: number
  is_transfer: number
  is_pending: number
  account_id: string
  account_name: string | null
  category_id: string | null
  category_name: string | null
  category_color: string | null
  notes: string | null
}

export interface UseTransactionsResult {
  transactions: TransactionRecord[]
  totalCount: number
  loading: boolean
  filters: TransactionFilters
  setFilters: (f: Partial<TransactionFilters>) => void
  refetch: () => void
}

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  accountIds: [],
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  showTransfers: true,
  onlyUncategorized: false,
  sortBy: 'date',
  sortDir: 'desc',
  page: 0,
}

export function useTransactions(): UseTransactionsResult {
  const [filters, setFiltersState] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchTick, setFetchTick] = useState(0)
  const cancelledRef = useRef(false)

  const setFilters = useCallback((partial: Partial<TransactionFilters>) => {
    setFiltersState((prev) => {
      const isPageOnly = Object.keys(partial).length === 1 && 'page' in partial
      const newPage = isPageOnly ? (partial.page ?? prev.page) : 0
      return { ...prev, ...partial, page: newPage }
    })
  }, [])

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1)
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)

    const { search, accountIds, dateFrom, dateTo, amountMin, amountMax, showTransfers, onlyUncategorized, sortBy, sortDir, page } = filters

    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (search.trim()) {
      conditions.push('LOWER(t.description) LIKE ?')
      params.push(`%${search.trim().toLowerCase()}%`)
    }
    if (accountIds.length === 1) {
      conditions.push('t.account_id = ?')
      params.push(accountIds[0])
    } else if (accountIds.length > 1) {
      conditions.push(`t.account_id IN (${accountIds.map(() => '?').join(',')})`)
      params.push(...accountIds)
    }
    if (dateFrom !== null) {
      conditions.push('t.date >= ?')
      params.push(dateFrom)
    }
    if (dateTo !== null) {
      conditions.push('t.date < ?')
      params.push(dateTo)
    }
    if (amountMin !== null) {
      conditions.push('t.amount >= ?')
      params.push(amountMin)
    }
    if (amountMax !== null) {
      conditions.push('t.amount <= ?')
      params.push(amountMax)
    }
    if (!showTransfers) {
      conditions.push('COALESCE(t.is_transfer, 0) = 0')
    }
    if (onlyUncategorized) {
      conditions.push('t.category_id IS NULL')
    }

    const whereClause = conditions.join(' AND ')
    // sortBy is restricted to 'date' | 'amount', sortDir to 'asc' | 'desc' — safe to interpolate
    const orderClause = `t.${sortBy} ${sortDir.toUpperCase()}`
    const offset = page * 50

    const dataSql = `
      SELECT t.id, t.date, t.description, t.amount,
             COALESCE(t.is_transfer, 0) AS is_transfer,
             COALESCE(t.is_pending, 0) AS is_pending,
             t.account_id,
             a.name AS account_name,
             t.category_id,
             c.name AS category_name,
             c.color AS category_color,
             t.notes
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT 50 OFFSET ${offset}
    `

    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
    `

    Promise.all([
      window.db.query(dataSql, params),
      window.db.query(countSql, params),
    ])
      .then(([dataResult, countResult]) => {
        if (cancelledRef.current) return
        const rows = (dataResult.data ?? []) as TransactionRecord[]
        const countRow = (countResult.data?.[0] ?? { cnt: 0 }) as { cnt: number }
        setTransactions(rows)
        setTotalCount(countRow.cnt ?? 0)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelledRef.current) {
          setTransactions([])
          setTotalCount(0)
          setLoading(false)
        }
      })

    return () => {
      cancelledRef.current = true
    }
  }, [filters, fetchTick])

  return { transactions, totalCount, loading, filters, setFilters, refetch }
}
