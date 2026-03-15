import { useEffect } from 'react'

const SHORTCUTS = [
  {
    group: 'Global',
    items: [
      { keys: ['⌘', 'I'], description: 'Open import CSV dialog' },
      { keys: ['⌘', '?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close any open modal or menu' },
    ],
  },
  {
    group: 'Budget',
    items: [
      { keys: ['←'], description: 'Previous month' },
      { keys: ['→'], description: 'Next month' },
    ],
  },
  {
    group: 'Transactions',
    items: [
      { keys: ['Click checkbox'], description: 'Select transaction' },
      { keys: ['Row menu', '⊞'], description: 'Select all with same description' },
    ],
  },
]

interface Props {
  onClose: () => void
}

export default function KeyboardShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(7,11,18,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 12, width: 440, maxHeight: '80vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Keyboard Shortcuts
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 15, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '8px 0 16px' }}>
          {SHORTCUTS.map(group => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '10px 20px 6px',
                fontFamily: 'var(--font-mono)', fontSize: 9.5,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-dim)',
              }}>
                {group.group}
              </div>
              {group.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 20px',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.description}</span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 16 }}>
                    {item.keys.map((k, j) => (
                      <kbd key={j} style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2px 7px', borderRadius: 5, minWidth: 24,
                        background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--text)', boxShadow: '0 1px 0 var(--border-2)',
                        whiteSpace: 'nowrap',
                      }}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center' }}>
          Press <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--surface-3)', border: '1px solid var(--border-2)' }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}
