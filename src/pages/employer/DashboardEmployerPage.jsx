import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'
import { isApprovedStatus, normalizeAnyStatus } from './employerDashboardHelpers'

export default function DashboardEmployerPage() {
  const { token, role, me } = useAuth()
  const [busy, setBusy] = useState(false)
  const [apps, setApps] = useState([])
  const [employers, setEmployers] = useState([])

  const canAccess = role === 'employer'

  async function refresh() {
    setBusy(true)
    try {
      const [appsRes, empRes] = await Promise.all([apiFetch('/job-applications', { token }), apiFetch('/employers')])
      setApps(Array.isArray(appsRes) ? appsRes : [])
      setEmployers(Array.isArray(empRes) ? empRes : [])
    } finally {
      setBusy(false)
    }
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

  const stats = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const a of apps) {
      const v = normalizeAnyStatus(a.employer_status)
      if (!v || v === 'pending' || v === 'new' || v === 'submitted') pending += 1
      else if (isApprovedStatus(v)) approved += 1
      else if (v === 'rejected' || v === 'reject' || v === 'declined') rejected += 1
    }
    return { total: apps.length, pending, approved, rejected }
  }, [apps])

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please login as Employer to review applicants.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to="/auth?next=%2Fdashboard%2Femployer">
              Sign in as employer
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
        <h2 className="sectionTitle">Employer Dashboard</h2> 
       {/*  <p className="sectionSubtitle">Overview — open My applicants or My job posts for full lists.</p> */}
{/* <p style={{ fontSize: "14px", color: "#333" }}>
  <span style={{
    fontWeight: "bold",
    background: "linear-gradient(90deg, #0d6efd, #20c997)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  }}>
    Payment:
  </span>{" "}
  Momo Pay Code: 059914 | Name: Verde Rwanda Ltd | Bank: Equity Bank | Account: 
</p> */}
      </div>
      

      <div className="dashGrid2" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <div className="dashTitle">Quick actions</div>
          <div className="dashSubtle" style={{ marginTop: 6 }}>
            Post roles, edit your listings, and review candidates on dedicated pages.
          </div>
          <div className="dashActions" style={{ marginTop: 14 }}>
            <Link className="btn btnGreen btnSm" to="/employer/post-job">
              Post new job
            </Link>
            <Link className="btn btnBlue btnSm" to="/dashboard/employer/job-posts">
              My job posts
            </Link>
           {/*  <Link className="btn btnOutline btnSm" to="/dashboard/employer/applicants">
              My applicants
            </Link> */}
            {/* <button className="btn btnOutline btnSm" type="button" onClick={() => void refresh()} disabled={busy}>
              {busy ? 'Refreshing…' : 'Refresh'}
            </button> */}
            <Link className="btn btnGreen btnSm" to="/dashboard/employer/job-posts">
              Manage job payments
            </Link>
          </div>
          <div className="dashItemMeta" style={{ marginTop: 12 }}>
            <span>
              Employer profile: <b>{currentEmployer?.company_name || 'Not linked'}</b>
            </span>
          </div>
        </div>

        <div className="dashCard">
          <div className="dashTitle">Applications overview</div>
          <div className="dashItemMeta" style={{ marginTop: 10 }}>
            <span className="statusPill blue">
              <span className="statusDot" aria-hidden="true" />
              Total: {stats.total}
            </span>
            <span className="statusPill blue">
              <span className="statusDot" aria-hidden="true" />
              Pending: {stats.pending}
            </span>
            <span className="statusPill green">
              <span className="statusDot" aria-hidden="true" />
              Approved: {stats.approved}
            </span>
            <span className="statusPill red">
              <span className="statusDot" aria-hidden="true" />
              Rejected: {stats.rejected}
            </span>
          </div>
          <div className="dashActions" style={{ marginTop: 14 }}>
            <Link className="btn btnBlue btnSm" to="/dashboard/employer/applicants">
              Open My applicants
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
