import React, { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string
  name: string
  color: string | null
  icon: string | null
  is_system: number
  tx_count: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3D8EFF', '#00C9A7', '#9B6DFF', '#FF4D72', '#F59E0B',
  '#10B981', '#06B6D4', '#8B5CF6', '#EC4899', '#EF4444',
  '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A78BFA',
]

// ─── Add/Edit Panel ───────────────────────────────────────────────────────────

interface EditPanelProps {
  category: CategoryRow | null  // null = adding new
  onClose: () => void
  onSaved: () => void
}

function EditPanel({ category, onClose, onSaved }: EditPanelProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0])
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [saving, setSaving] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [error, setError] = useState<string | null>(null)
  const isNew = category === null

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        await window.db.run(
          'INSERT INTO categories (id, name, color, icon, is_system) VALUES (?,?,?,?,0)',
          [crypto.randomUUID(), name.trim(), color || null, icon.trim() || null]
        )
      } else {
        await window.db.run(
          'UPDATE categories SET name=?, color=?, icon=? WHERE id=?',
          [name.trim(), color || null, icon.trim() || null, category.id]
        )
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!category) return
    if (deleteStep === 'idle') { setDeleteStep('confirm'); return }
    // Unset category from transactions, then delete
    await window.db.run('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [category.id])
    await window.db.run('DELETE FROM categories WHERE id = ?', [category.id])
    onSaved()
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border-2)', background: 'var(--surface-2)',
    color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border-2)', zIndex: 10, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: 0, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Categories
        </button>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: `0 0 16px ${color}60` }}>
            {icon || '📁'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{name || 'New Category'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Category name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Icon (emoji)</label>
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="e.g. 🍔"
              style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: 18 }}
            />
          </div>

          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: c, border: color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer', outline: color === c ? `0 0 0 2px ${c}` : 'none',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    transition: 'transform 0.1s',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : isNew ? 'Create Category' : 'Save Changes'}
          </button>
        </div>

        {/* Danger Zone (only for non-system custom categories) */}
        {!isNew && !category.is_system && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--red)', marginBottom: 10, opacity: 0.7 }}>Danger Zone</div>
            {deleteStep === 'confirm' && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, lineHeight: 1.5 }}>
                Transactions in this category will be uncategorized. This cannot be undone.
              </div>
            )}
            <button
              onClick={handleDelete}
              style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: '1px solid var(--red)', background: deleteStep === 'confirm' ? 'var(--red)' : 'transparent', color: deleteStep === 'confirm' ? 'white' : 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}
            >
              {deleteStep === 'confirm' ? 'Confirm Delete' : 'Delete Category'}
            </button>
            {deleteStep === 'confirm' && (
              <button onClick={() => setDeleteStep('idle')} style={{ width: '100%', marginTop: 6, padding: '8px 0', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                Cancel
              </button>
            )}
          </div>
        )}
        {!isNew && category.is_system === 1 && (
          <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 7, background: 'var(--surface-2)', fontSize: 12, color: 'var(--text-muted)' }}>
            System categories cannot be deleted.
          </div>
        )}
      </div>
      <div style={{ height: 24 }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Categories() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null | 'new'>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.db.query(
        `SELECT c.id, c.name, c.color, c.icon, c.is_system,
                COUNT(t.id) AS tx_count
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id
         GROUP BY c.id
         ORDER BY c.is_system DESC, c.name ASC`
      )
      setCategories((res.data ?? []) as CategoryRow[])
    } catch (_) { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const systemCats = categories.filter(c => c.is_system === 1)
  const customCats = categories.filter(c => c.is_system !== 1)

  function renderRow(cat: CategoryRow) {
    return (
      <div
        key={cat.id}
        onClick={() => setEditingCategory(cat)}
        onMouseEnter={() => setHoveredId(cat.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px',
          borderBottom: '1px solid var(--border)', cursor: 'pointer',
          background: hoveredId === cat.id ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        {/* Color + icon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color ?? 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: cat.color ? `0 0 10px ${cat.color}40` : 'none' }}>
          {cat.icon || '📁'}
        </div>

        {/* Name + system badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
            {cat.is_system === 1 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border-2)', letterSpacing: '0.06em' }}>SYSTEM</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
            {cat.tx_count} transaction{cat.tx_count !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Color swatch */}
        {cat.color && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, boxShadow: `0 0 6px ${cat.color}`, flexShrink: 0 }} />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 2 }}>
            {categories.length} total
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {customCats.length} custom · {systemCats.length} system
          </div>
        </div>
        <button
          onClick={() => setEditingCategory('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, boxShadow: '0 0 16px rgba(0,201,167,0.2)' }}
        >
          + New Category
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>
        {/* List */}
        <div style={{ overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 56, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 32 }}>🏷️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>No categories yet</div>
              <button onClick={() => setEditingCategory('new')} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>+ New Category</button>
            </div>
          ) : (
            <>
              {customCats.length > 0 && (
                <>
                  <div style={{ padding: '10px 24px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>
                    Custom ({customCats.length})
                  </div>
                  {customCats.map(renderRow)}
                </>
              )}
              {systemCats.length > 0 && (
                <>
                  <div style={{ padding: '10px 24px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginTop: customCats.length > 0 ? 8 : 0 }}>
                    System ({systemCats.length})
                  </div>
                  {systemCats.map(renderRow)}
                </>
              )}
            </>
          )}
        </div>

        {/* Side panel */}
        <div style={{ position: 'relative', borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
          {editingCategory === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-dim)', padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>←</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a category to edit, or create a new one.</div>
            </div>
          ) : (
            <EditPanel
              category={editingCategory === 'new' ? null : editingCategory}
              onClose={() => setEditingCategory(null)}
              onSaved={fetchCategories}
            />
          )}
        </div>
      </div>
    </div>
  )
}
