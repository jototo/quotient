import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Database API exposed to renderer
const dbAPI = {
  query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  run: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:run', sql, params),
  get: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:get', sql, params)
}

const dialogAPI = {
  openAndReadCSV: () => ipcRenderer.invoke('dialog:openAndReadCSV'),
}

const csvAPI = {
  import: (rows: unknown[]) => ipcRenderer.invoke('csv:import', rows),
}

const dataAPI = {
  clearTransactions: (accountId?: string) => ipcRenderer.invoke('db:clearTransactions', accountId),
}

// contextIsolation is always enabled — no unsafe fallback
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('db', dbAPI)
contextBridge.exposeInMainWorld('dialog', dialogAPI)
contextBridge.exposeInMainWorld('csv', csvAPI)
contextBridge.exposeInMainWorld('data', dataAPI)
