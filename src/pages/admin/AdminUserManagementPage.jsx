import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext.jsx'
import { apiFetch } from '../../services/api'
import { buildAdminLinkProps } from '../../utils/adminNavigation'
import AdminEditUserModal from '../../components/admin/AdminEditUserModal'
import AdminUserProfileModal from '../../components/admin/AdminUserProfileModal'

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

export default function AdminUserManagementPage() {
  const { token, role } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [users, setUsers] = useState([])
  const [editUser, setEditUser] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // active/inactive
  const [approvalFilter, setApprovalFilter] = useState('all') // pending/approved/rejected
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const canAccess = role === 'admin'

  const load = async () => {
    setBusy(true)
    try {
      const res = await apiFetch('/users', { token }).catch(() => [])
      setUsers(Array.isArray(res) ? res : [])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token || !canAccess) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canAccess])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = norm(search)
      const name = norm(u.name)
      const email = norm(u.email)
      const matchSearch = !q || name.includes(q) || email.includes(q)
      const r = norm(u.role)
      const matchRole = roleFilter === 'all' || r === norm(roleFilter)
      const active = u.active !== false
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && active) ||
        (statusFilter === 'inactive' && !active)
      const approval = norm(u.approval_status || 'pending')
      const matchApproval = approvalFilter === 'all' || approval === approvalFilter
      return matchSearch && matchRole && matchStatus && matchApproval
    })
  }, [users, search, roleFilter, statusFilter, approvalFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter, approvalFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => {
    let total = 0
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const u of users) {
      total += 1
      const ap = norm(u.approval_status || 'pending')
      if (ap === 'approved') approved += 1
      else if (ap === 'rejected') rejected += 1
      else pending += 1
    }
    return { total, pending, approved, rejected }
  }, [users])

  function clearFilters() {
    setSearch('')
    setRoleFilter('all')
    setStatusFilter('all')
    setApprovalFilter('all')
  }

  async function deleteUser(u) {
    const id = Number(u?.user_id)
    if (!Number.isInteger(id) || id <= 0) return
    const label = String(u?.name || u?.email || `User #${id}`).trim()
    const ok = window.confirm(`Delete ${label}?\n\nThis deletes account, user details, and guarantor.`)
    if (!ok) return
    setDeletingUserId(id)
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE', token })
      await load()
      toastSuccess(`${label} deleted successfully.`)
    } catch (e) {
      toastError(e?.message || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  if (!token) {
    return (
      <div className="adminUserMgmt adminUserMgmt--gate">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Login required</div>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="adminUserMgmt adminUserMgmt--gate">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Admin only</div>
        </div>
      </div>
    )
  }

  return (
    <div className="adminUserMgmt adminViewportPane">
      <AdminEditUserModal
        open={Boolean(editUser)}
        user={editUser}
        token={token}
        onClose={() => setEditUser(null)}
        onSaved={() => void load()}
      />
      <AdminUserProfileModal
        open={profileUserId != null}
        userId={profileUserId}
        token={token}
        onClose={() => setProfileUserId(null)}
      />
      <header className="adminUserMgmtHeader">
        <div>
          <h1 className="adminUserMgmtTitle">User management</h1>
          <p className="adminUserMgmtSubtitle">Manage users, roles, and permissions.</p>
        </div>
        <div className="adminUserMgmtStat">Total users: {busy ? '…' : stats.total}</div>
      </header>

      <div className="dashActions" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <span className="adminPanelBadge">Pending: {busy ? '…' : stats.pending}</span>
        <span className="adminPanelBadge">Approved (paid): {busy ? '…' : stats.approved}</span>
        <span className="adminPanelBadge">Rejected: {busy ? '…' : stats.rejected}</span>
      </div>

      <div className="adminUserMgmtToolbar">
        <label className="adminUserMgmtSearch">
          <span className="adminUserMgmtSearchIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            className="adminUserMgmtSearchInput"
            placeholder="Search users by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="adminUserMgmtSelect" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="admin">admin</option>
          <option value="employer">employer</option>
          <option value="job_seeker">job_seeker</option>
        </select>
        <select className="adminUserMgmtSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="adminUserMgmtSelect" value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} aria-label="Filter by approval status">
          <option value="all">All approval</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved (paid)</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="button" className="adminUserMgmtClear" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <div className="adminUserMgmtTableWrap">
        <table className="adminUserMgmtTable">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="adminUserMgmtEmpty">
                  {busy ? 'Loading…' : 'No users match your filters.'}
                </td>
              </tr>
            ) : (
              paginated.map((u) => {
                const id = u.user_id
                const initial = String(u.name || u.email || '?').slice(0, 1).toUpperCase()
                const active = u.active !== false
                const approval = norm(u.approval_status || 'pending')
                return (
                  <tr
                    key={id}
                    className="adminUserMgmtRow"
                    onClick={() => setEditUser(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditUser(u)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <div className="adminUserMgmtUserCell">
                        <span className="adminUserMgmtAvatar">{initial}</span>
                        <div>
                          <div className="adminUserMgmtName">{u.name || '—'}</div>
                          <div className="adminUserMgmtEmail">{u.email || '—'}</div>
                          <div className="adminUserMgmtPhone">{u.phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adminUserMgmtBadge adminUserMgmtBadge--role">{u.role || '—'}</span>
                    </td>
                    <td>
                      <span className={`adminUserMgmtBadge ${
                        approval === 'approved' ? 'adminUserMgmtBadge--ok' : approval === 'rejected' ? 'adminUserMgmtBadge--pending' : 'adminUserMgmtBadge--role'
                      }`}>
                        {approval === 'approved' ? 'approved (paid)' : approval}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="adminUserMgmtActions">
                        <button
                          type="button"
                          className="btn btnOutline btnSm"
                          title="View registration profile and guarantor"
                          onClick={() => setProfileUserId(id)}
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className="adminUserMgmtIconBtn adminUserMgmtIconBtn--btn"
                          title="Edit user"
                          aria-label="Edit user"
                          onClick={() => setEditUser(u)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn btnDanger btnSm"
                          title="Delete user account and related profile data"
                          disabled={deletingUserId === id}
                          onClick={() => void deleteUser(u)}
                        >
                          {deletingUserId === id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 ? (
        <div className="adminMgmtPagination" role="navigation" aria-label="Users pages" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnOutline btnSm adminMgmtPageBtn"
            disabled={page <= 1 || busy}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="adminMgmtPageInfo">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            className="btn btnOutline btnSm adminMgmtPageBtn"
            disabled={page >= totalPages || busy}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}

      <p className="adminUserMgmtHint">
        Click a row to <strong>edit in a popup</strong>. Directory &amp; records:{' '}
        <Link {...buildAdminLinkProps('/dashboard/admin/manage/users')}>Users — all records</Link>.
      </p>
    </div>
  )
}
