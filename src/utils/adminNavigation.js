/**
 * Admin SPA navigation: single route `/dashboard/admin` + localStorage for active section/tabs.
 * Legacy URLs like `/dashboard/admin/manage/jobs` redirect here after applying storage.
 */

export const ADMIN_LS = {
  SECTION: 'verde_admin_active_section',
  USERS_TAB: 'verde_admin_users_tab',
  JOBS_TAB: 'verde_admin_jobs_tab',
  EQUIP_TAB: 'verde_admin_equipment_tab',
  MAT_TAB: 'verde_admin_materials_tab',
}

export const VERDE_ADMIN_NAV_EVENT = 'verde:admin-nav-updated'

/** API manage key → section + optional tab keys */
const MANAGE_KEY_MAP = {
  users: { section: 'Users', usersTab: 'records' },
  employers: { section: 'Employers' },
  job_seekers: { section: 'Job Seekers' },
  jobs: { section: 'Jobs & Categories', jobsTab: 'jobs' },
  job_categories: { section: 'Jobs & Categories', jobsTab: 'job_categories' },
  job_applications: { section: 'Job Applications' },
  job_payments: { section: 'Job Payments' },
  equipment: { section: 'Equipment & Rental', equipTab: 'equipment' },
  equipment_bookings: { section: 'Equipment & Rental', equipTab: 'equipment_bookings' },
  materials: { section: 'Materials', matTab: 'materials' },
  material_orders: { section: 'Materials', matTab: 'material_orders' },
  technicians: { section: 'Technicians' },
  service_requests: { section: 'Service Requests' },
  technician_assignments: { section: 'Technician Assignments' },
  request_quotes: { section: 'Request Quotes' },
  projects: { section: 'Projects' },
  contact_messages: { section: 'Contact Messages' },
}

export function applyManageKey(key) {
  const def = MANAGE_KEY_MAP[key]
  if (!def) return
  localStorage.setItem(ADMIN_LS.SECTION, def.section)
  if (def.usersTab) localStorage.setItem(ADMIN_LS.USERS_TAB, def.usersTab)
  if (def.jobsTab) localStorage.setItem(ADMIN_LS.JOBS_TAB, def.jobsTab)
  if (def.equipTab) localStorage.setItem(ADMIN_LS.EQUIP_TAB, def.equipTab)
  if (def.matTab) localStorage.setItem(ADMIN_LS.MAT_TAB, def.matTab)
  window.dispatchEvent(new Event(VERDE_ADMIN_NAV_EVENT))
}

/** Parse old paths like `/dashboard/admin/manage/job_applications` */
export function applyPathToAdminStorage(path) {
  if (!path) return
  if (path.includes('/manage/')) {
    const part = path.split('/manage/')[1]?.split('?')[0]?.split('/')[0]
    if (part) applyManageKey(part)
    return
  }
  if (path.includes('/dashboard/admin/users')) {
    localStorage.setItem(ADMIN_LS.SECTION, 'Users')
    localStorage.setItem(ADMIN_LS.USERS_TAB, 'directory')
    window.dispatchEvent(new Event(VERDE_ADMIN_NAV_EVENT))
  }
}

/** Props for <Link> that go to `#/dashboard/admin` after setting storage */
export function buildAdminLinkProps(linkTo) {
  if (!linkTo) return { to: '/dashboard/admin' }
  return {
    to: '/dashboard/admin',
    onClick: () => applyPathToAdminStorage(linkTo),
  }
}
