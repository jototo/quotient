export interface ColumnMapping {
  date: string
  description: string
  amount: string | null
  creditAmount: string | null
  debitAmount: string | null
}

export interface ImportRow {
  accountId: string
  date: number
  description: string
  amount: number
  importHash: string
}

export interface ParseResult {
  rows: ImportRow[]
  errorCount: number
}

export function detectColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}
  for (const h of headers) {
    const lower = h.toLowerCase()
    if (!mapping.date && (lower.includes('date') || lower === 'posted')) mapping.date = h
    if (!mapping.description && (lower.includes('desc') || lower.includes('merchant') || lower.includes('memo') || lower.includes('payee') || lower.includes('name') || lower === 'details')) mapping.description = h
    if (!mapping.creditAmount && (lower === 'credit' || lower.includes('credit amount') || lower === 'deposits')) mapping.creditAmount = h
    if (!mapping.debitAmount && (lower === 'debit' || lower.includes('debit amount') || lower === 'withdrawals')) mapping.debitAmount = h
    if (!mapping.amount && lower === 'amount' && !lower.includes('credit') && !lower.includes('debit')) mapping.amount = h
  }
  return mapping
}

export function parseDate(str: string): number | null {
  if (!str?.trim()) return null
  const cleaned = str.trim()

  let m: RegExpMatchArray | null = null

  m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]))
    return isNaN(d.getTime()) ? null : d.getTime()
  }

  m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
    return isNaN(d.getTime()) ? null : d.getTime()
  }

  m = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m) {
    const d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]))
    return isNaN(d.getTime()) ? null : d.getTime()
  }

  m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m) {
    const year = parseInt(m[3]) + (parseInt(m[3]) > 50 ? 1900 : 2000)
    const d = new Date(year, parseInt(m[1]) - 1, parseInt(m[2]))
    return isNaN(d.getTime()) ? null : d.getTime()
  }

  // Fallback: let JS parse it
  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? null : d.getTime()
}

export function parseAmount(str: string): number | null {
  if (!str?.trim()) return null
  const cleaned = str.trim().replace(/[$,\s]/g, '')
  // Handle parentheses as negative: (123.45) → -123.45
  const isNegParen = /^\([\d.]+\)$/.test(cleaned)
  const numeric = cleaned.replace(/[()]/g, '')
  const val = parseFloat(numeric)
  if (isNaN(val)) return null
  return isNegParen ? -Math.abs(val) : val
}

export function buildImportHash(accountId: string, date: number, description: string, amount: number): string {
  const str = `${accountId}|${date}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0') + '_' + str.length.toString(16)
}

export function transformRows(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  accountId: string
): ParseResult {
  const rows: ImportRow[] = []
  let errorCount = 0

  for (const raw of rawRows) {
    const dateStr = raw[mapping.date] ?? ''
    const descStr = raw[mapping.description] ?? ''

    let amountVal: number | null = null
    if (mapping.amount) {
      amountVal = parseAmount(raw[mapping.amount] ?? '')
    } else if (mapping.creditAmount || mapping.debitAmount) {
      const credit = mapping.creditAmount ? parseAmount(raw[mapping.creditAmount] ?? '') : null
      const debit = mapping.debitAmount ? parseAmount(raw[mapping.debitAmount] ?? '') : null
      if (credit != null && credit !== 0) amountVal = Math.abs(credit)
      else if (debit != null && debit !== 0) amountVal = -Math.abs(debit)
    }

    const dateMs = parseDate(dateStr)
    if (dateMs === null || amountVal === null || !descStr.trim()) {
      errorCount++
      continue
    }

    const importHash = buildImportHash(accountId, dateMs, descStr, amountVal)
    rows.push({ accountId, date: dateMs, description: descStr.trim(), amount: amountVal, importHash })
  }

  return { rows, errorCount }
}
