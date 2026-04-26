import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import {
  VERDE_EVENT_ADMIN_INBOX_READ,
  countLocalInboxUnread,
  isContactMessageRead,
  loadAdminInboxReadMap,
} from '../utils/adminManagement'

/**
 * Unread counts for admin header: contact (server status), service requests & quotes (local read map).
 * @param {string} [token]
 * @param {string} [refreshTrigger] — e.g. active section id to refresh when navigating
 */
export function useAdminInboxUnreadCounts(token, refreshTrigger = '') {
  const [counts, setCounts] = useState({ quotes: 0, service: 0, contact: 0 })

  const load = useCallback(async () => {
    if (!token) {
      setCounts({ quotes: 0, service: 0, contact: 0 })
      return
    }
    try {
      const [cm, sr, rq] = await Promise.all([
        apiFetch('/contact-messages', { token }),
        apiFetch('/service-requests', { token }),
        apiFetch('/request-quotes', { token }),
      ])
      const cmList = Array.isArray(cm) ? cm : []
      const srList = Array.isArray(sr) ? sr : []
      const rqList = Array.isArray(rq) ? rq : []

      const contact = cmList.filter((m) => !isContactMessageRead(m)).length
      const srRead = loadAdminInboxReadMap('service_requests')
      const rqRead = loadAdminInboxReadMap('request_quotes')
      const service = countLocalInboxUnread(srList, 'request_id', srRead)
      const quotes = countLocalInboxUnread(rqList, 'quote_id', rqRead)

      setCounts({ quotes, service, contact })
    } catch {
      setCounts({ quotes: 0, service: 0, contact: 0 })
    }
  }, [token])

  useEffect(() => {
    void load()
    const t = setInterval(load, 90_000)
    function onContact() {
      void load()
    }
    function onLocalRead() {
      void load()
    }
    function onStorage(e) {
      if (e.key && e.key.startsWith('verde_admin_inbox_read_')) void load()
    }
    window.addEventListener('verde:contact-inbox-updated', onContact)
    window.addEventListener(VERDE_EVENT_ADMIN_INBOX_READ, onLocalRead)
    window.addEventListener('storage', onStorage)
    return () => {
      clearInterval(t)
      window.removeEventListener('verde:contact-inbox-updated', onContact)
      window.removeEventListener(VERDE_EVENT_ADMIN_INBOX_READ, onLocalRead)
      window.removeEventListener('storage', onStorage)
    }
  }, [load, refreshTrigger])

  return counts
}
