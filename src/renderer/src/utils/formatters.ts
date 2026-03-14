export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
    if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDelta(current: number, previous: number): {
  direction: 'up' | 'down' | 'neutral'
  text: string
} {
  if (previous === 0) return { direction: 'neutral', text: '—' }
  const diff = current - previous
  const pct = (diff / Math.abs(previous)) * 100
  const sign = diff >= 0 ? '+' : ''
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  return {
    direction,
    text: `${sign}${formatCurrency(diff)} (${sign}${pct.toFixed(1)}%) vs last month`
  }
}

export function formatRelativeDate(unixMs: number): string {
  const d = new Date(unixMs)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatChartDate(unixMs: number): string {
  return new Date(unixMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
