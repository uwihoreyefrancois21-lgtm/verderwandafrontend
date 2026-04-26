import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import { isContactMessageRead } from '../utils/adminManagement'

function isUnreadMessage(m) {
  return !isContactMessageRead(m)
}

/**
 * Count of contact messages that still need admin attention (not read/resolved-like).
 */
/** `pathTrigger` — e.g. `location.pathname` so the count refreshes after admin navigates (e.g. from Contact Messages). */
export function useUnreadContactMessagesCount(token, pathTrigger = '') {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token) {
      setCount(0)
      return undefined
    }
    let cancelled = false
    async function load() {
      try {
        const data = await apiFetch('/contact-messages', { token })
        const list = Array.isArray(data) ? data : []
        const n = list.filter(isUnreadMessage).length
        if (!cancelled) setCount(n)
      } catch {
        if (!cancelled) setCount(0)
      }
    }
    void load()
    const t = setInterval(load, 90_000)
    function onInboxUpdated() {
      void load()
    }
    window.addEventListener('verde:contact-inbox-updated', onInboxUpdated)
    return () => {
      cancelled = true
      clearInterval(t)
      window.removeEventListener('verde:contact-inbox-updated', onInboxUpdated)
    }
  }, [token, pathTrigger])

  return count
}
