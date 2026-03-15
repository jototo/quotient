export {}

interface DbResult<T = unknown> {
  data: T | null
  error: string | null
}

interface DbAPI {
  query: (sql: string, params?: unknown[]) => Promise<DbResult<unknown[]>>
  run: (sql: string, params?: unknown[]) => Promise<DbResult<{ changes: number; lastInsertRowid: number | bigint }>>
  get: (sql: string, params?: unknown[]) => Promise<DbResult<unknown>>
}

interface ImportRow {
  accountId: string
  date: number
  description: string
  amount: number
  importHash: string
  isTransfer: boolean
  categoryId: string | null
}

interface ImportResult {
  inserted: number
  skipped: number
}

declare global {
  interface Window {
    db: DbAPI
    dialog: {
      openAndReadCSV: () => Promise<{ data: string | null; fileName: string | null; error: string | null }>
    }
    csv: {
      import: (rows: ImportRow[]) => Promise<{ data: ImportResult | null; error: string | null }>
    }
    data: {
      clearTransactions: (accountId?: string) => Promise<{ data: boolean | null; error: string | null }>
    }
    appAPI: {
      getInfo: () => Promise<{ version: string; dataPath: string }>
      exportCSV: () => Promise<{ error: string | null; canceled: boolean; count?: number }>
      listBackups: () => Promise<{ data: { name: string; size: number; createdAt: number }[]; error: string | null }>
    }
  }
}
