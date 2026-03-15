import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppInfo {
  version: string
  dataPath: string
}

interface DbStats {
  transactions: number
  accounts: number
  categories: number
  budgets: number
  recurring: number
  dateRange: { min: number; max: number } | null
}

interface BackupFile {
  name: string
  size: number
  createdAt: number
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>{title}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, action, danger }: { label: string; value?: React.ReactNode; action?: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 18px', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13.5, color: danger ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>{label}</div>
        {value && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{value}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function Btn({ label, onClick, variant = 'default', disabled }: { label: string; onClick: () => void; variant?: 'default' | 'danger' | 'accent'; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-muted)' },
    danger:  { background: 'rgba(255,77,114,0.08)', border: '1px solid rgba(255,77,114,0.3)', color: 'var(--red)' },
    accent:  { background: 'var(--accent)', border: 'none', color: 'var(--bg)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: '7px 16px', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: variant === 'accent' ? 600 : 400,
      opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
    }}>{label}</button>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{title}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 24 }}>{body}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [info, setInfo]       = useState<AppInfo | null>(null)
  const [stats, setStats]     = useState<DbStats | null>(null)
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | 'transactions' | 'allData'>(null)

  async function loadAll() {
    const [infoRes, statsRes, backupRes] = await Promise.all([
      window.appAPI.getInfo(),
      Promise.all([
        window.db.get('SELECT COUNT(*) AS n FROM transactions'),
        window.db.get('SELECT COUNT(*) AS n FROM accounts'),
        window.db.get('SELECT COUNT(*) AS n FROM categories WHERE is_system = 0'),
        window.db.get('SELECT COUNT(*) AS n FROM budgets'),
        window.db.get('SELECT COUNT(*) AS n FROM recurring_items'),
        window.db.get('SELECT MIN(date) AS min, MAX(date) AS max FROM transactions'),
      ]),
      window.appAPI.listBackups(),
    ])
    setInfo(infoRes)
    const [tx, acc, cat, bud, rec, range] = statsRes
    setStats({
      transactions: (tx.data as { n: number })?.n ?? 0,
      accounts:     (acc.data as { n: number })?.n ?? 0,
      categories:   (cat.data as { n: number })?.n ?? 0,
      budgets:      (bud.data as { n: number })?.n ?? 0,
      recurring:    (rec.data as { n: number })?.n ?? 0,
      dateRange:    (range.data as { min: number; max: number } | null),
    })
    setBackups(backupRes.data ?? [])
  }

  useEffect(() => { loadAll() }, [])

  async function handleExport() {
    setExporting(true)
    setExportMsg(null)
    const res = await window.appAPI.exportCSV()
    setExporting(false)
    if (res.canceled) return
    if (res.error) { setExportMsg(`Error: ${res.error}`); return }
    setExportMsg(`Exported ${res.count?.toLocaleString()} transactions`)
    setTimeout(() => setExportMsg(null), 4000)
  }

  async function handleClearTransactions() {
    await window.data.clearTransactions()
    setConfirm(null)
    loadAll()
  }

  async function handleClearAll() {
    await Promise.all([
      window.db.run('DELETE FROM transactions'),
      window.db.run('DELETE FROM accounts'),
      window.db.run('DELETE FROM budgets'),
      window.db.run('DELETE FROM recurring_items'),
      window.db.run('DELETE FROM goals'),
      window.db.run('DELETE FROM net_worth_history'),
      window.db.run('DELETE FROM investment_holdings'),
    ])
    setConfirm(null)
    loadAll()
  }

  const dateRangeLabel = stats?.dateRange?.min && stats?.dateRange?.max
    ? `${new Date(stats.dateRange.min).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(stats.dateRange.max).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'No transactions yet'

  function fmtBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Settings</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Data & Preferences</h1>
      </div>

      {/* Database overview */}
      <Section title="Database">
        <Row label="Transactions" value={dateRangeLabel}
          action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{stats?.transactions.toLocaleString() ?? '—'}</span>} />
        <Row label="Accounts"   action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{stats?.accounts ?? '—'}</span>} />
        <Row label="Budgets"    action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{stats?.budgets ?? '—'}</span>} />
        <Row label="Recurring items" action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{stats?.recurring ?? '—'}</span>} />
        <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info?.dataPath ?? '…'}</span>
        </div>
      </Section>

      {/* Export */}
      <Section title="Export">
        <Row
          label="Export transactions"
          value="Saves all transactions as a CSV file"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {exportMsg && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: exportMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)' }}>{exportMsg}</span>}
              <Btn label={exporting ? 'Exporting…' : 'Export CSV'} onClick={handleExport} variant="accent" disabled={exporting} />
            </div>
          }
        />
      </Section>

      {/* Backups */}
      <Section title="Auto-backups">
        {backups.length === 0 ? (
          <div style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 13 }}>
            No backups yet. Backups are created automatically before clearing transactions.
          </div>
        ) : (
          <>
            {backups.map((b, i) => (
              <div key={b.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 18px',
                borderBottom: i < backups.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{fmtBytes(b.size)}</span>
              </div>
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-dim)' }}>
              Stored in <span style={{ fontFamily: 'var(--font-mono)' }}>{info?.dataPath}</span>
            </div>
          </>
        )}
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <Row
          label="Clear all transactions"
          value="A backup will be saved automatically"
          danger
          action={<Btn label="Clear Transactions" onClick={() => setConfirm('transactions')} variant="danger" />}
        />
        <div style={{ borderBottom: 'none' }}>
          <Row
            label="Reset all data"
            value="Deletes transactions, accounts, budgets, and recurring items"
            danger
            action={<Btn label="Reset Everything" onClick={() => setConfirm('allData')} variant="danger" />}
          />
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <Row label="Quotient" value="Local-only personal finance"
          action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>v{info?.version ?? '…'}</span>} />
        <div style={{ padding: '11px 18px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          All data is stored locally on your device. No accounts, no syncing, no tracking.
        </div>
      </Section>

      {/* Confirm dialogs */}
      {confirm === 'transactions' && (
        <ConfirmDialog
          title="Clear all transactions?"
          body="This will delete every transaction across all accounts. A JSON backup will be saved to your data directory first. Your accounts, budgets, and settings will be kept."
          confirmLabel="Clear Transactions"
          onConfirm={handleClearTransactions}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'allData' && (
        <ConfirmDialog
          title="Reset everything?"
          body="This will permanently delete all transactions, accounts, budgets, recurring items, goals, and history. This cannot be undone."
          confirmLabel="Reset Everything"
          onConfirm={handleClearAll}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
