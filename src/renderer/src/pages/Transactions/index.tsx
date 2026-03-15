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

const COL_TEMPLATE = '36px 100px 1fr 160px 160px 110px'

function SkeletonRow(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COL_TEMPLATE,
        alignItems: 'center',
        padding: '0 28px',
        height: 48,
        borderBottom: '1px solid var(--border)',
        animation: 'pulse 1.6s ease-in-out infinite',
        position: 'relative',
      }}
    >
      {[14, 80, 220, 100, 120, 70].map((w, i) => (
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

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkActionBar({ count, categories, onSetCategory, onSetTransfer, onDelete, onClear }: {
  count: number
  categories: CategoryOption[]
  onSetCategory: (catId: string | null) => void
  onSetTransfer: (val: 0 | 1) => void
  onDelete: () => void
  onClear: () => void
}): React.JSX.Element {
  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border-2)',
    background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: 12,
  }

  return (
    <div style={{
      padding: '7px 28px', background: 'rgba(61,142,255,0.06)',
      borderBottom: '1px solid rgba(61,142,255,0.2)',
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 16, background: 'var(--border-2)', flexShrink: 0 }} />

      {/* Category */}
      <select
        value=""
        onChange={e => { if (e.target.value) onSetCategory(e.target.value === '__clear__' ? null : e.target.value) }}
        style={{ ...btnStyle, paddingRight: 6 }}
      >
        <option value="" disabled>Set category…</option>
        <option value="__clear__">— Clear category</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <button onClick={() => onSetTransfer(1)} style={btnStyle}>↔ Mark transfer</button>
      <button onClick={() => onSetTransfer(0)} style={btnStyle}>✓ Unmark transfer</button>

      <div style={{ width: 1, height: 16, background: 'var(--border-2)', flexShrink: 0 }} />
      <button
        onClick={onDelete}
        style={{ ...btnStyle, color: 'var(--red)', borderColor: 'rgba(255,77,114,0.3)', background: 'rgba(255,77,114,0.06)' }}
      >
        🗑 Delete
      </button>

      <button onClick={onClear} style={{ ...btnStyle, marginLeft: 'auto', fontSize: 11 }}>✕ Clear selection</button>
    </div>
  )
}

// ─── Pending rule bar ─────────────────────────────────────────────────────────

function PendingRuleBar({ initialKeyword, categoryName, categoryId, onSave, onSkip }: {
  initialKeyword: string
  categoryName: string
  categoryId: string
  onSave: (keyword: string, categoryId: string) => void
  onSkip: () => void
}): React.JSX.Element {
  const [keyword, setKeyword] = useState(initialKeyword)
  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border-2)',
    background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: 12,
  }
  return (
    <div style={{
      padding: '7px 28px', background: 'rgba(0,201,167,0.05)',
      borderBottom: '1px solid rgba(0,201,167,0.18)',
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>💡 Save rule for future imports?</span>
      <div style={{ width: 1, height: 16, background: 'var(--border-2)', flexShrink: 0 }} />
      <input
        autoFocus
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="keyword"
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 5,
          color: 'var(--text)', padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 12,
          width: 160, outline: 'none',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>→ {categoryName}</span>
      <button
        onClick={() => onSave(keyword, categoryId)}
        disabled={!keyword.trim()}
        style={{ ...btnStyle, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 600, opacity: keyword.trim() ? 1 : 0.5 }}
      >
        Save Rule
      </button>
      <button onClick={onSkip} style={{ ...btnStyle, fontSize: 11 }}>Skip</button>
    </div>
  )
}

// ─── Keyword extractor for auto-rule suggestion ────────────────────────────────

function extractKeyword(description: string): string {
  // Strip common bank prefixes like "SQ *", "TST* ", "PP*"
  const stripped = description.replace(/^[A-Z]{2,4}[* ]\s*/i, '').trim()
  const words = stripped.split(/[\s\-_#@./,]+/)
  for (const word of words) {
    const alpha = word.replace(/[^a-zA-Z]/g, '')
    if (alpha.length >= 4) return alpha.toLowerCase()
  }
  return stripped.split(/\s+/)[0].toLowerCase() || description.slice(0, 20).toLowerCase()
}

// ─── Category cell with inline select ─────────────────────────────────────────

interface CategoryCellProps {
  txId: string
  description: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categories: CategoryOption[]
  onChanged: () => void
  onSuggestRule?: (keyword: string, categoryId: string, categoryName: string) => void
}

function CategoryCell({
  txId,
  description,
  categoryId,
  categoryName,
  categoryColor,
  categories,
  onChanged,
  onSuggestRule,
}: CategoryCellProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const val = e.target.value || null
    setEditing(false)
    await window.db.run('UPDATE transactions SET category_id = ? WHERE id = ?', [val, txId])
    if (val && val !== categoryId && onSuggestRule) {
      const cat = categories.find(c => c.id === val)
      if (cat) onSuggestRule(extractKeyword(description), val, cat.name)
    }
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

// ─── Note edit modal ───────────────────────────────────────────────────────────

interface NoteEditModalProps {
  tx: { id: string; description: string; notes: string | null }
  onClose: () => void
  onSaved: () => void
}

function NoteEditModal({ tx, onClose, onSaved }: NoteEditModalProps): React.JSX.Element {
  const [note, setNote] = useState(tx.notes ?? '')

  const handleSave = async (): Promise<void> => {
    await window.db.run('UPDATE transactions SET notes = ? WHERE id = ?', [note.trim() || null, tx.id])
    onSaved()
    onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(7,11,18,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Edit Note</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</div>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border-2)',
            background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-ui)',
            fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>Save Note</button>
        </div>
      </div>
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
  onDelete: () => void
  onEditNote: () => void
  onSelectSimilar: () => void
}

function RowMenu({
  txId,
  isTransfer,
  openMenuId,
  setOpenMenuId,
  onAction,
  onDelete,
  onEditNote,
  onSelectSimilar,
}: RowMenuProps): React.JSX.Element {
  const isOpen = openMenuId === txId
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleToggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (isOpen) { setOpenMenuId(null); setDeleteStep('idle') }
    else setOpenMenuId(txId)
  }

  const handleMarkTransfer = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const newVal = isTransfer ? 0 : 1
    await window.db.run('UPDATE transactions SET is_transfer = ? WHERE id = ?', [newVal, txId])
    setOpenMenuId(null)
    onAction()
  }

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (deleteStep === 'idle') { setDeleteStep('confirm'); return }
    await window.db.run('DELETE FROM transactions WHERE id = ?', [txId])
    setOpenMenuId(null)
    onDelete()
  }

  const handleEditNote = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setOpenMenuId(null)
    onEditNote()
  }

  const handleSelectSimilar = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setOpenMenuId(null)
    onSelectSimilar()
  }

  const menuBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer',
    padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, textAlign: 'left',
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 16,
          lineHeight: 1, fontFamily: 'var(--font-mono)',
        }}
        title="Row actions"
      >
        ⋯
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0,
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100, minWidth: 190, overflow: 'hidden',
          }}
        >
          <button
            onClick={handleMarkTransfer}
            style={menuBtnStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {isTransfer ? (
              <><span style={{ fontSize: 14 }}>✓</span> Mark as expense</>
            ) : (
              <><span style={{ fontSize: 14 }}>↔</span> Mark as transfer</>
            )}
          </button>
          <button
            onClick={handleEditNote}
            style={menuBtnStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 13 }}>✎</span> Edit note
          </button>
          <button
            onClick={handleSelectSimilar}
            style={menuBtnStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 13 }}>⊞</span> Select all similar
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <button
            onClick={handleDelete}
            style={{ ...menuBtnStyle, color: deleteStep === 'confirm' ? 'white' : 'var(--red)', background: deleteStep === 'confirm' ? 'var(--red)' : 'transparent', fontWeight: deleteStep === 'confirm' ? 600 : 400 }}
            onMouseEnter={(e) => { if (deleteStep !== 'confirm') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,114,0.08)' }}
            onMouseLeave={(e) => { if (deleteStep !== 'confirm') (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 13 }}>🗑</span>
            {deleteStep === 'confirm' ? 'Confirm delete' : 'Delete'}
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
    notes: string | null
  }
  categories: CategoryOption[]
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onRefetch: () => void
  onDelete: (id: string) => void
  onEditNote: (tx: TransactionRowProps['tx']) => void
  selected: boolean
  onToggleSelect: (id: string) => void
  onSelectSimilar: (description: string) => void
  onSuggestRule: (keyword: string, categoryId: string, categoryName: string) => void
}

