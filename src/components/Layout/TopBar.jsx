import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase()
  if (r === 'job seeker' || r === 'jobseeker' || r === 'job-seeker') return 'job_seeker'
  return r
}

export default function TopBar({
  showSidebarToggle = false,
  sidebarOpen = false,
  onToggleSidebar,
  mobileNavOpen = false,
  onToggleMobileNav,
  onCloseOverlays,
}) {
  const { token, role, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname || '/'
  const signInTo =
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/employer/') ||
    pathname.startsWith('/jobs/')
      ? `/auth?next=${encodeURIComponent(pathname)}`
      : '/auth'
  const normalizedRole = normalizeRole(role)
  const isProfileSettings = pathname.startsWith('/settings/profile')
  const isEmployerWorkspace =
    token &&
    normalizedRole === 'employer' &&
    (pathname.startsWith('/dashboard/employer') || pathname.startsWith('/employer/') || isProfileSettings)
  const isJobSeekerWorkspace =
    token && normalizedRole === 'job_seeker' && (pathname.startsWith('/dashboard/jobseeker') || isProfileSettings)
  const isWorkspaceTopbar = isEmployerWorkspace || isJobSeekerWorkspace || Boolean(token && isProfileSettings)

  function handleLogout() {
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <header className={`topBar ${isWorkspaceTopbar ? 'topBarWorkspace' : ''}`}>
      <div className="topBarLeft">
        <button
          type="button"
          className="topBarBurger"
          aria-label={showSidebarToggle ? (sidebarOpen ? 'Close menu' : 'Open menu') : (mobileNavOpen ? 'Close menu' : 'Open menu')}
          aria-expanded={showSidebarToggle ? Boolean(sidebarOpen) : Boolean(mobileNavOpen)}
          onClick={() => {
            if (showSidebarToggle) onToggleSidebar?.()
            else onToggleMobileNav?.()
          }}
        >
          <span aria-hidden className="topBarBurgerIcon" />
        </button>
        <Link className="brandMini" to="/" aria-label="Verde Rwanda Ltd — home">
          <img className="brandLogo" src="/logo.png" alt="" width={220} height={56} />
        </Link>
      </div>
      {isWorkspaceTopbar ? (
        <div className="topBarWorkspaceMid">
          <span className="topBarWorkspaceTitle">
            {isEmployerWorkspace ? 'Employer workspace' : isJobSeekerWorkspace ? 'Job seeker workspace' : 'Workspace'}
          </span>
          <p style={{ fontSize: "14px", color: "#333" }}>
  <strong style={{ color: "#0d6efd" }}>Momo Pay Code:</strong> 059914 | 
  <strong style={{ color: "#0d6efd" }}> Name:</strong> Verde Rwanda Ltd | 
  <strong style={{ color: "#0d6efd" }}> Bank:</strong> Equity Bank | 
  <strong style={{ color: "#0d6efd" }}> Account:</strong> 
</p>
        </div>
      ) : (
        <div className="topBarNavWrap">
          <nav className="topNav" aria-label="Main">
            <Link className="topNavLink" to="/" onClick={() => onCloseOverlays?.()}>
              Home
            </Link>
            <Link className="topNavLink" to="/about-us" onClick={() => onCloseOverlays?.()}>
              About
            </Link>

            <Link className="topNavLink" to="/contact" onClick={() => onCloseOverlays?.()}>
              Contact Us
            </Link>
            <Link className="topNavLink" to="/services" onClick={() => onCloseOverlays?.()}>
              Services
            </Link>
            <Link className="topNavLink" to="/projects" onClick={() => onCloseOverlays?.()}>
              Projects
            </Link>
            <Link className="topNavLink" to="/jobs" onClick={() => onCloseOverlays?.()}>
              Jobs
            </Link>
            <Link className="topNavLink" to="/rent-equipment" onClick={() => onCloseOverlays?.()}>
              Rent equipment
            </Link>
            <Link className="topNavLink" to="/service-requests" onClick={() => onCloseOverlays?.()}>
              Request service
            </Link>
           
           
            <Link className="topNavLink" to="/request-quotes" onClick={() => onCloseOverlays?.()}>
              Request quote
            </Link>
          </nav>
        </div>
      )}
      <div className="topBarRight">
        {token ? (
          <>
            <button type="button" className="topNavLink topNavBtn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="topNavLink" to={signInTo} onClick={() => onCloseOverlays?.()}>
            Sign in
          </Link>
        )}
        {role ? <span className="topBarDashLabel">{String(role).replace('_', ' ')}</span> : null}
      </div>

      {!isWorkspaceTopbar && mobileNavOpen ? (
        <>
          <div className="topBarOverlay" aria-hidden onClick={() => onCloseOverlays?.()} />
          <div className="topBarMobileMenu" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="topBarMobileMenuHead">
              <div className="topBarMobileMenuTitle">Menu</div>
              <button type="button" className="topBarMobileMenuClose" onClick={() => onCloseOverlays?.()} aria-label="Close menu">
                ×
              </button>
            </div>
            <nav className="topBarMobileNav" aria-label="Mobile navigation">
              <Link className="topBarMobileLink" to="/" onClick={() => onCloseOverlays?.()}>
                Home
              </Link>
              <Link className="topBarMobileLink" to="/services" onClick={() => onCloseOverlays?.()}>
                Services
              </Link>
              <Link className="topBarMobileLink" to="/projects" onClick={() => onCloseOverlays?.()}>
                Projects
              </Link>
              <Link className="topBarMobileLink" to="/jobs" onClick={() => onCloseOverlays?.()}>
                Jobs
              </Link>
              <Link className="topBarMobileLink" to="/rent-equipment" onClick={() => onCloseOverlays?.()}>
                Rent equipment
              </Link>
              <Link className="topBarMobileLink" to="/service-requests" onClick={() => onCloseOverlays?.()}>
                Request service
              </Link>
              <Link className="topBarMobileLink" to="/material-supply" onClick={() => onCloseOverlays?.()}>
                Material supply
              </Link>
              <Link className="topBarMobileLink" to="/contact" onClick={() => onCloseOverlays?.()}>
                Contact
              </Link>
              <Link className="topBarMobileLink" to="/about-us" onClick={() => onCloseOverlays?.()}>
                About
              </Link>
              <Link className="topBarMobileLink" to="/request-quotes" onClick={() => onCloseOverlays?.()}>
                Request quote
              </Link>
              <div className="topBarMobileDivider" aria-hidden />
              {token ? (
                <>
                  <Link className="topBarMobileLink" to="/settings/profile" onClick={() => onCloseOverlays?.()}>
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    className="topBarMobileLink topBarMobileLink--danger"
                    onClick={() => {
                      onCloseOverlays?.()
                      handleLogout()
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link className="topBarMobileLink topBarMobileLink--strong" to={signInTo} onClick={() => onCloseOverlays?.()}>
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </>
      ) : null}
    </header>
  )
}
