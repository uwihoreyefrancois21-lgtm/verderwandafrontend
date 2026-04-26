import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubmitJobPaymentModal from '../../components/payments/SubmitJobPaymentModal.jsx'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'
import { normalizeAnyStatus } from './employerDashboardHelpers'

export default function EmployerMyJobPostsPage() {
  const { token, role, me } = useAuth()
  const [busy, setBusy] = useState(false)
  const [jobs, setJobs] = useState([])
  const [employers, setEmployers] = useState([])
  const [payments, setPayments] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [payOpen, setPayOpen] = useState(false)
  const [payJobId, setPayJobId] = useState(null)
  const [payJobTitle, setPayJobTitle] = useState('')

  const canAccess = role === 'employer'
  const itemsPerPage = 4

  async function refresh() {
    setBusy(true)
    try {
      const [empRes, jobsRes, payRes] = await Promise.all([apiFetch('/employers'), apiFetch('/jobs'), apiFetch('/job-payments', { token })])
      setEmployers(Array.isArray(empRes) ? empRes : [])
      setJobs(Array.isArray(jobsRes) ? jobsRes : [])
      setPayments(Array.isArray(payRes) ? payRes : [])
      setCurrentPage(1)
    } finally {
      setBusy(false)
    }
  }

  async function toggleJobStatus(job, nextStatus) {
    await apiFetch(`/jobs/${job.job_id}`, {
      method: 'PATCH',
      token,
      jsonBody: { status: nextStatus },
    })
    await refresh()
  }

  useEffect(() => {
    if (!token || !canAccess) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canAccess])

  const currentEmployer = useMemo(() => {
    if (!me?.user_id) return null
    return employers.find((e) => Number(e.user_id) === Number(me.user_id)) || null
  }, [employers, me?.user_id])

  const myJobs = useMemo(() => {
    const eid = currentEmployer?.employer_id
    if (eid == null) return []
    return jobs.filter((j) => Number(j.employer_id) === Number(eid))
  }, [jobs, currentEmployer?.employer_id])

  function parseSalaryAmount(rawSalary) {
    const s = String(rawSalary || '').toLowerCase().replace(/,/g, '').trim()
    if (!s) return null
    const kMatch = s.match(/(\d+(?:\.\d+)?)\s*k/)
    if (kMatch?.[1]) return Number(kMatch[1]) * 1000
    const numMatch = s.match(/(\d+(?:\.\d+)?)/)
    if (numMatch?.[1]) return Number(numMatch[1])
    return null
  }

  function computeServiceFee(salary) {
    if (!Number.isFinite(salary) || salary <= 0) return { amount: 8000, label: '8,000 RWF' }
    if (salary <= 49000) return { amount: 8000, label: '8,000 RWF' }
    if (salary <= 79000) return { amount: 12000, label: '12,000 RWF' }
    if (salary <= 119000) return { amount: 15000, label: '15,000 RWF' }
    if (salary <= 200000) return { amount: 18000, label: '18,000 RWF' }
    return { amount: Math.round(salary * 0.15), label: '15% of salary' }
  }

  const latestPaymentByJobId = useMemo(() => {
    const map = new Map()
    for (const p of payments) {
      const jobId = Number(p?.job_id)
      if (!Number.isInteger(jobId) || jobId <= 0) continue
      const prev = map.get(jobId)
      const prevTs = prev ? new Date(prev.created_at || 0).getTime() : 0
      const curTs = new Date(p?.created_at || 0).getTime()
      if (!prev || curTs >= prevTs) map.set(jobId, p)
    }
    return map
  }, [payments])

  const payStats = useMemo(() => {
    let paid = 0
    let pending = 0
    let unpaid = 0
    for (const j of myJobs) {
      const p = latestPaymentByJobId.get(Number(j.job_id))
      const s = normalizeAnyStatus(p?.status)
      if (s === 'paid') paid += 1
      else if (s === 'pending') pending += 1
      else unpaid += 1
    }
    return { paid, pending, unpaid }
  }, [myJobs, latestPaymentByJobId])

  const totalPages = Math.max(1, Math.ceil(myJobs.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return myJobs.slice(startIndex, startIndex + itemsPerPage)
  }, [myJobs, currentPage, itemsPerPage])

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please login as Employer.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to="/auth?next=%2Fdashboard%2Femployer%2Fjob-posts">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Employer only</div>
          <div className="emptyStateText">Your role is not Employer.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">My job posts</h2>
        <p className="sectionSubtitle">Edit listings you own. {currentEmployer?.company_name ? `Company: ${currentEmployer.company_name}` : ''}</p>
        <div className="dashItemMeta" style={{ marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
          <span className="statusPill green"><span className="statusDot" aria-hidden="true" />Paid: {payStats.paid}</span>
          <span className="statusPill blue"><span className="statusDot" aria-hidden="true" />Pending: {payStats.pending}</span>
          <span className="statusPill red"><span className="statusDot" aria-hidden="true" />Unpaid: {payStats.unpaid}</span>
        </div>
        <div className="dashActions" style={{ marginTop: 12 }}>
          <Link className="btn btnOutline btnSm" to="/dashboard/employer">
            Back to overview
          </Link>
          <Link className="btn btnGreen btnSm" to="/employer/post-job">
            Post new job
          </Link>
          <button className="btn btnOutline btnSm" type="button" onClick={() => void refresh()} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dashCard" style={{ marginTop: 12 }}>
        <div className="employerJobPostsGrid">
          {paginatedJobs.map((job) => (
            <div key={job.job_id} className="employerJobPostCard">
              {(() => {
                const salaryAmount = parseSalaryAmount(job.salary)
                const fee = computeServiceFee(salaryAmount)
                const payment = latestPaymentByJobId.get(Number(job.job_id))
                const payStatus = normalizeAnyStatus(payment?.status)
                return (
                  <>
              <div className="employerJobPostTop">
                <div className="employerJobPostTitle">{job.title || 'Untitled role'}</div>
                <span className={`employerJobPostStatusPill statusPill ${normalizeAnyStatus(job.status) === 'open' ? 'green' : 'blue'}`}>
                  <span className="statusDot" aria-hidden="true" />
                  {job.status || '—'}
                </span>
              </div>
              <div className="employerJobPostMeta">
                <span>{job.location || '—'}</span>
                <span className="employerJobPostSep">·</span>
                <span>{job.salary ? job.salary : 'Salary TBC'}</span>
              </div>
              <div className="employerJobPostMeta">
                <span>Service fee: <b>{fee.label}</b></span>
                <span className="employerJobPostSep">·</span>
                <span>
                  Payment:{' '}
                  <b>
                    {payStatus === 'paid' ? 'Paid' : payStatus === 'pending' ? 'Pending admin review' : 'Unpaid'}
                  </b>
                </span>
              </div>
              <div className="employerJobPostActions">
                <Link className="btn btnBlue btnSm" to={`/employer/jobs/${job.job_id}/edit`}>
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn btnOutline btnSm"
                  onClick={() => void toggleJobStatus(job, normalizeAnyStatus(job.status) === 'taken' ? 'open' : 'taken')}
                >
                  Mark as {normalizeAnyStatus(job.status) === 'taken' ? 'Open' : 'Taken'}
                </button>
                <button
                  type="button"
                  className="btn btnGreen btnSm"
                  disabled={payStatus === 'paid' || payStatus === 'pending'}
                  onClick={() => {
                    setPayJobId(job.job_id)
                    setPayJobTitle(job.title || '')
                    setPayOpen(true)
                  }}
                >
                  {payStatus === 'paid' ? 'Payment completed' : payStatus === 'pending' ? 'Payment submitted' : 'Submit payment'}
                </button>
              </div>
                  </>
                )
              })()}
            </div>
          ))}
        </div>
        {!busy && myJobs.length === 0 ? (
          <div className="dashSubtle" style={{ marginTop: 12 }}>
            You have not posted any jobs yet. Use &quot;Post new job&quot; to create your first listing.
          </div>
        ) : null}
        {totalPages > 1 ? (
          <div className="dashPager" style={{ marginTop: 18, justifyContent: 'center' }}>
            <div className="dashPagerBtns">
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    type="button"
                    className="dashCircleBtn"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      borderColor: currentPage === page ? 'rgba(11, 94, 215, 0.8)' : 'rgba(11, 94, 215, 0.25)',
                      background: currentPage === page ? 'rgba(11, 94, 215, 0.18)' : 'rgba(11, 94, 215, 0.08)',
                      color: '#0f3a73',
                      fontWeight: currentPage === page ? 800 : 600,
                    }}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
            <div className="dashSubtle">Page {currentPage} of {totalPages}</div>
          </div>
        ) : null}
      </div>
      <SubmitJobPaymentModal
        open={payOpen}
        token={token}
        jobId={payJobId}
        jobTitle={payJobTitle}
        onClose={() => setPayOpen(false)}
        onSubmitted={() => void refresh()}
      />
    </div>
  )
}
