import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: 40, background: 'var(--bg)', gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Something went wrong</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)',
          background: 'rgba(255,77,114,0.08)', border: '1px solid rgba(255,77,114,0.2)',
          borderRadius: 8, padding: '12px 16px', maxWidth: 560, width: '100%',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {error.message}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--accent)',
            color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
