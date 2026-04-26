import { Briefcase, ClipboardList, Package, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../services/api'
import { buildAdminLinkProps } from '../utils/adminNavigation'

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

function needsAction(status) {
  const v = normalizeAnyStatus(status)
  if (isApprovedStatus(v)) return false
  if (v === 'rejected' || v === 'reject' || v === 'declined') return false
  return true
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m || 0} min ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return d.toLocaleDateString()
  } catch {
    return ''
  }
}

function jobsCreatedThisWeekBars(jobs) {
  const start = new Date()
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(start)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const j of jobs) {
    if (!j.created_at) continue
    const d = new Date(j.created_at)
    if (d < monday) continue
    const dow = d.getDay()
    const idx = dow === 0 ? 6 : dow - 1
    if (idx >= 0 && idx < 7) counts[idx]++
  }
  const max = Math.max(1, ...counts)
  return labels.map((label, i) => ({ label, count: counts[i], h: Math.round((counts[i] / max) * 100) }))
}

function equipmentRentalsThisWeekBars(bookings) {
  const start = new Date()
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(start)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const b of bookings) {
    if (!b.created_at) continue
    const d = new Date(b.created_at)
    if (d < monday) continue
    const dow = d.getDay()
    const idx = dow === 0 ? 6 : dow - 1
    if (idx >= 0 && idx < 7) {
      const qty = Number(b.quantity)
      counts[idx] += Number.isFinite(qty) && qty > 0 ? qty : 1
    }
  }
  const max = Math.max(1, ...counts)
  return labels.map((label, i) => ({ label, count: counts[i], h: Math.round((counts[i] / max) * 100) }))
}

