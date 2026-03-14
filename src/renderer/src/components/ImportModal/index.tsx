import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { useImport } from '@renderer/context/ImportContext'
import { detectColumnMapping, transformRows } from '@renderer/utils/csvParser'
import type { ColumnMapping, ImportRow } from '@renderer/utils/csvParser'
import ColumnMapper from './ColumnMapper'
import PreviewTable from './PreviewTable'

type Step = 'loading' | 'mapping' | 'preview' | 'done' | 'error'

interface Account {
  id: string
  name: string
  type: string
}

export default function ImportModal() {
  const { isOpen, close } = useImport()
  const [step, setStep] = useState<Step>('loading')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [parseErrorCount, setParseErrorCount] = useState(0)
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Load accounts
  useEffect(() => {
    if (!isOpen) return
    window.db.query('SELECT id, name, type FROM accounts WHERE is_hidden = 0 ORDER BY name').then((res) => {
      if (res.data) {
        setAccounts(res.data as Account[])
        if ((res.data as Account[]).length > 0) setSelectedAccountId((res.data as Account[])[0].id)
      }
    })
  }, [isOpen])

  // Open file dialog when modal opens
  useEffect(() => {
    if (!isOpen) return
    setStep('loading')
    window.dialog.openFile().then((filePath) => {
      if (!filePath) { close(); return }
      setFileName(filePath.split('/').pop() ?? filePath)
      window.dialog.readFile(filePath).then((res) => {
        if (res.error || !res.data) { setErrorMsg(res.error ?? 'Could not read file'); setStep('error'); return }
        const result = Papa.parse<Record<string, string>>(res.data, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        })
        const hdrs = result.meta.fields ?? []
        setHeaders(hdrs)
        setRawRows(result.data)
        setMapping(detectColumnMapping(hdrs))
        setStep('mapping')
      })
    })
  }, [isOpen])

  const handleConfirmMapping = useCallback((m: ColumnMapping, accountId: string) => {
    const { rows, errorCount } = transformRows(rawRows, m, accountId)
    setImportRows(rows)
    setParseErrorCount(errorCount)
    setSelectedAccountId(accountId)
    setStep('preview')
  }, [rawRows])

  const handleImport = useCallback(async (finalRows: ImportRow[]) => {
    const res = await window.csv.import(finalRows)
    if (res.error || !res.data) { setErrorMsg(res.error ?? 'Import failed'); setStep('error'); return }
    setImportResult(res.data)
    setStep('done')
  }, [importRows])

  const handleReset = useCallback(() => {
    setStep('loading')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping({})
    setImportRows([])
    setParseErrorCount(0)
    setImportResult(null)
    setErrorMsg('')
    // Re-trigger file dialog
    window.dialog.openFile().then((filePath) => {
      if (!filePath) { close(); return }
      setFileName(filePath.split('/').pop() ?? filePath)
      window.dialog.readFile(filePath).then((res) => {
        if (res.error || !res.data) { setErrorMsg(res.error ?? 'Could not read file'); setStep('error'); return }
        const result = Papa.parse<Record<string, string>>(res.data, { header: true, skipEmptyLines: true, dynamicTyping: false })
        const hdrs = result.meta.fields ?? []
        setHeaders(hdrs)
        setRawRows(result.data)
        setMapping(detectColumnMapping(hdrs))
        setStep('mapping')
      })
    })
  }, [close])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(7, 11, 18, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 12,
        width: '100%', maxWidth: 720,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
              Import Transactions
            </div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{fileName || 'Select a CSV file'}</div>
          </div>
          <button onClick={close} style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Opening file picker…</div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ color: 'var(--red)', marginBottom: 12, fontWeight: 600 }}>Error</div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{errorMsg}</div>
            </div>
          )}

          {step === 'mapping' && (
            <ColumnMapper
              headers={headers}
              initialMapping={mapping}
              accounts={accounts}
              initialAccountId={selectedAccountId}
              previewRows={rawRows.slice(0, 3)}
              onConfirm={handleConfirmMapping}
            />
          )}

          {step === 'preview' && (
            <PreviewTable
              rows={importRows}
              errorCount={parseErrorCount}
              onBack={() => setStep('mapping')}
              onImport={handleImport}
            />
          )}

          {step === 'done' && importResult && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Import complete</div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 32 }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{importResult.inserted}</span> imported
                {importResult.skipped > 0 && <>, <span style={{ color: 'var(--amber)' }}>{importResult.skipped}</span> duplicates skipped</>}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={handleReset} style={{
                  padding: '8px 20px', borderRadius: 7, border: '1px solid var(--border-2)',
                  background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14
                }}>Import Another File</button>
                <button onClick={close} style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none',
                  background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                  boxShadow: '0 0 20px rgba(0,201,167,0.25)'
                }}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
