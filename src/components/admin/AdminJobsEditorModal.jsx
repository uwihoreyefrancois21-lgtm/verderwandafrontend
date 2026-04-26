import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

function requiredTrim(v) {
  return String(v || '').trim()
}

export default function AdminJobsEditorModal({ open, mode, item, token, onClose, onSaved }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const isEdit = mode === 'edit' && item

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [employers, setEmployers] = useState([])
  const [categories, setCategories] = useState([])

  const [jobsLoaded, setJobsLoaded] = useState(false)

  const [employerId, setEmployerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [salary, setSalary] = useState('')
  const [status, setStatus] = useState('open')
  const [termsAccepted, setTermsAccepted] = useState(true)

  const employerIdNum = useMemo(() => (employerId === '' ? null : Number(employerId)), [employerId])
  const categoryIdNum = useMemo(() => (categoryId === '' ? null : Number(categoryId)), [categoryId])

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setError('')
    setJobsLoaded(false)

    setEmployers([])
    setCategories([])

    setEmployerId(isEdit ? String(item?.employer_id ?? '') : '')
    setCategoryId(isEdit ? String(item?.category_id ?? '') : '')
    setTitle(isEdit ? String(item?.title ?? '') : '')
    setDescription(isEdit ? String(item?.description ?? '') : '')
    setLocation(isEdit ? String(item?.location ?? '') : '')
    setSalary(isEdit ? String(item?.salary ?? '') : '')
    setStatus(isEdit ? String(item?.status ?? 'open') : 'open')
    setTermsAccepted(Boolean(item?.terms_accepted ?? true))

    let cancelled = false
    async function load() {
      try {
        const [empRes, catRes] = await Promise.all([apiFetch('/employers', { token }), apiFetch('/job-categories', { token })])
        if (cancelled) return
        setEmployers(Array.isArray(empRes) ? empRes : [])
        setCategories(Array.isArray(catRes) ? catRes : [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load dropdown data.')
      } finally {
        if (!cancelled) setJobsLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, isEdit, item, token])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!employerIdNum) return setError('Please select an employer.')
    if (!categoryIdNum) return setError('Please select a job category.')

    const tTitle = requiredTrim(title)
    const tDesc = requiredTrim(description)
    const tLoc = requiredTrim(location)
    const tSalary = requiredTrim(salary)

    if (!tTitle) return setError('Title is required.')
    if (!tDesc) return setError('Description is required.')
    if (!tLoc) return setError('Location is required.')
    if (!tSalary) return setError('Salary is required.')

    setBusy(true)
    try {
      const payload = {
        employer_id: employerIdNum,
        category_id: categoryIdNum,
        title: tTitle,
        description: tDesc,
        location: tLoc,
        salary: tSalary,
        status: String(status || 'open'),
        terms_accepted: Boolean(termsAccepted),
      }

      if (isEdit) {
        await apiFetch(`/jobs/${item.job_id}`, { method: 'PATCH', token, jsonBody: payload })
      } else {
        await apiFetch('/jobs', { method: 'POST', token, jsonBody: payload })
      }

      toastSuccess(isEdit ? 'Job updated.' : 'Job created.')
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
          <h2 className="adminModalTitle">{isEdit ? 'Edit job' : 'Add job'}</h2>
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
              <span className="adminModalDt">Employer</span>
              <select
                className="adminMgmtSelect"
                value={employerId}
                onChange={(e) => setEmployerId(e.target.value)}
                disabled={!jobsLoaded || busy}
                required
              >
                <option value="">{!jobsLoaded ? 'Loading…' : 'Select employer'}</option>
                {employers.map((u) => (
                  <option key={u.employer_id} value={u.employer_id}>
                    {u.company_name || u.employer_id}
                  </option>
                ))}
              </select>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Category</span>
              <select
                className="adminMgmtSelect"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={!jobsLoaded || busy}
                required
              >
                <option value="">{!jobsLoaded ? 'Loading…' : 'Select category'}</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name || c.category_id}
                  </option>
                ))}
              </select>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Title</span>
              <input className="adminMgmtSearchInput" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Description</span>
              <textarea className="adminMgmtSearchInput" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Location</span>
              <input className="adminMgmtSearchInput" value={location} onChange={(e) => setLocation(e.target.value)} required disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Salary</span>
              <input className="adminMgmtSearchInput" value={salary} onChange={(e) => setSalary(e.target.value)} required disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Status</span>
              <input className="adminMgmtSearchInput" value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field" style={{ alignItems: 'center' }}>
              <span className="adminModalDt">Terms accepted</span>
              <input type="checkbox" checked={Boolean(termsAccepted)} onChange={(e) => setTermsAccepted(e.target.checked)} disabled={busy} />
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

