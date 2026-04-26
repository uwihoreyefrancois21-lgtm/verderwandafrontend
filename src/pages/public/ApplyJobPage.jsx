import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import TermsModal from '../../components/TermsModal'
import { useToast } from '../../context/ToastContext.jsx'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'

const EXPERIENCE_YEARS_MIN = 0
const MSG_ALREADY_APPLIED = 'You have already applied for this job.'
const APPLY_STEP_LABELS = {
  basics: 'Your details',
  skills: 'Skills',
  files: 'Documents',
  terms: 'Review',
}

const EDUCATION_OPTIONS = [
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Bachelor', label: 'Bachelor' },
  { value: 'Master', label: 'Master' },
  { value: 'PhD', label: 'PhD' },
]

export default function ApplyJobPage() {
  const { token, me, role, loading: authLoading } = useAuth()
  const { success: toastSuccess } = useToast()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [jobs, setJobs] = useState([])
  const [jobSeekers, setJobSeekers] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [terms, setTerms] = useState([])
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const [apply, setApply] = useState({
    cover_message: '',
    cv_file: null,
    education_level: '',
    experience_years: '',
    diploma_file: null, // optional
    term_id: '',
  })

  const [applyContact, setApplyContact] = useState({
    full_name: '',
    phone: '',
    email: '',
  })

  const [stepIndex, setStepIndex] = useState(0)

  /** Where to send the user after sign-in (same apply flow, public vs dashboard shell). */
  const returnAfterAuthPath = useMemo(() => {
    if (!jobId) return '/jobs'
    return location.pathname.startsWith('/dashboard/jobseeker/apply')
      ? `/dashboard/jobseeker/apply/${jobId}`
      : `/jobs/${jobId}/apply`
  }, [jobId, location.pathname])

  useEffect(() => {
    let cancelled = false
    async function loadJobs() {
      try {
        const res = await apiFetch('/jobs')
        if (!cancelled) setJobs(Array.isArray(res) ? res : [])
      } catch {
        if (!cancelled) setJobs([])
      }
    }
    void loadJobs()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadTerms() {
      try {
        const res = await apiFetch('/terms-conditions/active?applies_to=jobseeker')
        if (!cancelled) setTerms(Array.isArray(res) ? res : [])
      } catch {
        if (!cancelled) setTerms([])
      }
    }
    void loadTerms()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadProfiles() {
      if (!token) return
      try {
        const jsRes = await apiFetch('/job-seekers')
        if (!cancelled) setJobSeekers(Array.isArray(jsRes) ? jsRes : [])
      } catch {
        // ignore
      }
    }
    void loadProfiles()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadApplications() {
      if (!token || role !== 'job_seeker') return
      try {
        const res = await apiFetch('/job-applications', { token })
        if (!cancelled) setMyApplications(Array.isArray(res) ? res : [])
      } catch {
        if (!cancelled) setMyApplications([])
      }
    }
    void loadApplications()
    return () => {
      cancelled = true
    }
  }, [token, role])

  const alreadyApplied = useMemo(() => {
    if (!jobId) return false
    return myApplications.some((a) => String(a.job_id) === String(jobId))
  }, [myApplications, jobId])

  const selectedJob = useMemo(() => {
    return jobs.find((j) => String(j.job_id) === String(jobId)) || null
  }, [jobs, jobId])

  const currentJobSeeker = useMemo(() => {
    if (!me?.user_id) return null
    const found = jobSeekers.find((js) => Number(js.user_id) === Number(me.user_id))
    return found || null
  }, [jobSeekers, me])

  const stepKeys = useMemo(() => ['basics', 'skills', 'files', 'terms'], [])

  useEffect(() => {
    setApplyContact((prev) => ({
      full_name: prev.full_name || String(me?.name || '').trim(),
      phone: prev.phone || String(me?.phone || '').trim(),
      email: prev.email || String(me?.email || '').trim(),
    }))
  }, [me?.name, me?.phone, me?.email])

  useEffect(() => {
    setStepIndex((i) => Math.min(i, Math.max(0, stepKeys.length - 1)))
  }, [stepKeys.length])

  const currentStepKey = stepKeys[stepIndex] || 'basics'
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === stepKeys.length - 1

  useEffect(() => {
    if (!apply.term_id) return
    setTermsError(false)
    setStatus((prev) => {
      const t = String(prev || '').toLowerCase()
      if (t.includes('terms') && t.includes('accept')) return ''
      if (t.includes('please accept')) return ''
      return prev
    })
  }, [apply.term_id])

  async function upsertJobSeekerProfileIfNeeded() {
    if (currentJobSeeker?.jobseeker_id) return currentJobSeeker
    if (!token || role !== 'job_seeker') throw new Error('Please sign in as a Job Seeker.')
    if (!me?.user_id) throw new Error('Your account details are not loaded yet.')
    const skills = apply.cover_message.trim()
    if (!skills) throw new Error('Please add your skills.')
    if (!apply.cv_file) throw new Error('Please upload your CV.')

    const edu = apply.education_level.trim()
    const years = String(apply.experience_years ?? '').trim()
    const experienceText = [
      edu ? `Education: ${edu}` : '',
      years !== '' ? `Experience years: ${years}` : '',
    ]
      .filter(Boolean)
      .join('. ') || '—'

    const fd = new FormData()
    fd.append('user_id', String(me.user_id))
    fd.append('skills', skills)
    fd.append('experience', experienceText)
    fd.append('cv_file', apply.cv_file)
    const created = await apiFetch('/job-seekers', { method: 'POST', token, formData: fd })
    const row = created && typeof created === 'object' && !Array.isArray(created) ? created : null
    if (row?.jobseeker_id) {
      setJobSeekers((prev) => {
        const list = Array.isArray(prev) ? prev : []
        const uid = Number(me.user_id)
        const idx = list.findIndex((js) => Number(js.user_id) === uid)
        if (idx === -1) return [...list, row]
        const next = [...list]
        next[idx] = { ...next[idx], ...row }
        return next
      })
      return row
    }

    const jsRes = await apiFetch('/job-seekers')
    const nextList = Array.isArray(jsRes) ? jsRes : []
    setJobSeekers(nextList)
    const found = nextList.find((js) => Number(js.user_id) === Number(me.user_id)) || null
    if (!found?.jobseeker_id) throw new Error('Could not create Job Seeker profile.')
    return found
  }

  function validateStep(key) {
    switch (key) {
      case 'basics':
        if (!applyContact.full_name.trim()) {
          setStatus('Full name is required.')
          return false
        }
        if (!applyContact.phone.trim()) {
          setStatus('Phone is required.')
          return false
        }
        if (applyContact.phone.trim().length !== 10 || !/^\d{10}$/.test(applyContact.phone.trim())) {
          setStatus('Phone must be exactly 10 digits.')
          return false
        }
        if (!applyContact.email.trim()) {
          setStatus('Email is required.')
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applyContact.email.trim())) {
          setStatus('Please enter a valid email address.')
          return false
        }
        if (!apply.education_level.trim()) {
          setStatus('Education level is required.')
          return false
        }
        return true
      case 'skills':
        if (!apply.cover_message.trim()) {
          setStatus('Skills are required.')
          return false
        }
        if (!String(apply.experience_years).trim()) {
          setStatus('Experience years is required.')
          return false
        }
        {
          const years = Number(apply.experience_years)
          if (!Number.isInteger(years) || years < EXPERIENCE_YEARS_MIN) {
            setStatus('Experience years must be a whole number (0 or more).')
            return false
          }
        }
        return true
      case 'files':
        if (!apply.cv_file) {
          setStatus('Please upload your CV.')
          return false
        }
        return true
      case 'terms':
        return true
      default:
        return true
    }
  }

  function goNext() {
    setStatus('')
    if (!validateStep(currentStepKey)) return
    if (!isLastStep) setStepIndex((i) => Math.min(stepKeys.length - 1, i + 1))
  }

  function goBack() {
    setStatus('')
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function statusLooksSuccess(msg) {
    return /success|submitted successfully/i.test(String(msg || ''))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('')
    setTermsError(false)

    if (!jobId) return setStatus('Job not found.')
    if (!selectedJob) return setStatus('Job not loaded yet. Please try again.')
    if (role !== 'job_seeker') return setStatus('You must be a Job Seeker to apply.')
    if (alreadyApplied) return setStatus(MSG_ALREADY_APPLIED)

    if (!apply.cv_file) return setStatus('Please upload your CV.')
    if (!apply.term_id) {
      setTermsError(true)
      return setStatus('Please accept the Terms & Conditions.')
    }
    if (!validateStep('basics')) return
    if (!validateStep('skills')) return
    if (!validateStep('files')) return

    const years = Number(apply.experience_years)
    if (!Number.isInteger(years) || years < EXPERIENCE_YEARS_MIN) {
      return setStatus('Experience years must be a whole number (0 or more).')
    }

    setBusy(true)
    try {
      const jsProfile = await upsertJobSeekerProfileIfNeeded()

      const fd = new FormData()
      fd.append('job_id', String(jobId))
      fd.append('jobseeker_id', String(jsProfile.jobseeker_id))
      fd.append('cover_message', apply.cover_message)
      fd.append('education_level', apply.education_level.trim())
      fd.append('experience_years', String(years))
      if (apply.diploma_file) fd.append('diploma_file', apply.diploma_file)
      fd.append('employer_status', 'pending')
      fd.append('jobseeker_status', 'submitted')
      fd.append('cv_file', apply.cv_file)
      fd.append('term_id', apply.term_id)

      const patchContact =
        me?.user_id != null
          ? apiFetch(`/users/${me.user_id}`, {
              method: 'PATCH',
              token,
              jsonBody: {
                name: applyContact.full_name.trim(),
                phone: applyContact.phone.trim(),
                email: applyContact.email.trim(),
              },
            })
          : Promise.resolve()

      await Promise.all([patchContact, apiFetch('/job-applications', { method: 'POST', token, formData: fd })])

      toastSuccess('Application submitted successfully!')
      navigate('/dashboard/jobseeker', { replace: true })
    } catch (err) {
      setStatus(err.message || 'Failed to submit application.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    if (authLoading) {
      return (
        <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
          <div className="dashCard">
            <div className="emptyStateTitle">Loading...</div>
            <div className="emptyStateText">Preparing application form.</div>
          </div>
        </div>
      )
    }

    return (
      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please sign in as a Job Seeker to submit an application.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to={`/auth?next=${encodeURIComponent(returnAfterAuthPath)}`}>
              Sign in to apply
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (role !== 'job_seeker') {
    return (
      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Job Seeker only</div>
          <div className="emptyStateText">You must sign in as a Job Seeker to apply.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to="/auth">
              Sign in as Job Seeker
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (alreadyApplied) {
    return (
      <div className="container jobApplyPage" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="dashCard jobApplyCard">
          <div className="emptyStateTitle">Already applied</div>
          <p className="emptyStateText" style={{ marginTop: 8 }}>
            {MSG_ALREADY_APPLIED}
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link className="btn btnBlue btnSm" to="/dashboard/jobseeker">
              My applications
            </Link>
            <Link className="btn btnOutline btnSm" to="/jobs">
              Browse jobs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container jobApplyPage">
      <div className="jobApplyLayout">
        <div className="sectionHead jobApplyHead">
          <h2 className="sectionTitle">Apply for job</h2>
          <p className="sectionSubtitle">
            {selectedJob ? (
              <>
                For <b>{selectedJob.title}</b>
              </>
            ) : (
              'Loading job details...'
            )}
          </p>
        </div>

        <div className="dashCard jobApplyCard">
          <header className="jobApplyCardHead">
            <div>
              <div className="dashTitle jobApplyCardTitle">Application form</div>
              <p className="jobApplyCardMeta">
                Step {stepIndex + 1} of {stepKeys.length}
              </p>
            </div>
          </header>

          <ol className="jobApplyStepper" aria-label="Application progress">
            {stepKeys.map((key, i) => (
              <li
                key={key}
                className={
                  i === stepIndex
                    ? 'jobApplyStepperItem jobApplyStepperItem--active'
                    : i < stepIndex
                      ? 'jobApplyStepperItem jobApplyStepperItem--done'
                      : 'jobApplyStepperItem'
                }
              >
                <span className="jobApplyStepperDot" aria-hidden>
                  {i < stepIndex ? '✓' : i + 1}
                </span>
                <span className="jobApplyStepperLabel">{APPLY_STEP_LABELS[key] || key}</span>
              </li>
            ))}
          </ol>

        <form onSubmit={onSubmit} className="formBody jobApplyForm">
          {currentStepKey === 'basics' ? (
            <div className="dashItem applyJobSection" style={{ marginBottom: 0 }}>
              <div className="dashItemTitle">Your details</div>
              <div className="dashSubtle" style={{ marginBottom: 10 }}>
                Phone and email are shown to employers only after admin approval.
              </div>
              <div className="jobApplyFieldStack">
                <label className="field">
                  <span className="fieldLabel">Full name</span>
                  <input
                    className="fieldInput"
                    value={applyContact.full_name}
                    onChange={(e) => setApplyContact((c) => ({ ...c, full_name: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="fieldLabel">Phone</span>
                  <input className="fieldInput" type="tel" pattern="[0-9]{10}" maxLength="10" placeholder="Enter 10-digit phone number" value={applyContact.phone} onChange={(e) => setApplyContact((c) => ({ ...c, phone: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="fieldLabel">Email</span>
                  <input className="fieldInput" type="email" placeholder="Enter your email address" value={applyContact.email} onChange={(e) => setApplyContact((c) => ({ ...c, email: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="fieldLabel">Education level</span>
                  <select className="fieldInput" value={apply.education_level} onChange={(e) => setApply((a) => ({ ...a, education_level: e.target.value }))}>
                    <option value="" disabled>
                      Choose education level
                    </option>
                    {EDUCATION_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {currentStepKey === 'skills' ? (
            <div className="dashItem applyJobSection" style={{ marginBottom: 0 }}>
              <div className="dashItemTitle">Skills for this role or Other Skills</div>
              <div className="dashSubtle" style={{ marginBottom: 12 }}>Describe the skills you bring to this job. This is submitted with your application.</div>
              <label className="field">
                <span className="fieldLabel">Skills</span>
                <textarea className="fieldInput textarea" value={apply.cover_message} onChange={(e) => setApply((a) => ({ ...a, cover_message: e.target.value }))} maxLength={2000} rows={6} />
              </label>
              <label className="field">
                <span className="fieldLabel">Experience years</span>
                <input
                  className="fieldInput"
                  type="number"
                  min={EXPERIENCE_YEARS_MIN}
                  step="1"
                  value={apply.experience_years}
                  onChange={(e) => setApply((a) => ({ ...a, experience_years: e.target.value }))}
                />
              </label>
            </div>
          ) : null}

          {currentStepKey === 'files' ? (
            <div className="dashItem applyJobSection" style={{ marginBottom: 0 }}>
              <div className="dashItemTitle">Documents</div>
              <div className="dashSubtle" style={{ marginBottom: 12 }}>
                Upload your CV to apply. Extra documents (for example a diploma) are <strong>not required</strong>—you can skip that field.
              </div>
              <div className="jobApplyFieldStack">
                <label className="field">
                  <span className="fieldLabel">Application CV (required)</span>
                  <input className="fieldInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setApply((a) => ({ ...a, cv_file: e.target.files?.[0] || null }))} />
                </label>

                <label className="field">
                  <span className="fieldLabel">Diploma or other document (optional — not required)</span>
                  <input className="fieldInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setApply((a) => ({ ...a, diploma_file: e.target.files?.[0] || null }))} />
                </label>
              </div>
            </div>
          ) : null}

          {currentStepKey === 'terms' ? (
            <div className={`field ${termsError ? 'fieldError' : ''}`}>
              <span className="fieldLabel">Terms & Conditions</span>
              {apply.term_id ? (
                <div className="termsAccepted">
                  <span className="textSuccess">✓ Terms accepted</span>
                  <button type="button" className="btn btnOutline btnSm" onClick={() => setShowTermsModal(true)} style={{ marginLeft: 12 }}>
                    View Terms
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btnOutline" onClick={() => setShowTermsModal(true)}>
                  Review and Accept Terms & Conditions
                </button>
              )}
            </div>
          ) : null}

          {status ? (
            <div
              className={`jobApplyStatus ${statusLooksSuccess(status) ? 'jobApplyStatus--success' : 'jobApplyStatus--error'}`}
              role="alert"
            >
              {status}
            </div>
          ) : null}

          <div className="jobApplyFormActions">
            {!isLastStep ? (
              <div className="jobApplyFormActionsRow">
                <button type="button" className="btn btnOutline jobApplyBtnSecondary" onClick={goBack} disabled={busy || isFirstStep}>
                  Back
                </button>
                <button type="button" className="btn btnBlue jobApplyBtnPrimary" onClick={goNext} disabled={busy}>
                  Next
                </button>
                <button type="button" className="btn btnOutline jobApplyBtnGhost" onClick={() => navigate('/jobs')} disabled={busy}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="jobApplyFormActionsRow">
                <button type="button" className="btn btnOutline jobApplyBtnSecondary" onClick={goBack} disabled={busy}>
                  Back
                </button>
                <button className="btn btnGreen formSubmit jobApplyFormSubmit" type="submit" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit application'}
                </button>
                <button type="button" className="btn btnOutline jobApplyBtnGhost" onClick={() => navigate('/jobs')} disabled={busy}>
                  Back to jobs
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {showTermsModal && (
        <TermsModal
          terms={terms}
          onAccept={(termId) => {
            setApply((a) => ({ ...a, term_id: String(termId) }))
            setTermsError(false)
            setStatus('')
            setShowTermsModal(false)
          }}
          onClose={() => setShowTermsModal(false)}
        />
      )}
      </div>
    </div>
  )
}

