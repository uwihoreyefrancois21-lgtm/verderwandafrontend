/** Helpers for admin “management” pages (approve / reject / view). */

export function normalizeStatus(s) {
  return String(s || '').trim().toLowerCase()
}

/** Contact message treated as “read” for badge + row label. */
export const CONTACT_READ_STATUSES = new Set([
  'read',
  'resolved',
  'closed',
  'archived',
  'replied',
  'done',
  'answered',
  'processed',
  'seen',
])

export function isContactMessageRead(item) {
  return CONTACT_READ_STATUSES.has(normalizeStatus(item?.status))
}

/** Read/unread for inbox-style admin cards (contact = server status; service/quote = local map). */
export function isAdminInboxRead(resourceKey, item, readMap, idKey) {
  if (resourceKey === 'contact_messages') return isContactMessageRead(item)
  if (resourceKey === 'service_requests' || resourceKey === 'request_quotes') {
    const rid = idKey != null && item ? String(item[idKey]) : ''
    return Boolean(readMap && readMap[rid] === true)
  }
  return true
}

/** Service / quote “read” flags in localStorage (`verde_admin_inbox_read_*`). */
export const ADMIN_INBOX_LOCAL_READ_KEYS = new Set(['service_requests', 'request_quotes'])

export function loadAdminInboxReadMap(key) {
  if (!ADMIN_INBOX_LOCAL_READ_KEYS.has(key)) return {}
  try {
    const s = localStorage.getItem(`verde_admin_inbox_read_${key}`)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

/** Count items not marked read in local map (missing key = unread). */
export function countLocalInboxUnread(items, idKey, readMap) {
  if (!Array.isArray(items)) return 0
  let n = 0
  for (const item of items) {
    const id = String(item[idKey])
    if (readMap[id] !== true) n += 1
  }
  return n
}

/** Fired when admin toggles local read state (same-tab; `storage` only fires cross-tab). */
export const VERDE_EVENT_ADMIN_INBOX_READ = 'verde:admin-inbox-read-updated'

/** CSS modifier for `.adminMgmtStatusPill` from a row status label. */
export function adminMgmtStatusPillModifier(statusLine) {
  const raw = String(statusLine || '').toLowerCase()
  if (raw.includes('reject')) return 'danger'
  if (raw.includes('unavailable')) return 'muted'
  if (raw.includes('available')) return 'success'
  if (raw.includes('approv') || raw.includes('accept') || raw.includes('active')) return 'success'
  if (raw.includes('inactive') || raw.includes('closed') || raw.includes('archived')) return 'muted'
  if (raw.includes('pending') || raw.includes('new') || raw.includes('open')) return 'pending'
  if (raw === 'unread' || raw.includes('unread')) return 'pending'
  if (raw === 'read') return 'muted'
  return 'neutral'
}

export function isApprovedStatus(s) {
  const v = normalizeStatus(s)
  return v === 'approved' || v === 'accepted' || v === 'accept'
}

export function employerApprovedApplication(a) {
  return isApprovedStatus(a?.employer_status)
}

export function buildApprovePatch(resourceKey, resource, item) {
  if (resourceKey === 'users') return { approval_status: 'approved', active: true }
  if (resourceKey === 'job_applications') return { jobseeker_status: 'approved' }
  if (resourceKey === 'technicians') return { status: true }
  if (resource.fields.some((f) => f.key === 'status' && f.type === 'text')) return { status: 'approved' }
  if (resourceKey === 'equipment' && resource.fields.some((f) => f.key === 'availability')) return { availability: true }
  return { status: 'approved' }
}

export function buildRejectPatch(resourceKey, resource, item) {
  if (resourceKey === 'users') return { approval_status: 'rejected', active: false }
  if (resourceKey === 'job_applications') return { jobseeker_status: 'rejected' }
  if (resourceKey === 'technicians') return { status: false }
  if (resource.fields.some((f) => f.key === 'status' && f.type === 'text')) return { status: 'rejected' }
  if (resourceKey === 'equipment' && resource.fields.some((f) => f.key === 'availability')) return { availability: false }
  return { status: 'rejected' }
}

export function rowTitle(item, idKey, label) {
  return (
    String(
      item.title ||
        item.name ||
        item.company_name ||
        item.category_name ||
        item.customer_name ||
        item.email ||
        item.subject ||
        item.service_type ||
        '',
    ).trim() || `${label}`
  )
}

/**
 * @param {object} [options]
 * @param {Record<string, boolean>} [options.readMap] — admin read flags for service_requests / request_quotes (localStorage)
 * @param {string} [options.idKey]
 */
export function rowStatusLine(resourceKey, item, options = {}) {
  const { readMap, idKey } = options
  if (resourceKey === 'users') return item.active === false ? 'inactive' : 'active'
  if (resourceKey === 'contact_messages') return isContactMessageRead(item) ? 'read' : 'unread'
  if (resourceKey === 'service_requests' || resourceKey === 'request_quotes') {
    const base = item.status != null && item.status !== '' ? String(item.status) : '—'
    const rid = idKey != null && item ? String(item[idKey]) : ''
    const read = readMap && readMap[rid] === true
    return `${base} · ${read ? 'read' : 'unread'}`
  }
  if (resourceKey === 'job_applications') {
    return `Seeker: ${item.jobseeker_status || '—'} · Employer: ${item.employer_status || '—'}`
  }
  if (resourceKey === 'technicians') return item.status === false ? 'inactive' : 'active'
  if (resourceKey === 'equipment') {
    const av = item.availability != null ? (item.availability ? 'available' : 'unavailable') : null
    const tot = Number.parseInt(item.total_stock, 10)
    const cur = Number.parseInt(item.current_stock, 10)
    const stock =
      Number.isFinite(tot) && Number.isFinite(cur) ? `${cur} avail / ${tot} fleet` : null
    return [av, stock].filter(Boolean).join(' · ') || '—'
  }
  if (item.status != null && item.status !== '') return String(item.status)
  return '—'
}

/** Client-side filter for admin dataset cards (search box). */
export function matchesAdminDatasetSearch(resourceKey, item, resource, query, readMap) {
  const qt = String(query || '').trim().toLowerCase()
  if (!qt) return true
  const parts = [
    rowTitle(item, resource.idKey, resource.label),
    rowStatusLine(resourceKey, item, { readMap, idKey: resource.idKey }),
    ...managementDetailLines(resourceKey, item, resource).map((l) => `${l.label} ${l.value}`),
  ]
  for (const f of resource.fields) {
    const v = item[f.key]
    if (v != null && typeof v !== 'object') parts.push(String(v))
  }
  const hay = parts.join(' ').toLowerCase()
  return hay.includes(qt)
}

function truncateText(s, max = 96) {
  if (s == null || s === '') return null
  const t = String(s).trim()
  if (!t) return null
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/**
 * Key/value lines for the admin management table “Details” column (no modal required).
 */
export function managementDetailLines(resourceKey, item, resource) {
  const lines = []
  const push = (label, val, opts = {}) => {
    if (val == null || val === '') return
    const t = String(val).trim()
    if (!t) return
    lines.push({ label, value: t, mailto: Boolean(opts.mailto) })
  }

  if (resourceKey === 'users') {
    push('Email', item.email, { mailto: true })
    push('Phone', item.phone)
    push('Role', item.role)
    return lines
  }

  if (resourceKey === 'contact_messages') {
    push('Name', item.name)
    push('Email', item.email, { mailto: true })
    push('Phone', item.phone)
    push('Subject', item.subject)
    push('Message', truncateText(item.message, 200))
    return lines
  }

  if (resourceKey === 'service_requests') {
    push('Phone', item.phone)
    const srEmail = String(item.customer_email || item.email || '').trim()
    if (srEmail) push('Email', srEmail, { mailto: true })
    else lines.push({ label: 'Email', value: '—', mailto: false })
    push('Location', item.location)
    push('Service', item.service_type)
    push('Description', truncateText(item.description, 120))
    return lines
  }

  if (resourceKey === 'equipment') {
    push('Category', item.category)
    push('Price / day', item.price_per_day != null ? String(item.price_per_day) : null)
    if (item.total_stock != null || item.current_stock != null) {
      const tot = Math.max(0, Number.parseInt(item.total_stock, 10) || 0)
      const cur = Math.max(0, Number.parseInt(item.current_stock, 10) || 0)
      lines.push({ label: 'Fleet (total)', value: String(tot), mailto: false })
      lines.push({ label: 'Available', value: String(cur), mailto: false })
      lines.push({ label: 'Out on rent', value: String(Math.max(0, tot - cur)), mailto: false })
    }
    return lines
  }

  if (resourceKey === 'equipment_bookings') {
    push('Equipment', item.equipment_name || item.name)
    if (item.quantity != null) push('Units', item.quantity)
    push('Customer', item.customer_name)
    if (item.customer_email) push('Email', item.customer_email, { mailto: true })
    push('Phone', item.phone)
    if (item.payment_proof) push('Payment proof', 'Attached')
    if (item.start_date || item.end_date) {
      push('Dates', item.start_date && item.end_date ? `${item.start_date} → ${item.end_date}` : item.start_date || item.end_date)
    }
    push('Total', item.total_price)
    return lines
  }

  if (resourceKey === 'technician_assignments') {
    // Show rich “who requested what + who will do it” details.
    push('Requested by', item.customer_name)
    if (item.customer_email) push('Requested email', item.customer_email)
    push('Customer phone', item.phone)
    push('Request location', item.location)
    push('Service type', item.service_type)
    push('Request details', truncateText(item.description, 140))

    push('Technician', item.technician_name)
    if (item.technician_phone) push('Technician phone', item.technician_phone)
    if (item.technician_specialization) push('Specialization', item.technician_specialization)
    return lines
  }

  if (resourceKey === 'material_orders') {
    push('Phone', item.phone)
    push('Qty', item.quantity)
    push('Delivery', truncateText(item.delivery_address, 120))
    push('Total', item.total_price)
    return lines
  }

  if (resourceKey === 'job_payments') {
    push('Job Seeker', item.jobseeker_name)
    if (item.jobseeker_phone) push('Job Seeker Phone', item.jobseeker_phone)
    if (item.jobseeker_email) push('Job Seeker Email', item.jobseeker_email, { mailto: true })
    push('Job', item.job_title)
    push('Employer', item.employer_name)
    if (item.employer_phone) push('Employer Phone', item.employer_phone)
    if (item.employer_email) push('Employer Email', item.employer_email, { mailto: true })
    push('Amount', item.amount)
    push('Payment Method', item.payment_method)
    push('Status', item.status)
    if (item.created_at) push('Created', item.created_at)
    if (item.payment_proof) push('Payment proof', 'Attached')
    return lines
  }

  if (resourceKey === 'job_applications') {
    push('Job', item.job_title)
    push('Location', item.job_location)

    push('Employer', item.employer_name)
    push('Employer Phone', item.employer_phone)
    push('Employer Email', item.employer_email)

    push('Job Seeker', item.jobseeker_name || item.applicant_name)
    push('Job Seeker Phone', item.jobseeker_phone)
    push('Job Seeker Email', item.jobseeker_email)

    if (item.diploma_file) push('Diploma', 'Attached')
    return lines
  }

  if (resourceKey === 'request_quotes') {
    push('Email', item.email, { mailto: true })
    push('Phone', item.phone)
    push('Service', item.service_type)
    push('Location', item.location)
    push('Project', truncateText(item.project_description, 120))
    if (item.attachment) push('Attachment', 'Attached')
    return lines
  }

  if (resourceKey === 'employers') {
    push('Company', item.company_name)
    push('Address', truncateText(item.company_address, 160))
    return lines
  }

  if (resourceKey === 'job_seekers') {
    push('Skills', truncateText(item.skills, 120))
    push('Experience', truncateText(item.experience, 120))
    if (item.cv_file) push('CV', 'Attached')
    return lines
  }

  for (const f of resource.fields) {
    if (f.key === resource.idKey) continue
    if (f.key === 'status') continue
    if (f.type === 'password') continue
    let v = item[f.key]
    if (f.type === 'file' && v) v = 'File attached'
    else if (f.type === 'boolean') v = v ? 'Yes' : 'No'
    else if (f.type === 'textarea' && typeof v === 'string') v = truncateText(v, 100)
    if (v == null || v === '') continue
    push(f.label, v)
    if (lines.length >= 15) break
  }
  return lines
}
