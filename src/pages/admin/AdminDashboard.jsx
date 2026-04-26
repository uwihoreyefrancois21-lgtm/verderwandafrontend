import {
    Archive,
    Building2,
    CheckSquare,
    ClipboardList,
    FileText,
    FolderOpen,
    HelpCircle,
    Inbox,
    Image,
    LayoutDashboard,
    List,
    LogOut,
    Menu,
    MessageCircle,
    TrendingUp,
    UserCircle,
    Users,
    Wrench,
    X
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShellInboxTray from '../../components/admin/AdminShellInboxTray'
import { useAuth } from '../../context/useAuth'
import { useAdminInboxUnreadCounts } from '../../hooks/useAdminInboxUnreadCounts'
import { ADMIN_LS, VERDE_ADMIN_NAV_EVENT } from '../../utils/adminNavigation'
import './AdminDashboard.css'

import ContactMessagesManagement from './sections/ContactMessagesManagement'
import EmployersManagement from './sections/EmployersManagement'
import EquipmentAndRentalManagement from './sections/EquipmentAndRentalManagement'
import JobApplicationsManagement from './sections/JobApplicationsManagement'
import JobPaymentsManagement from './sections/JobPaymentsManagement'
import JobSeekersManagement from './sections/JobSeekersManagement'
import JobsAndCategoriesManagement from './sections/JobsAndCategoriesManagement'
/* import MaterialsManagement from './sections/MaterialsManagement' */
import MediaPostsManagement from './sections/MediaPostsManagement'
import OverviewManagement from './sections/OverviewManagement'
import ProjectsManagement from './sections/ProjectsManagement'
import RequestQuotesManagement from './sections/RequestQuotesManagement'
import ServiceRequestsManagement from './sections/ServiceRequestsManagement'
import TechnicianAssignmentsManagement from './sections/TechnicianAssignmentsManagement'
import TechniciansManagement from './sections/TechniciansManagement'
import TermsConditionsManagement from './sections/TermsConditionsManagement'
import UsersManagement from './sections/UsersManagement'

const SECTION_STORAGE = ADMIN_LS.SECTION

const SIDEBAR = [
  { id: 'Dashboard', label: 'Dashboard', Icon: LayoutDashboard, Component: OverviewManagement },
  { id: 'Users', label: 'Users', Icon: Users, Component: UsersManagement },
  { id: 'Employers', label: 'Employers', Icon: Building2, Component: EmployersManagement },
  { id: 'Job Seekers', label: 'Job Seekers', Icon: UserCircle, Component: JobSeekersManagement },
  { id: 'Jobs & Categories', label: 'Jobs & Categories', Icon: List, Component: JobsAndCategoriesManagement },
  { id: 'Job Applications', label: 'Job Applications', Icon: CheckSquare, Component: JobApplicationsManagement },
  { id: 'Job Payments', label: 'Job Payments', Icon: TrendingUp, Component: JobPaymentsManagement },
  { id: 'Equipment & Rental', label: 'Equipment & Rental', Icon: Archive, Component: EquipmentAndRentalManagement },
 /*  { id: 'Materials', label: 'Materials', Icon: Package, Component: MaterialsManagement }, */
  { id: 'Technicians', label: 'Technicians', Icon: Wrench, Component: TechniciansManagement },
  { id: 'Service Requests', label: 'Service Requests', Icon: MessageCircle, Component: ServiceRequestsManagement },
  { id: 'Technician Assignments', label: 'Technician Assignments', Icon: ClipboardList, Component: TechnicianAssignmentsManagement },
  { id: 'Request Quotes', label: 'Request Quotes', Icon: HelpCircle, Component: RequestQuotesManagement },
  { id: 'Projects', label: 'Projects', Icon: FolderOpen, Component: ProjectsManagement },
  { id: 'Media Posts', label: 'Media Posts', Icon: Image, Component: MediaPostsManagement },
  { id: 'Contact Messages', label: 'Contact Messages', Icon: Inbox, Component: ContactMessagesManagement },
  { id: 'Terms & Conditions', label: 'Terms & Conditions', Icon: FileText, Component: TermsConditionsManagement },
]

/**
 * Admin SPA: one full-screen shell (sidebar + top bar + scrollable main).
 * Active section is stored in localStorage (`verde_admin_active_section`).
 */
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { token, role, loading, me, logout } = useAuth()
  
  // Initialize from localStorage, ensuring the saved section is valid
  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem(SECTION_STORAGE)
    const isSectionValid = saved && SIDEBAR.some((s) => s.id === saved)
    return isSectionValid ? saved : 'Dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Keep the current admin section persistent across hard refresh.
  useEffect(() => {
    const exists = SIDEBAR.some((s) => s.id === activeSection)
    localStorage.setItem(SECTION_STORAGE, exists ? activeSection : 'Dashboard')
  }, [activeSection])

  useEffect(() => {
    if (loading) return
    if (!token) {
      navigate(`/auth?next=${encodeURIComponent('/dashboard/admin')}`, { replace: true })
      return
    }
    if (role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    // Restore from localStorage after auth check passes
    const saved = localStorage.getItem(SECTION_STORAGE)
    if (saved && SIDEBAR.some((s) => s.id === saved) && saved !== activeSection) {
      setActiveSection(saved)
    }
  }, [token, role, loading, navigate, activeSection])

  useEffect(() => {
    function syncSectionFromStorage() {
      const next = localStorage.getItem(SECTION_STORAGE) || 'Dashboard'
      setActiveSection(next)
    }
    window.addEventListener(VERDE_ADMIN_NAV_EVENT, syncSectionFromStorage)
    return () => window.removeEventListener(VERDE_ADMIN_NAV_EVENT, syncSectionFromStorage)
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/auth', { replace: true })
  }, [logout, navigate])

  const handleSectionChange = useCallback((id) => {
    setActiveSection(id)
    localStorage.setItem(SECTION_STORAGE, id)
    setSidebarOpen(false)
  }, [])

  const ActiveComponent = SIDEBAR.find((s) => s.id === activeSection)?.Component || OverviewManagement
  const activeLabel = SIDEBAR.find((s) => s.id === activeSection)?.label || activeSection

  const initial = String(me?.name || me?.email || 'A').charAt(0).toUpperCase()

  const inboxCounts = useAdminInboxUnreadCounts(token, activeSection)

  if (loading && token) {
    return (
      <div className="adminShell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 700, color: '#64748b' }}>Loading…</p>
      </div>
    )
  }

  if (!token || role !== 'admin') {
    return null
  }

  return (
    <div className="adminShell">
      {sidebarOpen ? <div className="adminShellOverlay" aria-hidden onClick={() => setSidebarOpen(false)} /> : null}

      <aside
        className={`adminShellSidebar ${sidebarOpen ? 'adminShellSidebar--open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="adminShellSidebarHead">
          <button type="button" className="adminShellCloseMobile" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
          <h1 className="adminShellSidebarTitle">Admin panel</h1>
          <p className="adminShellSidebarSub">Welcome, {me?.name || me?.email || 'Admin'}</p>
        </div>

        <nav className="adminShellNav">
          {SIDEBAR.map((entry) => {
            const IconComponent = entry.Icon
            return (
              <button
                key={entry.id}
                type="button"
                className={`adminShellNavBtn ${activeSection === entry.id ? 'adminShellNavBtn--active' : ''}`}
                onClick={() => handleSectionChange(entry.id)}
              >
                <IconComponent className="adminShellNavIcon" size={18} strokeWidth={2} />
                {entry.label}
              </button>
            )
          })}
        </nav>

        <div className="adminShellSidebarFoot">
          <button type="button" className="adminShellLogout" onClick={handleLogout}>
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="adminShellMainCol">
        <header className="adminShellHeader">
          <div className="adminShellHeaderLeft">
            <button type="button" className="adminShellMenuBtn" aria-label="Open menu" onClick={() => setSidebarOpen((o) => !o)}>
              <Menu size={22} />
            </button>
            <h2 className="adminShellHeaderTitle">{activeLabel}</h2>
          </div>
          <div className="adminShellHeaderTrailing">
            <AdminShellInboxTray
              quotes={inboxCounts.quotes}
              service={inboxCounts.service}
              contact={inboxCounts.contact}
              onOpenSection={handleSectionChange}
            />
            <div className="adminShellAvatar" aria-hidden title={me?.email || ''}>
              {initial}
            </div>
          </div>
        </header>

        <main
          className={
            activeSection === 'Dashboard' ? 'adminShellContent adminShellContent--fit' : 'adminShellContent'
          }
        >
          <ActiveComponent />
        </main>
      </div>
    </div>
  )
}
