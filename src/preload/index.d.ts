import { ElectronAPI } from '@electron-toolkit/preload'

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
}

interface ImportResult {
  inserted: number
  skipped: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    db: DbAPI
    dialog: {
      openFile: (options?: unknown) => Promise<string | null>
      readFile: (filePath: string) => Promise<{ data: string | null; error: string | null }>
    }
    csv: {
      import: (rows: ImportRow[]) => Promise<{ data: ImportResult | null; error: string | null }>
    }
  }
}
