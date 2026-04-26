import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'

function normalizeAnyStatus(s) {
  return String(s || '').trim().toLowerCase()
}

function isApprovedStatus(s) {
  const v = normalizeAnyStatus(s)
  return v === 'approved' || v === 'accepted' || v === 'accept'
}

function statusTone(status) {
  const v = normalizeAnyStatus(status)
  if (isApprovedStatus(v)) return 'green'
  if (v === 'rejected' || v === 'reject' || v === 'declined') return 'red'
  if (!v || v === 'pending' || v === 'new' || v === 'submitted') return 'blue'
  return 'blue'
}

function readText(v, fallback = '-') {
  const t = String(v || '').trim()
  return t || fallback
}

export default function DashboardJobSeekerPage() {
  const { token, role, me } = useAuth()
  const [busy, setBusy] = useState(false)
  const [apps, setApps] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const canAccess = role === 'job_seeker'
  const itemsPerPage = 2

  async function refresh() {
    setBusy(true)
    setCurrentPage(1)
    try {
      const data = await apiFetch('/job-applications', { token })
      setApps(Array.isArray(data) ? data : [])
    } finally {
      setBusy(false)
    }
  }

  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return apps.slice(startIndex, endIndex)
  }, [apps, currentPage, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(apps.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!token || !canAccess) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canAccess])

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please login as Job Seeker.</div>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Job Seeker only</div>
          <div className="emptyStateText">Your role is not Job Seeker.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <p className="sectionSubtitle">
          Welcome, {readText(me?.name || me?.email, 'Job Seeker')}. Track your job applications and decisions.
        </p>
      </div>

      <div className="dashCard" style={{ marginTop: 12 }}>
        <div className="dashHeadRow">
          <div>
            <div className="dashTitle">My applications</div>
           
          </div>
          <div className="dashSubtle">{busy ? 'Loading...' : `${apps.length} application${apps.length === 1 ? '' : 's'}`}</div>
        </div>

        <div className="jsApplicationsGrid" style={{ marginTop: 14 }}>
          {paginatedApps.map((a) => (
            <article key={a.application_id} className="jsApplicationCard">
              <div className="jsApplicationCardHead">
                <div className="jsApplicationTitle">{readText(a.job_title)}</div>
                <div className="jsApplicationSub">{readText(a.job_location)}</div>
              </div>
              <div className="jsApplicationPills">
                <span className={`statusPill ${statusTone(a.employer_status)}`}>
                  <span className="statusDot" aria-hidden="true" />
                  Employer: {a.employer_status || 'pending'}
                </span>
                <span className={`statusPill ${statusTone(a.jobseeker_status)}`}>
                  <span className="statusDot" aria-hidden="true" />
                  Admin: {a.jobseeker_status || 'pending'}
                </span>
              </div>
              <div className="jsApplicationTwoCol">
                <div className="jsApplicationCell">
                  <div className="jsDashInfoLabel">Salary</div>
                  <div className="jsDashInfoValue">{readText(a.job_salary, '—')}</div>
                </div>
                <div className="jsApplicationCell">
                  <div className="jsDashInfoLabel">Job status</div>
                  <div className="jsDashInfoValue">{readText(a.job_status, '—')}</div>
                </div>
                <div className="jsApplicationCell">
                  <div className="jsDashInfoLabel">Company</div>
                  <div className="jsDashInfoValue">{readText(a.employer_name, '—')}</div>
                </div>
                <div className="jsApplicationCell">
                  <div className="jsDashInfoLabel">Location</div>
                  <div className="jsDashInfoValue">{readText(a.employer_location || a.job_location)}</div>
                </div>
                <div className="jsApplicationCell jsApplicationCellSpan2">
                  <div className="jsDashInfoLabel">Employer phone</div>
                  <div className="jsDashInfoValue">
                    {isApprovedStatus(a.employer_status)
                      ? readText(a.employer_phone, 'not provided')
                      : 'hidden'}
                  </div>
                </div>
                <div className="jsApplicationCell jsApplicationCellSpan2">
                  <div className="jsDashInfoLabel">Employer email</div>
                  <div className="jsDashInfoValue">
                    {isApprovedStatus(a.employer_status)
                      ? (String(a.employer_email || '').trim()
                        ? <a href={`mailto:${String(a.employer_email).trim()}`}>{String(a.employer_email).trim()}</a>
                        : 'not provided')
                      : 'hidden'}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!busy && apps.length === 0 ? <div className="dashSubtle jsApplicationsEmpty">No applications yet.</div> : null}
        </div>
        {totalPages > 1 && (
          <div className="dashPager" style={{ marginTop: 16, justifyContent: 'center' }}>
            <div className="dashPagerBtns">
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className="dashCircleBtn"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    borderColor: currentPage === pageNum ? 'rgba(11, 94, 215, 0.8)' : 'rgba(11, 94, 215, 0.25)',
                    background: currentPage === pageNum ? 'rgba(11, 94, 215, 0.18)' : 'rgba(11, 94, 215, 0.08)',
                    color: '#0f3a73',
                    fontWeight: currentPage === pageNum ? 800 : 600,
                  }}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
            <div className="dashSubtle">Page {currentPage} of {totalPages}</div>
          </div>
        )}
      </div>
    </div>
  )
}

