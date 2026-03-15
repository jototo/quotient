import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTransactions } from '@renderer/hooks/useTransactions'
import { useAccounts } from '@renderer/hooks/useAccounts'
import { formatCurrency, formatRelativeDate } from '@renderer/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryOption {
  id: string
  name: string
  color: string | null
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 160px 160px 110px',
        alignItems: 'center',
        padding: '0 28px',
        height: 48,
        borderBottom: '1px solid var(--border)',
        animation: 'pulse 1.6s ease-in-out infinite',
        position: 'relative',
      }}
    >
      {[80, 220, 100, 120, 70].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            width: w,
            borderRadius: 4,
            background: 'var(--surface-3)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Category cell with inline select ─────────────────────────────────────────

interface CategoryCellProps {
  txId: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categories: CategoryOption[]
  onChanged: () => void
}

function CategoryCell({
  txId,
  categoryId,
  categoryName,
  categoryColor,
  categories,
  onChanged,
}: CategoryCellProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const val = e.target.value || null
    setEditing(false)
    await window.db.run('UPDATE transactions SET category_id = ? WHERE id = ?', [val, txId])
    onChanged()
  }

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={categoryId ?? ''}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--accent)',
          borderRadius: 5,
          color: 'var(--text)',
          padding: '3px 6px',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          cursor: 'pointer',
          outline: 'none',
          maxWidth: 140,
        }}
      >
        <option value="">Uncategorized</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        maxWidth: 140,
      }}
      title="Click to edit category"
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: categoryColor ?? 'var(--text-dim)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: categoryName ? 'var(--text-muted)' : 'var(--text-dim)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {categoryName ?? 'Uncategorized'}
      </span>
    </div>
  )
}

// ─── Row menu ──────────────────────────────────────────────────────────────────

interface RowMenuProps {
  txId: string
  isTransfer: number
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onAction: () => void
}

