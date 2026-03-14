import { useState, useEffect } from 'react'

export interface AccountOption {
  id: string
  name: string
  type: string
}

interface UseAccountsResult {
  accounts: AccountOption[]
  loading: boolean
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    window.db
      .query('SELECT id, name, type FROM accounts WHERE is_hidden = 0 ORDER BY name ASC')
      .then((result) => {
        if (cancelled) return
        setAccounts((result.data ?? []) as AccountOption[])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { accounts, loading }
}