function TxRow({
  tx,
  categories,
  openMenuId,
  setOpenMenuId,
  onRefetch,
  onDelete,
  onEditNote,
  selected,
  onToggleSelect,
  onSelectSimilar,
  onSuggestRule,
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
        gridTemplateColumns: COL_TEMPLATE,
        alignItems: 'center',
        padding: '0 28px',
        minHeight: 48,
        borderBottom: '1px solid var(--border)',
        background: selected ? 'rgba(61,142,255,0.07)' : hovered ? 'var(--surface-2)' : 'transparent',
        opacity: tx.is_transfer && !selected ? 0.5 : 1,
        position: 'relative',
        transition: 'background 0.1s',
      }}
    >
      {/* Checkbox */}
      <div onClick={e => { e.stopPropagation(); onToggleSelect(tx.id) }} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{
          width: 15, height: 15, borderRadius: 4, border: '1px solid',
          borderColor: selected ? 'var(--accent-2)' : (hovered ? 'var(--border-2)' : 'transparent'),
          background: selected ? 'var(--accent-2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'all 0.1s',
        }}>
          {selected && <span style={{ fontSize: 9, color: 'var(--bg)', fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </div>
      </div>

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
      <div style={{ overflow: 'hidden', paddingRight: hovered ? 40 : 12 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tx.is_transfer ? (
            <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>↔</span>
          ) : null}
          {tx.description}
        </div>
        {tx.notes && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
            {tx.notes}
          </div>
        )}
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
        description={tx.description}
        categoryId={tx.category_id}
        categoryName={tx.category_name}
        categoryColor={tx.category_color}
        categories={categories}
        onChanged={onRefetch}
        onSuggestRule={onSuggestRule}
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
              onDelete={() => onDelete(tx.id)}
              onEditNote={() => onEditNote(tx)}
              onSelectSimilar={() => onSelectSimilar(tx.description)}
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
  onlyUncategorized: boolean
  onToggleUncategorized: () => void
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
  onlyUncategorized, onToggleUncategorized,
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

      {/* Uncategorized toggle */}
      <button onClick={onToggleUncategorized} style={{
        background: onlyUncategorized ? 'rgba(155,109,255,0.12)' : 'var(--surface-2)',
        border: onlyUncategorized ? '1px solid rgba(155,109,255,0.5)' : '1px solid var(--border)',
        borderRadius: 20, color: onlyUncategorized ? '#9B6DFF' : 'var(--text-muted)',
        padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Uncategorized</button>

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
  const [noteEditTx, setNoteEditTx] = useState<TransactionRowProps['tx'] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingRule, setPendingRule] = useState<{ keyword: string; categoryId: string; categoryName: string } | null>(null)

  // Clear selection when filters/page change
  useEffect(() => { setSelectedIds(new Set()) }, [filters])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(transactions.map(t => t.id)))
  }, [transactions])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectSimilar = useCallback((description: string) => {
    const lower = description.toLowerCase()
    setSelectedIds(new Set(transactions.filter(t => t.description.toLowerCase() === lower).map(t => t.id)))
  }, [transactions])

  const bulkSetCategory = useCallback(async (catId: string | null) => {
    if (!selectedIds.size) return
    const ids = Array.from(selectedIds)
    await window.db.run(
      `UPDATE transactions SET category_id = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [catId, ...ids]
    )
    setSelectedIds(new Set())
    refetch()
  }, [selectedIds, refetch])

  const bulkSetTransfer = useCallback(async (val: 0 | 1) => {
    if (!selectedIds.size) return
    const ids = Array.from(selectedIds)
    await window.db.run(
      `UPDATE transactions SET is_transfer = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [val, ...ids]
    )
    setSelectedIds(new Set())
    refetch()
  }, [selectedIds, refetch])

  const handleSuggestRule = useCallback((keyword: string, categoryId: string, categoryName: string) => {
    setPendingRule({ keyword, categoryId, categoryName })
  }, [])

  const handleSaveRule = useCallback(async (keyword: string, categoryId: string) => {
    const k = keyword.trim().toLowerCase()
    if (!k) return
    await window.db.run(
      `INSERT INTO category_rules (id, pattern, category_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(pattern) DO UPDATE SET category_id = excluded.category_id, created_at = excluded.created_at`,
      [crypto.randomUUID(), k, categoryId, Date.now()]
    )
    setPendingRule(null)
  }, [])

  const bulkDelete = useCallback(async () => {
    if (!selectedIds.size) return
    const ids = Array.from(selectedIds)
    await window.db.run(
      `DELETE FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    )
    setSelectedIds(new Set())
    refetch()
  }, [selectedIds, refetch])

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
    !filters.showTransfers ||
    filters.onlyUncategorized

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
        onlyUncategorized={filters.onlyUncategorized}
        onToggleUncategorized={() => setFilters({ onlyUncategorized: !filters.onlyUncategorized })}
        sortKey={sortKey}
        onSortChange={handleSortChange}
        accounts={accounts}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          categories={categories}
          onSetCategory={bulkSetCategory}
          onSetTransfer={bulkSetTransfer}
          onDelete={bulkDelete}
          onClear={clearSelection}
        />
      )}

      {/* Save-as-rule suggestion bar */}
      {pendingRule && (
        <PendingRuleBar
          initialKeyword={pendingRule.keyword}
          categoryName={pendingRule.categoryName}
          categoryId={pendingRule.categoryId}
          onSave={handleSaveRule}
          onSkip={() => setPendingRule(null)}
        />
      )}

      {/* Table area */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COL_TEMPLATE,
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border-2)',
            zIndex: 5,
          }}
        >
          {/* Select-all checkbox */}
          <div
            onClick={() => selectedIds.size === transactions.length ? clearSelection() : selectAll()}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}
          >
            <div style={{
              width: 15, height: 15, borderRadius: 4, border: '1px solid var(--border-2)',
              background: selectedIds.size > 0 && selectedIds.size === transactions.length ? 'var(--accent-2)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selectedIds.size > 0 && selectedIds.size === transactions.length
                ? <span style={{ fontSize: 9, color: 'var(--bg)', fontWeight: 700 }}>✓</span>
                : selectedIds.size > 0
                  ? <span style={{ fontSize: 9, color: 'var(--accent-2)', fontWeight: 700, lineHeight: 1 }}>–</span>
                  : null}
            </div>
          </div>
          {(['Date', 'Description', 'Account', 'Category', 'Amount'] as const).map((col) => (
            <div
              key={col}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '8px 0',
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
              onDelete={() => refetch()}
              onEditNote={(t) => setNoteEditTx(t)}
              selected={selectedIds.has(tx.id)}
              onToggleSelect={toggleSelect}
              onSelectSimilar={selectSimilar}
              onSuggestRule={handleSuggestRule}
            />
          ))
        )}
      </div>

      {/* Note edit modal */}
      {noteEditTx && (
        <NoteEditModal
          tx={noteEditTx}
          onClose={() => setNoteEditTx(null)}
          onSaved={refetch}
        />
      )}

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