function RowMenu({
  txId,
  isTransfer,
  openMenuId,
  setOpenMenuId,
  onAction,
}: RowMenuProps): React.JSX.Element {
  const isOpen = openMenuId === txId
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleToggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setOpenMenuId(isOpen ? null : txId)
  }

  const handleMarkTransfer = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const newVal = isTransfer ? 0 : 1
    await window.db.run('UPDATE transactions SET is_transfer = ? WHERE id = ?', [newVal, txId])
    setOpenMenuId(null)
    onAction()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 16,
          lineHeight: 1,
          fontFamily: 'var(--font-mono)',
        }}
        title="Row actions"
      >
        ⋯
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
            minWidth: 180,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={handleMarkTransfer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '10px 14px',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {isTransfer ? (
              <>
                <span style={{ fontSize: 14 }}>✓</span> Mark as expense
              </>
            ) : (
              <>
                <span style={{ fontSize: 14 }}>↔</span> Mark as transfer
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Transaction row ───────────────────────────────────────────────────────────

interface TransactionRowProps {
  tx: {
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
  }
  categories: CategoryOption[]
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onRefetch: () => void
}

function TxRow({
  tx,
  categories,
  openMenuId,
  setOpenMenuId,
  onRefetch,
}: TransactionRowProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  const amountColor =
    tx.is_transfer
      ? 'var(--text-dim)'
      : tx.amount >= 0
        ? 'var(--green)'
        : 'var(--text)'

  // Format date: use relative for recent, full date for older
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const dateLabel =
    tx.date >= sevenDaysAgo
      ? formatRelativeDate(tx.date)
      : new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 160px 160px 110px',
        alignItems: 'center',
        padding: '0 28px',
        height: 48,
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        opacity: tx.is_transfer ? 0.5 : 1,
        position: 'relative',
        transition: 'background 0.1s',
      }}
    >
      {/* Date */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {dateLabel}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingRight: hovered ? 40 : 12,
        }}
      >
        {tx.is_transfer ? (
          <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>↔</span>
        ) : null}
        {tx.description}
      </div>

      {/* Account */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {tx.account_name ?? '—'}
      </div>

      {/* Category */}
      <CategoryCell
        txId={tx.id}
        categoryId={tx.category_id}
        categoryName={tx.category_name}
        categoryColor={tx.category_color}
        categories={categories}
        onChanged={onRefetch}
      />

      {/* Amount */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: amountColor,
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
        }}
      >
        {formatCurrency(tx.amount)}
        {hovered && (
          <div style={{ position: 'absolute', right: 28 }}>
            <RowMenu
              txId={tx.id}
              isTransfer={tx.is_transfer}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onAction={onRefetch}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '6px 10px',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  outline: 'none',
}

// ─── Multi-account dropdown ───────────────────────────────────────────────────

function AccountMultiSelect({ accounts, selected, onChange }: {
  accounts: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const label = selected.length === 0
    ? 'All accounts'
    : selected.length === 1
      ? (accounts.find(a => a.id === selected[0])?.name ?? '1 account')
      : `${selected.length} accounts`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        ...inputStyle,
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        background: selected.length > 0 ? 'rgba(61,142,255,0.08)' : 'var(--surface-2)',
        borderColor: selected.length > 0 ? 'rgba(61,142,255,0.4)' : 'var(--border)',
        color: selected.length > 0 ? 'var(--accent-2)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}>
        {label}
        <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: 'var(--surface-2)', border: '1px solid var(--border-2)',
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: 180, overflow: 'hidden',
        }}>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} style={{
              width: '100%', padding: '8px 14px', background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11.5,
              fontFamily: 'var(--font-mono)', cursor: 'pointer', textAlign: 'left',
            }}>Clear selection</button>
          )}
          {accounts.map(a => (
            <button key={a.id} onClick={() => toggle(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 14px', background: 'transparent', border: 'none',
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-ui)',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: '1px solid',
                borderColor: selected.includes(a.id) ? 'var(--accent-2)' : 'var(--border)',
                background: selected.includes(a.id) ? 'var(--accent-2)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected.includes(a.id) && <span style={{ fontSize: 9, color: 'var(--bg)', fontWeight: 700 }}>✓</span>}
              </div>
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  accountIds: string[]
  onAccountsChange: (v: string[]) => void
  dateFrom: number | null
  onDateFromChange: (v: number | null) => void
  dateTo: number | null
  onDateToChange: (v: number | null) => void
  amountMin: number | null
  onAmountMinChange: (v: number | null) => void
  amountMax: number | null
  onAmountMaxChange: (v: number | null) => void
  showTransfers: boolean
  onToggleTransfers: () => void
  sortKey: string
  onSortChange: (v: string) => void
  accounts: { id: string; name: string }[]
}

function FilterBar({
  search, onSearchChange,
  accountIds, onAccountsChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  amountMin, onAmountMinChange,
  amountMax, onAmountMaxChange,
  showTransfers, onToggleTransfers,
  sortKey, onSortChange,
  accounts,
}: FilterBarProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    setLocalSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearchChange(v), 200)
  }

  const toDateVal = (ms: number | null): string => {
    if (ms === null) return ''
    const d = new Date(ms)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const fromDateVal = (val: string): number | null => val ? new Date(val + 'T00:00:00').getTime() : null

  return (
    <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280, display: 'flex', alignItems: 'center' }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" width={13} height={13} style={{ position: 'absolute', left: 9, pointerEvents: 'none' }}>
          <circle cx="6.5" cy="6.5" r="4" /><path d="M10 10l3 3" />
        </svg>
        <input type="text" placeholder="Search…" value={localSearch} onChange={handleSearchInput} style={{ ...inputStyle, paddingLeft: 28, width: '100%' }} />
      </div>

      {/* Multi-account */}
      <AccountMultiSelect accounts={accounts} selected={accountIds} onChange={onAccountsChange} />

      {/* Date range */}
      <input type="date" value={toDateVal(dateFrom)} onChange={e => onDateFromChange(fromDateVal(e.target.value))} style={{ ...inputStyle, colorScheme: 'dark' }} title="From date" />
      <input type="date" value={toDateVal(dateTo)}   onChange={e => onDateToChange(fromDateVal(e.target.value))}   style={{ ...inputStyle, colorScheme: 'dark' }} title="To date" />

      {/* Amount range */}
      <input type="number" placeholder="$ min" value={amountMin ?? ''} onChange={e => onAmountMinChange(e.target.value ? parseFloat(e.target.value) : null)}
        style={{ ...inputStyle, width: 80, fontFamily: 'var(--font-mono)' }} title="Min amount" />
      <input type="number" placeholder="$ max" value={amountMax ?? ''} onChange={e => onAmountMaxChange(e.target.value ? parseFloat(e.target.value) : null)}
        style={{ ...inputStyle, width: 80, fontFamily: 'var(--font-mono)' }} title="Max amount" />

      {/* Transfers toggle */}
      <button onClick={onToggleTransfers} style={{
        background: showTransfers ? 'var(--surface-2)' : 'rgba(245,158,11,0.12)',
        border: showTransfers ? '1px solid var(--border)' : '1px solid rgba(245,158,11,0.4)',
        borderRadius: 20, color: showTransfers ? 'var(--text-muted)' : 'var(--amber)',
        padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Transfers</button>

      {/* Sort */}
      <select value={sortKey} onChange={e => onSortChange(e.target.value)} style={inputStyle}>
        <option value="date_desc">Date (newest)</option>
        <option value="date_asc">Date (oldest)</option>
        <option value="amount_desc">Amount (largest)</option>
        <option value="amount_asc">Amount (smallest)</option>
      </select>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Transactions(): React.JSX.Element {
  const { transactions, totalCount, loading, filters, setFilters, refetch } = useTransactions()
  const { accounts } = useAccounts()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return
    const handler = (): void => setOpenMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuId])

  // Fetch categories once
  useEffect(() => {
    window.db
      .query('SELECT id, name, color FROM categories ORDER BY name')
      .then((r) => setCategories((r.data ?? []) as CategoryOption[]))
      .catch(() => {})
  }, [])

  // Sort key composite
  const sortKey = `${filters.sortBy}_${filters.sortDir}`

  const handleSortChange = useCallback(
    (val: string): void => {
      const [sortBy, sortDir] = val.split('_') as ['date' | 'amount', 'asc' | 'desc']
      setFilters({ sortBy, sortDir })
    },
    [setFilters]
  )

  // Pagination
  const totalPages = Math.ceil(totalCount / 50)
  const currentPage = filters.page
  const startItem = totalCount === 0 ? 0 : currentPage * 50 + 1
  const endItem = Math.min((currentPage + 1) * 50, totalCount)

  // Has active filters (other than defaults)
  const hasFilters =
    filters.search !== '' ||
    filters.accountIds.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.amountMin !== null ||
    filters.amountMax !== null ||
    !filters.showTransfers

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Filter bar */}
      <FilterBar
        search={filters.search}
        onSearchChange={(v) => setFilters({ search: v })}
        accountIds={filters.accountIds}
        onAccountsChange={(v) => setFilters({ accountIds: v })}
        dateFrom={filters.dateFrom}
        onDateFromChange={(v) => setFilters({ dateFrom: v })}
        dateTo={filters.dateTo}
        onDateToChange={(v) => setFilters({ dateTo: v })}
        amountMin={filters.amountMin}
        onAmountMinChange={(v) => setFilters({ amountMin: v })}
        amountMax={filters.amountMax}
        onAmountMaxChange={(v) => setFilters({ amountMax: v })}
        showTransfers={filters.showTransfers}
        onToggleTransfers={() => setFilters({ showTransfers: !filters.showTransfers })}
        sortKey={sortKey}
        onSortChange={handleSortChange}
        accounts={accounts}
      />

      {/* Table area */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 160px 160px 110px',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border-2)',
            zIndex: 5,
          }}
        >
          {(['Date', 'Description', 'Account', 'Category', 'Amount'] as const).map((col) => (
            <div
              key={col}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: col === 'Amount' ? '8px 0' : '8px 0',
                textAlign: col === 'Amount' ? 'right' : 'left',
              }}
            >
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : transactions.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 28px',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="var(--text-dim)"
                strokeWidth="1.4"
                width={22}
                height={22}
              >
                <circle cx="10" cy="10" r="8" />
                <path d="M7 10h6M10 7v6" />
              </svg>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              {hasFilters
                ? 'No transactions match your filters.'
                : 'No transactions yet. Import a CSV to get started.'}
            </div>
          </div>
        ) : (
          transactions.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              categories={categories}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onRefetch={refetch}
            />
          ))
        )}
      </div>

      {/* Pagination footer */}
      {totalCount > 50 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
            padding: '10px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Showing {startItem}–{endItem} of {totalCount} transactions
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setFilters({ page: currentPage - 1 })}
              disabled={currentPage === 0}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                color: currentPage === 0 ? 'var(--text-dim)' : 'var(--text)',
                padding: '5px 12px',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                minWidth: 80,
                textAlign: 'center',
              }}
            >
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setFilters({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages - 1}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                color: currentPage >= totalPages - 1 ? 'var(--text-dim)' : 'var(--text)',
                padding: '5px 12px',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
