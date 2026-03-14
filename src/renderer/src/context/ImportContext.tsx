import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface ImportContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const ImportContext = createContext<ImportContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function ImportProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <ImportContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </ImportContext.Provider>
  )
}

export function useImport() {
  return useContext(ImportContext)
}
