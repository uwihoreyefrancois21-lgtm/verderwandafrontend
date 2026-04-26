import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

function normalizeRole(r) {
  const v = String(r || '').trim().toLowerCase()
  if (v === 'employer') return 'employer'
  if (v === 'employeer') return 'employer'
  return v
}

export default function AdminEmployerEditorModal({ open, mode, item, token, onClose, onSaved }) {
  const { success: toastSuccess, error: toastError } = useToast()

  const isEdit = mode === 'edit' && item

  const [users, setUsers] = useState([])
  const [usersBusy, setUsersBusy] = useState(false)

  const [userId, setUserId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedUserIdNum = useMemo(() => (userId === '' ? null : Number(userId)), [userId])

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setUsers([])

    setUserId(isEdit ? String(item.user_id ?? '') : '')
    setCompanyName(isEdit ? String(item.company_name ?? '') : '')
    setCompanyAddress(isEdit ? String(item.company_address ?? '') : '')

    let cancelled = false
    async function loadUsers() {
      setUsersBusy(true)
      try {
        const all = await apiFetch('/users', { token })
        const list = Array.isArray(all) ? all : []
        const employersOnly = list.filter((u) => normalizeRole(u.role) === 'employer')
        if (!cancelled) setUsers(employersOnly)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load users.')
      } finally {
        if (!cancelled) setUsersBusy(false)
      }
    }
    void loadUsers()
    return () => {
      cancelled = true
    }
  }, [open, isEdit, item, token])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedUserIdNum) {
      setError('Please select a user (role: employer).')
      return
    }
    if (!String(companyName).trim()) {
      setError('Company name is required.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        user_id: selectedUserIdNum,
        company_name: String(companyName).trim(),
        company_address: String(companyAddress || '').trim(),
      }

      if (isEdit) {
        await apiFetch(`/employers/${item.employer_id}`, { method: 'PATCH', token, jsonBody: payload })
      } else {
        await apiFetch('/employers', { method: 'POST', token, jsonBody: payload })
      }

      toastSuccess(isEdit ? 'Employer updated.' : 'Employer created.')
      onSaved?.()
      onClose?.()
    } catch (err) {
      const msg = err?.message || 'Save failed.'
      setError(msg)
      toastError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={(e) => e.stopPropagation()}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">{isEdit ? 'Edit employer' : 'Add employer'}</h2>
          <button type="button" className="adminModalClose" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <form className="adminModalBody" onSubmit={handleSubmit}>
          {error ? (
            <div className="toast error" style={{ position: 'static', marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          <div className="adminModalList">
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Employer user</span>
              <select
                className="adminMgmtSelect"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={usersBusy || busy}
                required
              >
                <option value="">{usersBusy ? 'Loading users…' : 'Select user'}</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Company name</span>
              <input
                className="adminMgmtSearchInput"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={busy}
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Company address</span>
              <textarea
                className="adminMgmtSearchInput"
                rows={4}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <div className="adminModalFooter adminModalFooter--solo">
            <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btnGreen btnSm" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

