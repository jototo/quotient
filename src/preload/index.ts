import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Database API exposed to renderer
const dbAPI = {
  query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  run: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:run', sql, params),
  get: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:get', sql, params)
}

const dialogAPI = {
  openFile: (options?: unknown) => ipcRenderer.invoke('dialog:openFile', options),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
}

const csvAPI = {
  import: (rows: unknown[]) => ipcRenderer.invoke('csv:import', rows),
}

const dataAPI = {
  clearTransactions: (accountId?: string) => ipcRenderer.invoke('db:clearTransactions', accountId),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('db', dbAPI)
    contextBridge.exposeInMainWorld('dialog', dialogAPI)
    contextBridge.exposeInMainWorld('csv', csvAPI)
    contextBridge.exposeInMainWorld('data', dataAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.db = dbAPI
  // @ts-ignore (define in dts)
  window.dialog = dialogAPI
  // @ts-ignore (define in dts)
  window.csv = csvAPI
  // @ts-ignore (define in dts)
  window.data = dataAPI
}
