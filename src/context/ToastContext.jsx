import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

const TOAST_MS = 4800

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setToasts((prev) => [...prev, { id, message: String(message || ''), type }])
      window.setTimeout(() => remove(id), TOAST_MS)
    },
    [remove],
  )

  const success = useCallback((message) => show(message, 'success'), [show])
  const error = useCallback((message) => show(message, 'error'), [show])

  const value = useMemo(() => ({ show, success, error }), [show, success, error])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastHost" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toastFloat ${t.type}`} role="status">
            <div className="toastMsg">{t.message}</div>
            <button type="button" className="toastDismiss" onClick={() => remove(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
