import { useEffect, useState } from 'react'
import {
    HashRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom'
import Footer from './components/Layout/Footer'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton'
import { useAuth } from './context/useAuth'
import AdminDashboard from './pages/admin/AdminDashboard'
import AuthPage from './pages/AuthPage'
import DashboardEmployerPage from './pages/employer/DashboardEmployerPage'
import EmployerMyApplicantsPage from './pages/employer/EmployerMyApplicantsPage'
import EmployerMyJobPostsPage from './pages/employer/EmployerMyJobPostsPage'
import HomePage from './pages/HomePage'
import DashboardJobSeekerPage from './pages/job_seeker/DashboardJobSeekerPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import AboutUsPage from './pages/public/AboutUsPage'
import ApplyJobPage from './pages/public/ApplyJobPage'
import ContactPage from './pages/public/ContactPage'
import JobsPage from './pages/public/JobsPage'
import MaterialSupplyPage from './pages/public/MaterialSupplyPage'
import ProjectsPage from './pages/public/ProjectsPage'
import RentEquipmentPage from './pages/public/RentEquipmentPage'
import RequestQuotePage from './pages/public/RequestQuotePage'
import ServiceRequestsPage from './pages/public/ServiceRequestsPage'
import ServicesPage from './pages/public/ServicesPage'

import PostJobPage from './pages/employer/PostJobPage'
import { applyManageKey, applyPathToAdminStorage } from './utils/adminNavigation'

/** Old `/dashboard/admin/manage/:key` → SPA admin + localStorage */
function AdminLegacyManageRedirect() {
  const { key } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    applyManageKey(key)
    navigate('/dashboard/admin', { replace: true })
  }, [key, navigate])
  return null
}

/** Old `/dashboard/admin/users` → Users section */
function AdminLegacyUsersRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    applyPathToAdminStorage('/dashboard/admin/users')
    navigate('/dashboard/admin', { replace: true })
  }, [navigate])
  return null
}

/** Old `/admin/table/:key` → same as manage */
function AdminLegacyTableRedirect() {
  const { key } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    applyManageKey(key)
    navigate('/dashboard/admin', { replace: true })
  }, [key, navigate])
  return null
}

function DashboardRedirect() {
  const { token, role, loading } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="dashCard">
          <div className="emptyStateTitle">Loading...</div>
          <div className="emptyStateText">Preparing your dashboard.</div>
        </div>
      </div>
    )
  }
  if (role === 'admin') return <Navigate to="/dashboard/admin" replace />
  if (role === 'employer') return <Navigate to="/dashboard/employer" replace />
  if (role === 'job_seeker') return <Navigate to="/dashboard/jobseeker" replace />
  return <Navigate to="/" replace />
}

/** Public + employer/jobseeker shell (top bar, optional sidebar). Admin uses {@link ./pages/admin/AdminDashboard}. */
function SiteLayout() {
  const { token, role } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pathname = location.pathname || '/'
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/auth' ||
    pathname === '/about-us' ||
    pathname === '/request-quotes' ||
    pathname === '/rent-equipment' ||
    pathname === '/material-supply' ||
    pathname === '/jobs' ||
    pathname === '/service-requests' ||
    pathname === '/services' ||
    pathname === '/projects' ||
    pathname === '/contact'
    || pathname.startsWith('/jobs/')

  const showSidebar = Boolean(token && role) && !isPublicRoute
  const [isMobileView, setIsMobileView] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)')
    const updateIsMobile = () => setIsMobileView(mediaQuery.matches)
    updateIsMobile()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateIsMobile)
    } else {
      mediaQuery.addListener(updateIsMobile)
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateIsMobile)
      } else {
        mediaQuery.removeListener(updateIsMobile)
      }
    }
  }, [])

  const hideHomeTopNav = false

  useEffect(() => {
    const t = setTimeout(() => {
      setMobileNavOpen(false)
      setSidebarOpen(false)
    }, 0)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    // Keep route navigation consistent: open new pages from top, not from previous scroll position.
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, 0)
    return () => clearTimeout(t)
  }, [pathname, location.search])

  return (
    <div className="appLayout">
      {hideHomeTopNav ? null : (
        <TopBar
          showSidebarToggle={showSidebar}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((v) => !v)}
          onCloseOverlays={() => {
            setMobileNavOpen(false)
            setSidebarOpen(false)
          }}
        />
      )}
      <div className={`layoutRow ${showSidebar ? '' : 'noSidebar'}`}>
        {showSidebar ? <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}
        <div className="layoutMain">
          {isPublicRoute ? <WhatsAppFloatingButton /> : null}
          <Outlet />
        </div>
      </div>
      {isPublicRoute ? <Footer /> : null}
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/request-quotes" element={<RequestQuotePage />} />
        <Route path="/rent-equipment" element={<RentEquipmentPage />} />
        <Route path="/material-supply" element={<MaterialSupplyPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId/apply" element={<ApplyJobPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/service-requests" element={<ServiceRequestsPage />} />

        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/employer" element={<DashboardEmployerPage />} />
        <Route path="/dashboard/employer/applicants" element={<EmployerMyApplicantsPage />} />
        <Route path="/dashboard/employer/job-posts" element={<EmployerMyJobPostsPage />} />
        <Route path="/dashboard/jobseeker" element={<DashboardJobSeekerPage />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />

        <Route path="/employer/post-job" element={<PostJobPage />} />
        <Route path="/employer/jobs/:jobId/edit" element={<PostJobPage />} />
      </Route>

      {/* Admin: single-page shell + section components — see pages/admin/AdminDashboard.jsx */}
      <Route path="/dashboard/admin" element={<AdminDashboard />} />
      <Route path="/dashboard/admin/users" element={<AdminLegacyUsersRedirect />} />
      <Route path="/dashboard/admin/users/:userId" element={<Navigate to="/dashboard/admin" replace />} />
      <Route path="/dashboard/admin/manage/:key" element={<AdminLegacyManageRedirect />} />

      <Route path="/admin/tables" element={<Navigate to="/dashboard/admin" replace />} />
      <Route path="/admin/table/:key" element={<AdminLegacyTableRedirect />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
