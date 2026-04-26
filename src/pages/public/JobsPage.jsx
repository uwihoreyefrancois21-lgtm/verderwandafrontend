import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'

function stripAndTruncate(text, max = 100) {
  if (!text) return ''
  const plain = String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max).trim()}…`
}

const PENDING_APPLY_KEY = 'verde_pending_apply_job'
const PROFILE_FIELD_LIMITS = { skills: 600, experience: 1000 }
const EXPERIENCE_YEARS_MIN = 0
const EDUCATION_OPTIONS = [
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Bachelor', label: 'Bachelor' },
  { value: 'Master', label: 'Master' },
  { value: 'PhD', label: 'PhD' },
]

export default function JobsPage() {
  const { token, me, role, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [categories, setCategories] = useState([])
  const [jobSearch, setJobSearch] = useState('')
  const [jobSeekers, setJobSeekers] = useState([])

  const [apply, setApply] = useState({
    job_id: '',
    cover_message: '',
    cv_file: null,
    education_level: '',
    experience_years: '',
    diploma_file: null,
    agree: true,
  })
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [profileForm, setProfileForm] = useState({
    skills: '',
    experience: '',
    cv_file: null,
  })

  const [applyContact, setApplyContact] = useState({
    phone: '',
    email: '',
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [jobsRes, catRes] = await Promise.all([
          apiFetch('/jobs'),
          apiFetch('/job-categories').catch(() => []),
        ])
        if (!cancelled) {
          setJobs(Array.isArray(jobsRes) ? jobsRes : [])
          setCategories(Array.isArray(catRes) ? catRes : [])
        }
      } catch {
        if (!cancelled) setJobs([])
      }
    }
    void load()
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

  const currentJobSeeker = useMemo(() => {
    if (!me?.user_id) return null
    const found = jobSeekers.find((js) => Number(js.user_id) === Number(me.user_id))
    return found || null
  }, [jobSeekers, me])

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      skills: currentJobSeeker?.skills || '',
      experience: currentJobSeeker?.experience || '',
      cv_file: null,
    }))
  }, [currentJobSeeker?.jobseeker_id, currentJobSeeker?.skills, currentJobSeeker?.experience])

  useEffect(() => {
    if (!applyModalOpen) return
    setApplyContact({
      phone: me?.phone || '',
      email: me?.email || '',
    })
  }, [applyModalOpen, me?.phone, me?.email])

  const selectedJob = useMemo(() => jobs.find((j) => String(j.job_id) === String(apply.job_id)) || null, [jobs, apply.job_id])

  function isJobOpen(j) {
    return getJobDisplayStatus(j) === 'open'
  }

  function getJobDisplayStatus(j) {
    const s = String(j?.status || '').trim().toLowerCase()
    // Explicit employer/admin decisions should be preserved on the public jobs page.
    if (s === 'taken') return 'taken'
    if (s === 'closed') return 'closed'
    if (s && s !== 'open' && s !== 'available') return 'closed'

    if (j?.application_deadline) {
      const deadline = new Date(j.application_deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (deadline < today) return 'expired'
    }
    return 'open'
  }

  function formatDate(v) {
    const raw = v ? String(v) : ''
    if (!raw) return '—'
    if (raw.length >= 10) return raw.slice(0, 10)
    return raw
  }

  function getDeadlineDisplay(deadline) {
    if (!deadline || deadline === 'null' || deadline === 'undefined') return <span className="deadlineText">No deadline</span>;
    const d = new Date(deadline)
    if (isNaN(d.getTime())) return <span className="deadlineText">No deadline</span>;
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isExpired = d < today
    return (
      <span className={`deadlineText ${isExpired ? 'expired' : 'active'}`}>
        {formatDate(deadline)}
        {isExpired && ' (Expired)'}
      </span>
    )
  }

  async function upsertJobSeekerProfileIfNeeded() {
    if (currentJobSeeker?.jobseeker_id) return currentJobSeeker
    if (!token || role !== 'job_seeker') throw new Error('Please sign in as a Job Seeker.')
    if (!me?.user_id) throw new Error('Your account details are not loaded yet.')
    if (!profileForm.skills.trim()) throw new Error('Please add your skills.')
    if (!profileForm.experience.trim()) throw new Error('Please add your experience.')
    if (!profileForm.cv_file) throw new Error('Please upload your CV to create your Job Seeker profile.')

    const fd = new FormData()
    fd.append('user_id', String(me.user_id))
    fd.append('skills', profileForm.skills.trim())
    fd.append('experience', profileForm.experience.trim())
    fd.append('cv_file', profileForm.cv_file)
    await apiFetch('/job-seekers', { method: 'POST', token, formData: fd })

    const jsRes = await apiFetch('/job-seekers')
    const nextList = Array.isArray(jsRes) ? jsRes : []
    setJobSeekers(nextList)
    const found = nextList.find((js) => Number(js.user_id) === Number(me.user_id)) || null
    if (!found?.jobseeker_id) throw new Error('Could not create Job Seeker profile.')
    return found
  }

  function onApplyClick(j, open) {
    setStatus('')
    if (!open) return
    const nextPath = `/jobs/${j.job_id}/apply`
    const next = encodeURIComponent(nextPath)
    if (!token || role !== 'job_seeker') {
      navigate(`/auth?next=${next}`)
      return
    }
    navigate(nextPath)
  }

  async function onApply(e) {
    e.preventDefault()
    setStatus('')
    if (!apply.job_id) return setStatus('Select a job.')
    if (role !== 'job_seeker') return setStatus('You must be a Job Seeker to apply.')
    if (!apply.cv_file) return setStatus('Please upload your CV.')
    if (!apply.agree) return setStatus('Please accept the terms to continue.')
    if (!applyContact.phone.trim()) return setStatus('Phone is required.')
    if (!applyContact.email.trim()) return setStatus('Email is required.')
    if (!apply.education_level.trim()) return setStatus('Education level is required.')
    if (!String(apply.experience_years).trim()) return setStatus('Experience years is required.')
    const years = Number(apply.experience_years)
    if (!Number.isInteger(years) || years < EXPERIENCE_YEARS_MIN) {
      return setStatus('Experience years must be a whole number (0 or more).')
    }

    setApplyBusy(true)
    try {
      const jsProfile = await upsertJobSeekerProfileIfNeeded()
      // Update contact info on the user account (so employer can see correct phone/email).
      if (me?.user_id) {
        await apiFetch(`/users/${me.user_id}`, {
          method: 'PATCH',
          token,
          jsonBody: { phone: applyContact.phone.trim(), email: applyContact.email.trim() },
        })
      }

      const fd = new FormData()
      fd.append('job_id', apply.job_id)
      fd.append('jobseeker_id', jsProfile.jobseeker_id)
      fd.append('cover_message', apply.cover_message)
      fd.append('education_level', apply.education_level.trim())
      fd.append('experience_years', String(years))
      if (apply.diploma_file) fd.append('diploma_file', apply.diploma_file)
      fd.append('employer_status', 'pending')
      fd.append('jobseeker_status', 'submitted')
      fd.append('cv_file', apply.cv_file)

      await apiFetch('/job-applications', { method: 'POST', token, formData: fd })
      setStatus('Application submitted successfully.')
      setApply({ job_id: '', cover_message: '', cv_file: null, education_level: '', experience_years: '', diploma_file: null, agree: true })
      setApplyModalOpen(false)
    } catch (err) {
      setStatus(err.message || 'Failed to submit application.')
    } finally {
      setApplyBusy(false)
    }
  }

  function closeApplyModal() {
    setApplyModalOpen(false)
    setApply({ job_id: '', cover_message: '', cv_file: null, education_level: '', experience_years: '', diploma_file: null, agree: true })
    setStatus('')
    setProfileForm({ skills: '', experience: '', cv_file: null })
  }

  const allJobs = Array.isArray(jobs) ? jobs : []

  const categoryNameById = useMemo(() => {
    const m = new Map()
    for (const c of categories) {
      const id = c.category_id
      if (id == null) continue
      const name = String(c.category_name ?? c.name ?? '').trim()
      m.set(Number(id), name)
    }
    return m
  }, [categories])

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase()
    if (!q) return allJobs
    return allJobs.filter((j) => {
      const title = String(j.title || '').toLowerCase()
      const loc = String(j.location || '').toLowerCase()
      const cat = String(categoryNameById.get(Number(j.category_id)) || '').toLowerCase()
      const desc = stripAndTruncate(j.description, 8000).toLowerCase()
      return title.includes(q) || loc.includes(q) || cat.includes(q) || desc.includes(q)
    })
  }, [allJobs, jobSearch, categoryNameById])

  const jobStats = useMemo(() => {
    let open = 0
    let taken = 0
    let closed = 0
    for (const j of filteredJobs) {
      const st = getJobDisplayStatus(j)
      if (st === 'open') open += 1
      else if (st === 'taken') taken += 1
      else closed += 1
    }
    return { total: filteredJobs.length, open, taken, closed }
  }, [filteredJobs])

  const showApplyLoading = Boolean(applyModalOpen && token && authLoading)
  const showWrongRoleHint = Boolean(apply.job_id && token && me && !authLoading && role !== 'job_seeker')

  // After login, send user to the full apply page (step-by-step form) if a job was pending
  useEffect(() => {
    if (authLoading || !token || role !== 'job_seeker') return
    const pendingJobId = sessionStorage.getItem(PENDING_APPLY_KEY)
    if (!pendingJobId || !jobs.some((j) => String(j.job_id) === String(pendingJobId))) return
    sessionStorage.removeItem(PENDING_APPLY_KEY)
    navigate(`/jobs/${pendingJobId}/apply`)
  }, [authLoading, token, role, jobs, navigate])

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Employment Opportunities</h2>
       {/*  <p className="sectionSubtitle">Browse jobs and apply as a Job Seeker.</p> */}
      </div>

      <div className="pageSearchRow">
        <label className="field pageSearchField">
          <span className="fieldLabel">Search jobs</span>
          <input
            className="fieldInput"
            type="search"
            placeholder="Search by title, category, or location"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="dashItemMeta" style={{ marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
        <span className="statusPill blue">
          <span className="statusDot" aria-hidden="true" />
          Total: {jobStats.total}
        </span>
        <span className="statusPill green">
          <span className="statusDot" aria-hidden="true" />
          Open: {jobStats.open}
        </span>
        <span className="statusPill red">
          <span className="statusDot" aria-hidden="true" />
          Taken: {jobStats.taken}
        </span>
        <span className="statusPill">
          <span className="statusDot" aria-hidden="true" />
          Closed/Expired: {jobStats.closed}
        </span>
      </div>

      <div className="jobsGrid" style={{ marginTop: 14 }}>
        {filteredJobs.length ? (
          filteredJobs.map((j) => {
            const status = getJobDisplayStatus(j)
            const open = status === 'open'
            const chosen = String(apply.job_id) === String(j.job_id)
            const desc = stripAndTruncate(j.description)
            return (
              <div key={j.job_id} className={`jobCard ${chosen ? 'active' : ''}`} role="group" aria-label={`Job: ${j.title}`}>
                <div className="jobCardTitle">{j.title}</div>
                {desc ? (
                  <p className="jobCardDesc">{desc}</p>
                ) : (
                  <p className="jobCardDesc jobCardDescMuted">No description provided.</p>
                )}
                <div className="jobCardMeta">
                  {categoryNameById.get(Number(j.category_id)) ? (
                    <div className="jobMetaRow">
                      <span className="jobMetaLabel">Category</span>
                      <span className="jobMetaValue">{categoryNameById.get(Number(j.category_id))}</span>
                    </div>
                  ) : null}
                  <div className="jobMetaRow">
                    <span className="jobMetaLabel">Location</span>
                    <span className="jobMetaValue">{j.location || '—'}</span>
                  </div>
                  <div className="jobMetaRow">
                    <span className="jobMetaLabel">Salary</span>
                    <span className="jobMetaValue">{j.salary || '—'}</span>
                  </div>
                  <div className="jobMetaRow">
                    <span className="jobMetaLabel">Posted</span>
                    <span className="jobMetaValue">{formatDate(j.created_at)}</span>
                  </div>
                  <div className="jobMetaRow">
                    <span className="jobMetaLabel">Deadline</span>
                    <span className="jobMetaValue">
                      {getDeadlineDisplay(j.application_deadline)}
                    </span>
                  </div>
                  <div className="jobMetaRow">
                    <span className="jobMetaLabel">Status</span>
                    <span className="jobMetaValue">
                      {status === 'open' ? (
                        <span className="statusPill green">
                          <span className="statusDot" aria-hidden="true" />
                          Open
                        </span>
                      ) : status === 'taken' ? (
                        <span className="statusPill red">
                          <span className="statusDot" aria-hidden="true" />
                          Taken
                        </span>
                      ) : status === 'expired' ? (
                        <span className="statusPill red">
                          <span className="statusDot" aria-hidden="true" />
                          Expired
                        </span>
                      ) : (
                        <span className="statusPill red">
                          <span className="statusDot" aria-hidden="true" />
                          Closed
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="jobCardActions">
                  <button type="button" className={`btn btnSm ${open ? 'btnBlue' : 'btnOutline'}`} disabled={!open} onClick={() => onApplyClick(j, open)}>
                    Apply Now
                  </button>
                </div>
              </div>
            )
          })
        ) : (
         <center> <div className="dashSubtle">
            {allJobs.length === 0 ? '.....Loading' : 'No jobs match your search.'}
          </div></center>
        )}
      </div>

      {showWrongRoleHint ? (
        <div className="applyRoleHint">
          <span>To apply, please sign in with a Job Seeker account.</span>
          <Link className="btn btnBlue btnSm" to="/auth?next=/jobs" onClick={() => sessionStorage.setItem(PENDING_APPLY_KEY, String(apply.job_id))}>
            Go to login
          </Link>
        </div>
      ) : null}

      {applyModalOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" onClick={closeApplyModal}>
          <div className="modalCard applyJobModal" onClick={(e) => e.stopPropagation()}>
            <div className="dashHeadRow applyJobModalHead" style={{ marginBottom: 8 }}>
              <div>
                <div className="dashTitle">Apply</div>
                <div className="dashSubtle">
                  {selectedJob ? (
                    <>
                      For <b>{selectedJob.title}</b>
                    </>
                  ) : (
                    'Selected job'
                  )}
                </div>
              </div>
              <button type="button" className="btn btnOutline btnSm" onClick={closeApplyModal}>
                Close
              </button>
            </div>

            <div className="applyJobModalBody">
              {showApplyLoading ? <div className="dashSubtle">Loading your profile…</div> : null}

              {!showApplyLoading ? (
                <form onSubmit={onApply} className="formBody applyJobSection" style={{ gap: 12 }}>
                  <div className="dashItem applyJobSection" style={{ marginBottom: 0 }}>
                    <div className="dashItemTitle">Your contact</div>
                    <div className="dashSubtle" style={{ marginBottom: 10 }}>
                      Employers can see your phone/email only after admin approval.
                    </div>
                    <div className="formRow2">
                      <label className="field">
                        <span className="fieldLabel">Phone</span>
                        <input
                          className="fieldInput"
                          value={applyContact.phone}
                          onChange={(e) => setApplyContact((c) => ({ ...c, phone: e.target.value }))}
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="fieldLabel">Email</span>
                        <input
                          className="fieldInput"
                          value={applyContact.email}
                          onChange={(e) => setApplyContact((c) => ({ ...c, email: e.target.value }))}
                          required
                        />
                      </label>
                    </div>
                  </div>

                  {!currentJobSeeker?.jobseeker_id ? (
                    <div className="dashItem applyJobSection" style={{ marginBottom: 0 }}>
                      <div className="dashItemTitle">Job Seeker profile required</div>
                      <div className="dashSubtle" style={{ marginBottom: 10 }}>
                        Add your professional details first. We will submit your application in one step.
                      </div>
                      <label className="field">
                        <span className="fieldLabel">Skills ({profileForm.skills.length}/{PROFILE_FIELD_LIMITS.skills})</span>
                        <textarea
                          className="fieldInput textarea"
                          value={profileForm.skills}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, skills: e.target.value.slice(0, PROFILE_FIELD_LIMITS.skills) }))
                          }
                          rows={3}
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="fieldLabel">Experience ({profileForm.experience.length}/{PROFILE_FIELD_LIMITS.experience})</span>
                        <textarea
                          className="fieldInput textarea"
                          value={profileForm.experience}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, experience: e.target.value.slice(0, PROFILE_FIELD_LIMITS.experience) }))
                          }
                          rows={3}
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="fieldLabel">Profile CV (required for first setup)</span>
                        <input
                          className="fieldInput"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => setProfileForm((p) => ({ ...p, cv_file: e.target.files?.[0] || null }))}
                        />
                      </label>
                    </div>
                  ) : null}

                  <label className="field">
                    <span className="fieldLabel">
                      Experience years
                    </span>
                    <input
                      className="fieldInput"
                      type="number"
                      min={EXPERIENCE_YEARS_MIN}
                      step="1"
                      value={apply.experience_years}
                      onChange={(e) => setApply((a) => ({ ...a, experience_years: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Diploma file (optional)</span>
                    <input
                      className="fieldInput"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setApply((a) => ({ ...a, diploma_file: e.target.files?.[0] || null }))}
                    />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Education level</span>
                    <select
                      className="fieldInput"
                      value={apply.education_level}
                      onChange={(e) => setApply((a) => ({ ...a, education_level: e.target.value }))}
                      required
                    >
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

                  <label className="field">
                    <span className="fieldLabel">Skills</span>
                    <textarea
                      className="fieldInput textarea"
                      value={apply.cover_message}
                      onChange={(e) => setApply((a) => ({ ...a, cover_message: e.target.value }))}
                      required
                      maxLength={2000}
                      rows={4}
                    />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Application CV file</span>
                    <input
                      className="fieldInput"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setApply((a) => ({ ...a, cv_file: e.target.files?.[0] || null }))}
                      required
                    />
                  </label>

                  <label className="checkRow">
                    <input type="checkbox" checked={Boolean(apply.agree)} onChange={(e) => setApply((a) => ({ ...a, agree: e.target.checked }))} />
                    <span>I accept the terms and conditions.</span>
                  </label>

                  {status ? (
                    <div
                      className={`toast ${status.toLowerCase().includes('fail') ? 'error' : 'success'}`}
                      style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}
                    >
                      {status}
                    </div>
                  ) : null}

                  <div className="applyJobActionBar">
                    <button className="btn btnGreen formSubmit applyJobWideBtn" type="submit" disabled={applyBusy}>
                      {applyBusy ? 'Submitting…' : 'Submit application'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
