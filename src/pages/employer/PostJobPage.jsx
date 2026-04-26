import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TermsModal from '../../components/TermsModal'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'

const JOB_FIELD_LIMITS = { title: 120, description: 800, location: 120, salary: 80 }

export default function PostJobPage() {
  const { jobId } = useParams()
  const isEdit = Boolean(jobId && String(jobId).trim() !== '')
  const { token, me, role } = useAuth()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [categories, setCategories] = useState([])
  const [employers, setEmployers] = useState([])
  const [status, setStatus] = useState('')
  const [terms, setTerms] = useState([])
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const currentEmployer = useMemo(() => {
    if (!me?.user_id) return null
    const found = employers.find((e) => Number(e.user_id) === Number(me.user_id))
    return found || null
  }, [employers, me])

  const [form, setForm] = useState({
    category_id: '',
    title: '',
    description: '',
    location: '',
    salary: '',
    term_id: '',
    application_deadline: '',
    status: 'open',
  })

  useEffect(() => {
    if (!token) {
      const next = isEdit ? encodeURIComponent(`/employer/jobs/${jobId}/edit`) : '%2Femployer%2Fpost-job'
      navigate(`/auth?next=${next}`, { replace: true })
    }
  }, [token, navigate, isEdit, jobId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [catRes, empRes, termsRes] = await Promise.all([
          apiFetch('/job-categories'),
          apiFetch('/employers'),
          apiFetch('/terms-conditions/active?applies_to=employer')
        ])
        if (cancelled) return
        setCategories(Array.isArray(catRes) ? catRes : [])
        setEmployers(Array.isArray(empRes) ? empRes : [])
        setTerms(Array.isArray(termsRes) ? termsRes : [])
      } catch {
        // ignore
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!form.term_id) return
    setTermsError(false)
    setStatus((prev) => {
      const t = String(prev || '').toLowerCase()
      if (t.includes('terms') && t.includes('required')) return ''
      return prev
    })
  }, [form.term_id])

  useEffect(() => {
    if (!isEdit || !token || role !== 'employer' || !me?.user_id) return
    let cancelled = false
    async function loadJob() {
      setLoadError('')
      setBusy(true)
      try {
        const [job, emList] = await Promise.all([apiFetch(`/jobs/${jobId}`, { token }), apiFetch('/employers')])
        if (cancelled) return
        const emp = (Array.isArray(emList) ? emList : []).find((e) => Number(e.user_id) === Number(me.user_id))
        if (!emp?.employer_id || Number(job.employer_id) !== Number(emp.employer_id)) {
          setLoadError('You can only edit your own job posts.')
          return
        }
        setForm({
          category_id: job.category_id != null ? String(job.category_id) : '',
          title: job.title || '',
          description: job.description || '',
          location: job.location || '',
          salary: job.salary || '',
          term_id: job.term_id != null ? String(job.term_id) : '',
          application_deadline: job.application_deadline || '',
          status: String(job.status || 'open').toLowerCase() === 'taken' ? 'taken' : 'open',
        })
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load job.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    void loadJob()
    return () => {
      cancelled = true
    }
  }, [isEdit, jobId, token, role, me?.user_id])

  async function ensureEmployerProfile() {
    if (currentEmployer?.employer_id) return currentEmployer
    if (!token || !me?.user_id) return null

    // Auto-create a minimal employer profile so first-time employers can post jobs immediately.
    const fallbackName =
      (typeof me?.name === 'string' && me.name.trim()) ||
      (typeof me?.email === 'string' && me.email.includes('@') ? `${me.email.split('@')[0]} Company` : 'My Company')
    const payload = {
      user_id: me.user_id,
      company_name: fallbackName,
      company_address: (typeof me?.phone === 'string' && me.phone.trim()) || 'Kigali, Rwanda',
    }

    try {
      const created = await apiFetch('/employers', { method: 'POST', token, jsonBody: payload })
      const nextList = [...employers, created].filter(Boolean)
      setEmployers(nextList)
      return created
    } catch {
      // Maybe it already exists but the list was stale; reload once.
      const reloaded = await apiFetch('/employers')
      const nextList = Array.isArray(reloaded) ? reloaded : []
      setEmployers(nextList)
      const found = nextList.find((e) => Number(e.user_id) === Number(me.user_id))
      return found || null
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('')
    setTermsError(false)
    if (role !== 'employer') return setStatus('Only Employer can post jobs.')
    if (!token) return setStatus('Please login.')
    if (!form.category_id) return setStatus('Select a job category.')
    if (!form.term_id) {
      setTermsError(true)
      return setStatus('Please accept the Terms & Conditions.')
    }

    setBusy(true)
    try {
      const employer = await ensureEmployerProfile()
      if (!employer?.employer_id) {
        setStatus('Employer profile not found. Please complete employer account setup first.')
        return
      }
      if (isEdit) {
        await apiFetch(`/jobs/${jobId}`, {
          method: 'PATCH',
          token,
          jsonBody: {
            category_id: form.category_id,
            title: form.title,
            description: form.description,
            location: form.location,
            salary: form.salary,
            status: form.status,
            term_id: form.term_id,
            application_deadline: form.application_deadline || null,
          },
        })
        setStatus('Job updated successfully.')
        return
      }
      await apiFetch('/jobs', {
        method: 'POST',
        token,
        jsonBody: {
          employer_id: employer.employer_id,
          category_id: form.category_id,
          title: form.title,
          description: form.description,
          location: form.location,
          salary: form.salary,
          status: 'open',
          term_id: form.term_id,
          application_deadline: form.application_deadline || null,
        },
      })
      setStatus('Job posted successfully.')
      setForm({ category_id: '', title: '', description: '', location: '', salary: '', term_id: '', application_deadline: '', status: 'open' })
    } catch (err) {
      setStatus(err.message || (isEdit ? 'Failed to update job.' : 'Failed to post job.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">{isEdit ? 'Edit job post' : 'Post a Job'}</h2>
        <p className="sectionSubtitle">
          {isEdit ? 'Update title, description, location and salary for this listing.' : 'Employers can post jobs in the construction and water sector.'}
        </p>
        {isEdit ? (
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnOutline btnSm" to="/dashboard/employer/job-posts">
              Back to my job posts
            </Link>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div className="dashCard" style={{ marginTop: 12 }}>
          <div className="emptyStateTitle">Cannot edit this job</div>
          <div className="emptyStateText">{loadError}</div>
          <Link className="btn btnBlue btnSm" style={{ marginTop: 12 }} to="/dashboard/employer/job-posts">
            Return to my job posts
          </Link>
        </div>
      ) : null}

      {role === 'employer' && token && (!isEdit || !loadError) ? (
        <div className="dashGrid2" style={{ marginTop: 12 }}>
          <div className="dashCard">
            <form onSubmit={onSubmit} className="formBody postJobForm">
              <div className="formRow2">
                <label className="field">
                  <span className="fieldLabel">Job category</span>
                  <select className="fieldInput" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} required>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="fieldLabel">Location</span>
                  <input
                    className="fieldInput"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value.slice(0, JOB_FIELD_LIMITS.location) }))}
                    required
                    maxLength={JOB_FIELD_LIMITS.location}
                  />
                </label>
              </div>

              <label className="field">
                <span className="fieldLabel">Title ({form.title.length}/{JOB_FIELD_LIMITS.title})</span>
                <input
                  className="fieldInput"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, JOB_FIELD_LIMITS.title) }))}
                  required
                  maxLength={JOB_FIELD_LIMITS.title}
                />
              </label>

              <label className="field">
                <span className="fieldLabel">Description ({form.description.length}/{JOB_FIELD_LIMITS.description})</span>
                <textarea
                  className="fieldInput textarea"
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, JOB_FIELD_LIMITS.description) }))}
                  required
                  maxLength={JOB_FIELD_LIMITS.description}
                />
              </label>

              <label className="field">
                <span className="fieldLabel">Salary ({form.salary.length}/{JOB_FIELD_LIMITS.salary})</span>
                <input
                  className="fieldInput"
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value.slice(0, JOB_FIELD_LIMITS.salary) }))}
                  maxLength={JOB_FIELD_LIMITS.salary}
                />
              </label>

              <label className="field">
                <span className="fieldLabel">Application Deadline (optional)</span>
                <input
                  className="fieldInput"
                  type="date"
                  value={form.application_deadline}
                  onChange={(e) => setForm((f) => ({ ...f, application_deadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </label>

              {isEdit ? (
                <label className="field">
                  <span className="fieldLabel">Job status</span>
                  <select
                    className="fieldInput"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="open">Open</option>
                    <option value="taken">Taken</option>
                  </select>
                </label>
              ) : null}

              <div className="field">
                <span className="fieldLabel">Terms & Conditions <span style={{ color: 'red' }}>*</span></span>
                {form.term_id ? (
                  <div className="termsAccepted">
                    <span className="textSuccess">✓ Terms accepted</span>
                    <button type="button" className="btn btnOutline btnSm" onClick={() => setShowTermsModal(true)} style={{ marginLeft: 12 }}>
                      View Terms
                    </button>
                  </div>
                ) : (
                  <div>
                    <button type="button" className="btn btnOutline" onClick={() => setShowTermsModal(true)} style={{ marginBottom: 8 }}>
                      Review and Accept Terms & Conditions
                    </button>
                    {termsError ? (
                      <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: 500 }}>
                        Terms & Conditions acceptance is required to post a job
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {status ? (
                <div className={`toast ${status.toLowerCase().includes('fail') ? 'error' : 'success'}`} style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}>
                  {status}
                </div>
              ) : null}

              <button className="btn btnGreen formSubmit" type="submit" disabled={busy || (isEdit && !form.title) || !form.term_id}>
                {busy ? (isEdit ? 'Saving...' : 'Posting...') : isEdit ? 'Save changes' : 'Post job'}
              </button>
            </form>
          </div>

          <div className="dashCard">
            <div className="dashTitle">Employer account</div>
            <div className="dashSubtle" style={{ marginTop: 6 }}>
              {currentEmployer
                ? 'Employer profile linked to your account is ready.'
                : 'No employer profile yet. It will be created automatically the first time you post a job.'}
            </div>
            <div className="dashList" style={{ marginTop: 12 }}>
              <div className="dashItem">
                <div className="dashItemTitle">Approval flow</div>
                <div className="dashSubtle">Admin reviews job approvals and applicant contact visibility.</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashCard" style={{ marginTop: 12 }}>
          <div className="emptyStateTitle">Employer only</div>
          <div className="emptyStateText">Login as an Employer to post jobs.</div>
          <div className="hintText">
            Use the top-right login button on the page.
          </div>
        </div>
      )}

      {showTermsModal && (
        <TermsModal
          terms={terms}
          onAccept={(termId) => {
            setForm((f) => ({ ...f, term_id: String(termId) }))
            setTermsError(false)
            setStatus('')
            setShowTermsModal(false)
          }}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  )
}

