import React, { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ImportProvider, useImport } from '@renderer/context/ImportContext'
import ImportModal from '@renderer/components/ImportModal'

interface NavItem {
  path: string
  label: string
  icon: React.JSX.Element
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        path: '/',
        label: 'Dashboard',
        icon: (
          <svg viewBox="0 0 16 16" fill="currentColor" width={15} height={15}>
            <path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z" opacity=".8" />
          </svg>
        )
      },
      {
        path: '/accounts',
        label: 'Accounts',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="M5 7h6M5 10h4" />
          </svg>
        )
      },
      {
        path: '/transactions',
        label: 'Transactions',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <path d="M2 8h12M8 2v12" />
            <circle cx="8" cy="8" r="5" />
          </svg>
        )
      }
    ]
  },
  {
    label: 'Analyze',
    items: [
      {
        path: '/reports',
        label: 'Reports',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <path d="M2 13V7l4-4 4 4 4-4v10" />
          </svg>
        )
      },
      {
        path: '/budget',
        label: 'Budget',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <path d="M2 6h12M6 6v8" />
          </svg>
        )
      },
      {
        path: '/categories',
        label: 'Categories',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <circle cx="5" cy="5" r="2.5" />
            <circle cx="11" cy="5" r="2.5" />
            <circle cx="5" cy="11" r="2.5" />
            <circle cx="11" cy="11" r="2.5" />
          </svg>
        )
      }
    ]
  },
  {
    label: 'Plan',
    items: [
      {
        path: '/recurring',
        label: 'Recurring',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4v4l3 2" />
          </svg>
        )
      },
      {
        path: '/goals',
        label: 'Goals',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <circle cx="8" cy="8" r="6" />
            <circle cx="8" cy="8" r="2" />
          </svg>
        )
      },
      {
        path: '/investments',
        label: 'Investments',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <path d="M2 11l3-5 3 2 3-4 3 2" />
          </svg>
        )
      }
    ]
  },
  {
    label: 'System',
    items: [
      {
        path: '/settings',
        label: 'Settings',
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width={15} height={15}>
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" />
          </svg>
        )
      }
    ]
  }
]

function getPageInfo(pathname: string): { section: string; title: string } {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))) {
        return { section: group.label, title: item.label }
      }
    }
  }
  return { section: 'Overview', title: 'Dashboard' }
}

function LayoutInner(): React.JSX.Element {
  const location = useLocation()
  const { section, title } = getPageInfo(location.pathname)
  const { open: openImport } = useImport()

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.metaKey && e.key === 'i') {
        e.preventDefault()
        openImport()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openImport])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '24px 20px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              background: 'var(--accent)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 201, 167, 0.4)',
              flexShrink: 0
            }}
          >
            <svg viewBox="0 0 16 16" fill="var(--bg)" width={16} height={16}>
              <path d="M8 2L2 8h2v5h3v-3h2v3h3V8h2L8 2z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--text)'
            }}
          >
            quotient
          </span>
        </div>

        {/* Navigation */}
        <nav
          style={{
            padding: '16px 12px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  padding: '12px 8px 6px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: '13.5px',
                    fontWeight: 400,
                    textDecoration: 'none',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    border: isActive ? '1px solid rgba(0, 201, 167, 0.2)' : '1px solid transparent',
                    transition: 'all 0.15s'
                  })}
                >
                  <span style={{ opacity: 'inherit', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '16px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bg)',
              flexShrink: 0
            }}
          >
            J
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Personal
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Local account</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            height: '56px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {section}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          </div>
          <button
            onClick={openImport}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
              boxShadow: '0 0 16px rgba(0,201,167,0.2)',
            }}
          >
            <svg viewBox="0 0 14 14" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 1v8M3 6l4 4 4-4M2 11h10" />
            </svg>
            Import CSV
          </button>
        </div>

        {/* Page content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg)'
          }}
        >
          <Outlet />
        </div>
      </div>
      <ImportModal />
    </div>
  )
}

export default function Layout(): React.JSX.Element {
  return (
    <ImportProvider>
      <LayoutInner />
    </ImportProvider>
  )
}
