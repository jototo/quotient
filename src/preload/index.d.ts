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

declare global {
  interface Window {
    electron: ElectronAPI
    db: DbAPI
  }
}
