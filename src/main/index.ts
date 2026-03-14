import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import icon from '../../resources/icon.png?asset'

// Database instance
let db: Database.Database

function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'quotient.db')

  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      institution TEXT,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      color TEXT,
      is_hidden INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      color TEXT,
      icon TEXT,
      is_system INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      date INTEGER NOT NULL,
      description TEXT NOT NULL,
      original_description TEXT,
      amount REAL NOT NULL,
      category_id TEXT REFERENCES categories(id),
      notes TEXT,
      is_recurring INTEGER DEFAULT 0,
      is_pending INTEGER DEFAULT 0,
      import_hash TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL,
      next_due_date INTEGER,
      category_id TEXT REFERENCES categories(id),
      account_id TEXT REFERENCES accounts(id),
      type TEXT NOT NULL DEFAULT 'bill',
      is_active INTEGER DEFAULT 1,
      icon TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date INTEGER,
      account_id TEXT REFERENCES accounts(id),
      color TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS net_worth_history (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      total_assets REAL NOT NULL,
      total_liabilities REAL NOT NULL,
      net_worth REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investment_holdings (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      ticker TEXT NOT NULL,
      name TEXT,
      shares REAL NOT NULL,
      cost_basis REAL,
      current_price REAL,
      asset_type TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_import_hash ON transactions(import_hash) WHERE import_hash IS NOT NULL;
  `)

  // Migrations — safe to run on every startup
  try { db.exec('ALTER TABLE transactions ADD COLUMN is_transfer INTEGER DEFAULT 0') } catch { /* already exists */ }

  console.log('Database initialized at:', dbPath)
}

// IPC handlers for database operations
function setupIpcHandlers(): void {
  ipcMain.handle('db:query', (_event, sql: string, params: unknown[] = []) => {
    try {
      const stmt = db.prepare(sql)
      return { data: stmt.all(...params), error: null }
    } catch (error) {
      return { data: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:run', (_event, sql: string, params: unknown[] = []) => {
    try {
      const stmt = db.prepare(sql)
      const result = stmt.run(...params)
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:get', (_event, sql: string, params: unknown[] = []) => {
    try {
      const stmt = db.prepare(sql)
      return { data: stmt.get(...params), error: null }
    } catch (error) {
      return { data: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      ...(options || {})
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('fs:readFile', (_event, filePath: string) => {
    try {
      return { data: readFileSync(filePath, 'utf-8'), error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  })

  type CsvImportRow = {
    accountId: string
    date: number
    description: string
    amount: number
    importHash: string
    isTransfer: boolean
  }

  ipcMain.handle('csv:import', (_event, rows: CsvImportRow[]) => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO transactions
        (id, account_id, date, description, original_description, amount, import_hash, is_transfer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertMany = db.transaction((rows: CsvImportRow[]) => {
      let inserted = 0
      for (const row of rows) {
        const result = insert.run(
          randomUUID(),
          row.accountId,
          row.date,
          row.description,
          row.description,
          row.amount,
          row.importHash,
          row.isTransfer ? 1 : 0,
          Date.now()
        )
        inserted += result.changes
      }
      return { inserted, skipped: rows.length - inserted }
    })
    try {
      return { data: insertMany(rows), error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.quotient')

  // Initialize database
  initDatabase()

  // Set up IPC handlers
  setupIpcHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up database on quit
app.on('before-quit', () => {
  if (db) {
    db.close()
  }
})