function StatCard({ tone, icon, value, label, linkTo, linkLabel }) {
  return (
    <div className={`adminStatCard adminStatCard--${tone}`}>
      <div className="adminStatIcon" aria-hidden="true">
        {icon ?? null}
      </div>
      <div className="adminStatBody">
        <div className="adminStatValue">{value}</div>
        <div className="adminStatLabel">{label}</div>
        {linkTo ? (
          <Link {...buildAdminLinkProps(linkTo)} className="adminStatLink">
            {linkLabel || 'View all'} →
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function WeekJobsChart({ bars }) {
  return (
    <div className="adminChartCard">
      <div className="adminChartCardTitle">Jobs created this week</div>
      <div className="adminBarChart" role="img" aria-label="Jobs per weekday">
        {bars.map((b) => (
          <div key={b.label} className="adminBarChartCol">
            <div className="adminBarChartTrack">
              <div className="adminBarChartFill" style={{ height: `${Math.max(b.h, 4)}%` }} />
            </div>
            <span className="adminBarChartLabel">{b.label}</span>
            <span className="adminBarChartCount">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekEquipmentRentalsChart({ bars }) {
  return (
    <div className="adminChartCard">
      <div className="adminChartCardTitle">Equipment rentals this week</div>
      <div className="adminBarChart" role="img" aria-label="Equipment rentals per weekday">
        {bars.map((b) => (
          <div key={b.label} className="adminBarChartCol">
            <div className="adminBarChartTrack">
              <div className="adminBarChartFill" style={{ height: `${Math.max(b.h, 4)}%` }} />
            </div>
            <span className="adminBarChartLabel">{b.label}</span>
            <span className="adminBarChartCount">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardAdminApprovalsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, role } = useAuth()
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobApps, setJobApps] = useState([])
  const [requests, setRequests] = useState([])
  const [equipment, setEquipment] = useState([])
  const [bookings, setBookings] = useState([])
  const [showAllRecent, setShowAllRecent] = useState(false)

  const canAccess = role === 'admin'

  const refresh = async () => {
    setBusy(true)
    try {
      const [usersRes, jobsRes, appsRes, requestsRes, equipmentRes, bookingsRes] = await Promise.all([
        apiFetch('/users', { token }).catch(() => []),
        apiFetch('/jobs', { token }).catch(() => []),
        apiFetch('/job-applications', { token }),
        apiFetch('/service-requests', { token }),
        apiFetch('/equipment', { token }).catch(() => []),
        apiFetch('/equipment-bookings', { token }).catch(() => []),
      ])
      setUsers(Array.isArray(usersRes) ? usersRes : [])
      setJobs(Array.isArray(jobsRes) ? jobsRes : [])
      setJobApps(Array.isArray(appsRes) ? appsRes : [])
      setRequests(Array.isArray(requestsRes) ? requestsRes : [])
      setEquipment(Array.isArray(equipmentRes) ? equipmentRes : [])
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : [])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token || !canAccess) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canAccess])

  useEffect(() => {
    const id = location.state?.scrollTo
    if (id) {
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [location.state])

  const weekBars = useMemo(() => jobsCreatedThisWeekBars(jobs), [jobs])
  const weeklyRentalBars = useMemo(() => equipmentRentalsThisWeekBars(bookings), [bookings])

  const openJobsCount = useMemo(() => {
    return jobs.filter((j) => {
      const s = normalizeAnyStatus(j.status)
      if (!s) return true
      return s === 'open' || s === 'available' || s === 'active'
    }).length
  }, [jobs])

  const pendingApps = useMemo(() => jobApps.filter((a) => needsAction(a.jobseeker_status) || needsAction(a.employer_status)), [jobApps])
  const pendingRequests = useMemo(() => requests.filter((r) => needsAction(r.status)), [requests])

  const equipmentRentStats = useMemo(() => {
    const map = new Map()
    for (const eq of equipment) {
      const id = Number(eq.equipment_id)
      if (!Number.isFinite(id)) continue
      map.set(id, {
        equipment_id: id,
        name: String(eq.name || `Equipment #${id}`),
        availability: eq.availability,
        rented: 0,
      })
    }
    for (const b of bookings) {
      const id = Number(b.equipment_id)
      if (!Number.isFinite(id)) continue
      const row = map.get(id) || {
        equipment_id: id,
        name: String(b.equipment_name || `Equipment #${id}`),
        availability: null,
        rented: 0,
      }
      row.rented += 1
      map.set(id, row)
    }
    const rows = [...map.values()].sort((a, b) => b.rented - a.rented || a.name.localeCompare(b.name))
    const totalRented = rows.reduce((sum, r) => sum + r.rented, 0)
    return { rows, totalRented }
  }, [equipment, bookings])

  const recentActivity = useMemo(() => {
    const rows = []
    for (const a of jobApps) {
      const ts = a.created_at ? new Date(a.created_at).getTime() : 0
      rows.push({
        id: `app-${a.application_id}`,
        text: `Job application: ${a.job_title || 'Role'}`,
        sub: a.jobseeker_name || 'Applicant',
        ts,
        time: formatTime(a.created_at),
        tone: statusTone(a.jobseeker_status),
        status: a.jobseeker_status || 'pending',
      })
    }
    rows.sort((x, y) => y.ts - x.ts)
    return rows.slice(0, 12)
  }, [jobApps])

  const recentShown = useMemo(() => (showAllRecent ? recentActivity : recentActivity.slice(0, 2)), [recentActivity, showAllRecent])

  if (!token) {
    return (
      <div className="adminDashPage">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please login as Admin.</div>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="adminDashPage">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Admin only</div>
        </div>
      </div>
    )
  }

  return (
    <div className="adminDashPage adminDashPage--overview">
      <div className="adminDashHeader">
        <div>
          <h1 className="adminDashTitle">Dashboard</h1>
          <p className="adminDashSubtitle">Overview, metrics, and pending reviews.</p>
        </div>
        <button type="button" className="btn btnOutline btnSm" onClick={() => void refresh()} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      <div className="adminStatGrid" aria-label="Key metrics">
        <StatCard
          tone="blue"
          icon={<Users size={22} strokeWidth={2.2} />}
          value={busy ? '—' : users.length.toLocaleString()}
          label="Total users"
          linkTo="/dashboard/admin/users"
          linkLabel="Total users"
        />
        <StatCard
          tone="green"
          icon={<Briefcase size={22} strokeWidth={2.2} />}
          value={busy ? '—' : openJobsCount.toLocaleString()}
          label="Active jobs"
          linkTo="/dashboard/admin/manage/jobs"
          linkLabel="Active jobs"
        />
        <StatCard
          tone="indigo"
          icon={<ClipboardList size={22} strokeWidth={2.2} />}
          value={busy ? '—' : jobApps.length.toLocaleString()}
          label="Applications"
          linkTo="/dashboard/admin/manage/job_applications"
          linkLabel="Applications"
        />
        <StatCard
          tone="amber"
          icon={<Package size={22} strokeWidth={2.2} />}
          value={busy ? '—' : equipmentRentStats.totalRented.toLocaleString()}
          label="Equipment rented"
          linkTo="/dashboard/admin/manage/equipment_bookings"
          linkLabel="Rentals"
        />
      </div>

      <section className="adminNeedsCard" aria-labelledby="needs-heading">
        <h2 id="needs-heading" className="adminNeedsTitle">
          Needs attention
        </h2>
        <p className="adminNeedsSub">Items that may need a decision.</p>
        <ul className="adminNeedsList">
          <li className="adminNeedsItem">
            <div className="adminNeedsItemIcon adminNeedsItemIcon--amber">!</div>
            <div className="adminNeedsItemBody">
              <strong>{pendingApps.length}</strong> job application{pendingApps.length === 1 ? '' : 's'} pending approval
            </div>
            <Link className="btn btnBlue btnSm" {...buildAdminLinkProps('/dashboard/admin/manage/job_applications')}>
              Review
            </Link>
          </li>
          <li className="adminNeedsItem">
            <div className="adminNeedsItemIcon adminNeedsItemIcon--blue">◇</div>
            <div className="adminNeedsItemBody">
              <strong>{pendingRequests.length}</strong> service request{pendingRequests.length === 1 ? '' : 's'} to assign
            </div>
            <Link className="btn btnOutline btnSm" {...buildAdminLinkProps('/dashboard/admin/manage/service_requests')}>
              Assign
            </Link>
          </li>
        </ul>
      </section>

      <div className="adminDashMiddle">
        <section className="adminPanel adminPanel--muted adminPanel--activity">
          <div className="adminPanelHead">
            <h2 className="adminPanelTitle">Recent activity</h2>
          </div>
          <ul className="adminActivityList">
            {recentShown.length === 0 ? (
              <li className="adminEmpty">No recent events.</li>
            ) : (
              recentShown.map((r) => (
                <li key={r.id} className="adminActivityRow">
                  <div className="adminActivityDot" data-tone={r.tone} />
                  <div className="adminActivityText">
                    <div className="adminActivityTitle">{r.text}</div>
                    {r.sub ? <div className="adminActivitySub">{r.sub}</div> : null}
                  </div>
                  <div className="adminActivityRight">
                    <span className={`adminActivityStatus statusPill ${r.tone}`}>{r.status}</span>
                    <span className="adminActivityTime">{r.time}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
          {recentActivity.length > 2 ? (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btnOutline btnSm" onClick={() => setShowAllRecent((v) => !v)}>
                {showAllRecent ? 'Show less' : 'View more'}
              </button>
            </div>
          ) : null}
        </section>

        <div className="adminDashCharts" id="reports">
          <WeekJobsChart bars={weekBars} />
          <WeekEquipmentRentalsChart bars={weeklyRentalBars} />
        </div>
      </div>

    </div>
  )
}
