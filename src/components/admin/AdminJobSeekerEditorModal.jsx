import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

function normalizeRole(r) {
  const v = String(r || '').trim().toLowerCase()
  if (v === 'job_seeker' || v === 'jobseeker' || v === 'job-seeker') return 'job_seeker'
  return v
}

export default function AdminJobSeekerEditorModal({ open, mode, item, token, onClose, onSaved }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const isEdit = mode === 'edit' && item

  const [users, setUsers] = useState([])
  const [usersBusy, setUsersBusy] = useState(false)

  const [userId, setUserId] = useState('')
  const [skills, setSkills] = useState('')
  const [experience, setExperience] = useState('')
  const [cvFile, setCvFile] = useState(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedUserIdNum = useMemo(() => (userId === '' ? null : Number(userId)), [userId])

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setUsers([])
    setCvFile(null)

    setUserId(isEdit ? String(item.user_id ?? '') : '')
    setSkills(isEdit ? String(item.skills ?? '') : '')
    setExperience(isEdit ? String(item.experience ?? '') : '')

    let cancelled = false
    async function loadUsers() {
      setUsersBusy(true)
      try {
        const all = await apiFetch('/users', { token })
        const list = Array.isArray(all) ? all : []
        const seekersOnly = list.filter((u) => normalizeRole(u.role) === 'job_seeker')
        if (!cancelled) setUsers(seekersOnly)
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
      setError('Please select a user (role: job_seeker).')
      return
    }
    if (!String(skills || '').trim()) {
      setError('Skills are required.')
      return
    }
    if (!String(experience || '').trim()) {
      setError('Experience is required.')
      return
    }
    if (!isEdit && !(cvFile instanceof File)) {
      setError('CV file is required.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('user_id', String(selectedUserIdNum))
      fd.append('skills', String(skills))
      fd.append('experience', String(experience))
      if (cvFile instanceof File) fd.append('cv_file', cvFile)

      if (isEdit) {
        await apiFetch(`/job-seekers/${item.jobseeker_id}`, { method: 'PATCH', token, formData: fd })
      } else {
        await apiFetch('/job-seekers', { method: 'POST', token, formData: fd })
      }

      toastSuccess(isEdit ? 'Job seeker updated.' : 'Job seeker created.')
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
          <h2 className="adminModalTitle">{isEdit ? 'Edit job seeker' : 'Add job seeker'}</h2>
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
              <span className="adminModalDt">Job seeker user</span>
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
              <span className="adminModalDt">Skills</span>
              <textarea
                className="adminMgmtSearchInput"
                rows={4}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                required
                disabled={busy}
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Experience</span>
              <textarea
                className="adminMgmtSearchInput"
                rows={4}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
                disabled={busy}
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">CV file {isEdit ? '(optional)' : '*'}</span>
              <div>
                <input
                  type="file"
                  className="adminMgmtSearchInput"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  disabled={busy}
                />
              </div>
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

