import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

/** Employer / job seeker dashboard sidebar (not admin). */
export default function Sidebar({ role, open = false, onClose }) {
  const r = String(role || '').toLowerCase()
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname || '/'

  const isEmployer = r === 'employer'
  const isJobSeeker = r === 'job_seeker'
  const isActive = (href) => path === href || path.startsWith(`${href}/`)
  const displayName = String(me?.name || me?.email || '').trim() || 'Dashboard user'

  function handleLogout() {
    onClose?.()
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <>
      <div className={`sidebarOverlay ${open ? 'sidebarOverlay--open' : ''}`} aria-hidden onClick={() => onClose?.()} />
      <aside
        className={`sidebar ${open ? 'sidebar--open' : ''} ${isEmployer ? 'sidebarEmployer' : ''} ${isJobSeeker ? 'sidebarJobSeeker' : ''}`}
        aria-label="Dashboard"
      >
        <div className="sidebarMobileHead">
          <button type="button" className="sidebarMobileClose" onClick={() => onClose?.()} aria-label="Close menu">
            ×
          </button>
        </div>
      <div className="sidebarSection sidebarDashboard">
        <div className="sidebarHeading">Dashboard</div>
        <div className="sidebarName">{displayName}</div>
        <span className="sidebarRolePill">{r || 'User'}</span>
      </div>
      <div className="sidebarSection">
        <div className="sidebarHeading">{isEmployer ? 'Employer menu' : 'Shortcuts'}</div>
        {isEmployer ? (
          <nav className="sidebarMenu" aria-label="Employer navigation">
            <Link
              className={`sidebarMenuLink ${path === '/dashboard/employer' ? 'sidebarMenuLink--active' : ''}`}
              to="/dashboard/employer"
              onClick={() => onClose?.()}
            >
              Overview
            </Link>
            <Link
              className={`sidebarMenuLink ${isActive('/employer/post-job') || path.startsWith('/employer/jobs/') ? 'sidebarMenuLink--active' : ''}`}
              to="/employer/post-job"
              onClick={() => onClose?.()}
            >
              Post a job
            </Link>
            <Link
              className={`sidebarMenuLink ${path === '/dashboard/employer/job-posts' ? 'sidebarMenuLink--active' : ''}`}
              to="/dashboard/employer/job-posts"
              onClick={() => onClose?.()}
            >
              My job posts
            </Link>
            <Link
              className={`sidebarMenuLink ${path === '/dashboard/employer/applicants' ? 'sidebarMenuLink--active' : ''}`}
              to="/dashboard/employer/applicants"
              onClick={() => onClose?.()}
            >
              My applicants
            </Link>
            <Link
              className={`sidebarMenuLink ${isActive('/settings/profile') ? 'sidebarMenuLink--active' : ''}`}
              to="/settings/profile"
              onClick={() => onClose?.()}
            >
              Profile settings
            </Link>
            <button type="button" className="sidebarMenuLink sidebarMenuLink--danger" onClick={handleLogout}>
              Logout
            </button>
          
          </nav>
        ) : (
          <nav className="sidebarMenu" aria-label="Job seeker navigation">
            {isJobSeeker ? (
              <Link
                className={`sidebarMenuLink ${isActive('/dashboard/jobseeker') ? 'sidebarMenuLink--active' : ''}`}
                to="/dashboard/jobseeker"
                onClick={() => onClose?.()}
              >
                Overview
              </Link>
            ) : null}
            {isJobSeeker ? (
              <Link
                className={`sidebarMenuLink ${isActive('/settings/profile') ? 'sidebarMenuLink--active' : ''}`}
                to="/settings/profile"
                onClick={() => onClose?.()}
              >
                Profile settings
              </Link>
            ) : null}
            <button type="button" className="sidebarMenuLink sidebarMenuLink--danger" onClick={handleLogout}>
              Logout
            </button>
          
          </nav>
        )}
      </div>
      </aside>
    </>
  )
}
