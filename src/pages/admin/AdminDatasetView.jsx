import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import {
  ADMIN_DATASETS,
  ADMIN_DATASET_HIDE_VIEW_BUTTON,
  ALL_ADMIN_MANAGE_KEYS,
  APPROVAL_RESOURCE_KEYS,
} from '../../config/adminDatasets.config'
import AdminRequestDetailModal from '../../components/admin/AdminRequestDetailModal'
import AdminRecordEditorModal from '../../components/admin/AdminRecordEditorModal'
import AdminEmployerEditorModal from '../../components/admin/AdminEmployerEditorModal'
import AdminJobSeekerEditorModal from '../../components/admin/AdminJobSeekerEditorModal'
import AdminJobsEditorModal from '../../components/admin/AdminJobsEditorModal'
import AdminEquipmentEditorModal from '../../components/admin/AdminEquipmentEditorModal'
import AdminTechnicianAssignmentsEditorModal from '../../components/admin/AdminTechnicianAssignmentsEditorModal'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { useToast } from '../../context/ToastContext.jsx'
import {
  ADMIN_INBOX_LOCAL_READ_KEYS,
  VERDE_EVENT_ADMIN_INBOX_READ,
  adminMgmtStatusPillModifier,
  buildApprovePatch,
  buildRejectPatch,
  employerApprovedApplication,
  isApprovedStatus,
  isAdminInboxRead,
  loadAdminInboxReadMap,
  managementDetailLines,
  matchesAdminDatasetSearch,
  normalizeStatus,
  rowStatusLine,
  rowTitle,
} from '../../utils/adminManagement'

const PAGE_SIZE = 3
const APPROVAL_KEYS_WITH_DELETE = ['service_requests', 'request_quotes', 'material_orders']
const LEGACY_MODAL_MAP = {
  job_applications: 'application',
  equipment_bookings: 'booking',
  material_orders: 'order',
  service_requests: 'request',
}

/** @param {'open' | 'download'} mode */
async function downloadSignedFile(url, filename) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Could not download file')
  const ct = String(r.headers.get('content-type') || '').toLowerCase()
  // Prevent saving HTML error pages as fake attachments.
  if (ct.includes('text/html')) {
    throw new Error('Download failed: server returned an HTML page instead of a file.')
  }
  const blob = await r.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** @param {'open' | 'download'} mode */
async function requestQuoteFileAction({ token, quoteId, mode }) {
  const res = await apiFetch(`/request-quotes/${quoteId}/signed-file?field=attachment`, { token })
  const url = res && typeof res === 'object' ? res.url : null
  const filename =
    (res && typeof res === 'object' && res.filename) || `request-quote-${quoteId}-attachment`
  if (!url) throw new Error('File URL not available')
  if (mode === 'download') {
    await downloadSignedFile(url, filename)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/** @param {'open' | 'download'} mode */
async function jobPaymentProofAction({ token, paymentId, mode }) {
  const res = await apiFetch(`/job-payments/${paymentId}/signed-file?field=payment_proof`, { token })
  const url = res && typeof res === 'object' ? res.url : null
  const filename =
    (res && typeof res === 'object' && res.filename) || `job-payment-${paymentId}-proof`
  if (!url) throw new Error('File URL not available')
  if (mode === 'download') {
    await downloadSignedFile(url, filename)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function useDatasetState(datasetKey, options = {}) {
  const { enabled = true } = options
  const key = datasetKey
  const { token, role } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalBusy, setModalBusy] = useState(false)
  const [legacyModal, setLegacyModal] = useState(null)
  const [genericModal, setGenericModal] = useState(null)
  const [editor, setEditor] = useState(null)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxReadMap, setInboxReadMap] = useState({})
  const [paymentLinkFilter, setPaymentLinkFilter] = useState({ jobId: '', jobSeekerId: '' })
  const [paymentLinkMeta, setPaymentLinkMeta] = useState({ jobTitle: '', jobSeekerName: '' })
  const [paidJobIds, setPaidJobIds] = useState(new Set())

  const resource = useMemo(() => ADMIN_DATASETS.find((r) => r.key === key) || null, [key])
  const validKey = resource && ALL_ADMIN_MANAGE_KEYS.includes(key)
  const showApprovalActions = Boolean(validKey && APPROVAL_RESOURCE_KEYS.includes(key))

  useEffect(() => {
    setItems([])
    setError('')
    setLegacyModal(null)
    setGenericModal(null)
    setEditor(null)
    setSearchQuery('')
    setPage(1)
    setInboxReadMap(loadAdminInboxReadMap(key))
    setPaidJobIds(new Set())
    if (key === 'job_payments') {
      const nextJobId = String(localStorage.getItem('verde_admin_payments_filter_job_id') || '').trim()
      const nextJobSeekerId = String(localStorage.getItem('verde_admin_payments_filter_jobseeker_id') || '').trim()
      const nextJobTitle = String(localStorage.getItem('verde_admin_payments_filter_job_title') || '').trim()
      const nextJobSeekerName = String(localStorage.getItem('verde_admin_payments_filter_jobseeker_name') || '').trim()
      setPaymentLinkFilter({ jobId: nextJobId, jobSeekerId: nextJobSeekerId })
      setPaymentLinkMeta({ jobTitle: nextJobTitle, jobSeekerName: nextJobSeekerName })
    } else {
      setPaymentLinkFilter({ jobId: '', jobSeekerId: '' })
      setPaymentLinkMeta({ jobTitle: '', jobSeekerName: '' })
    }
  }, [key])

  const setInboxReadFlag = useCallback((id, read) => {
    if (!ADMIN_INBOX_LOCAL_READ_KEYS.has(key)) return
    const idStr = String(id)
    setInboxReadMap((prev) => {
      const next = { ...prev, [idStr]: read }
      try {
        localStorage.setItem(`verde_admin_inbox_read_${key}`, JSON.stringify(next))
      } catch {
        /* ignore quota */
      }
      window.dispatchEvent(new Event(VERDE_EVENT_ADMIN_INBOX_READ))
      return next
    })
  }, [key])

  const load = useCallback(async () => {
    if (!resource || !token) return
    setBusy(true)
    setError('')
    try {
      const data = await apiFetch(resource.endpoint, { token })
      setItems(Array.isArray(data) ? data : [])
      if (key === 'job_applications') {
        const payments = await apiFetch('/job-payments', { token })
        const nextPaid = new Set()
        for (const p of Array.isArray(payments) ? payments : []) {
          const st = String(p?.status || '').trim().toLowerCase()
          if (st !== 'paid') continue
          const jid = Number(p?.job_id)
          if (Number.isInteger(jid) && jid > 0) nextPaid.add(jid)
        }
        setPaidJobIds(nextPaid)
      }
    } catch (e) {
      setError(e.message || 'Failed to load')
      setItems([])
    } finally {
      setBusy(false)
    }
  }, [resource, token, key])

  useEffect(() => {
    if (!enabled || !token || role !== 'admin' || !validKey) return
    void load()
  }, [enabled, token, role, validKey, load])

  const filteredItems = useMemo(() => {
    if (!resource || !key) return []
    return items.filter((item) => {
      const okSearch = matchesAdminDatasetSearch(
        key,
        item,
        resource,
        searchQuery,
        ADMIN_INBOX_LOCAL_READ_KEYS.has(key) ? inboxReadMap : undefined,
      )
      if (!okSearch) return false
      if (key === 'job_payments' && paymentLinkFilter.jobId && paymentLinkFilter.jobSeekerId) {
        const sameJob = String(item.job_id ?? '').trim() === paymentLinkFilter.jobId
        const sameJobSeeker = String(item.jobseeker_id ?? '').trim() === paymentLinkFilter.jobSeekerId
        if (!sameJob || !sameJobSeeker) return false
      }
      return true
    })
  }, [items, key, resource, searchQuery, inboxReadMap, paymentLinkFilter.jobId, paymentLinkFilter.jobSeekerId])

  useEffect(() => {
    setPage(1)
  }, [key, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, page])

  const listRangeLabel = useMemo(() => {
    if (busy) return '…'
    if (items.length === 0) return '0 records'
    const n = filteredItems.length
    if (searchQuery.trim() && n !== items.length) {
      if (n === 0) return `0 matches (${items.length} loaded)`
      if (n <= PAGE_SIZE) return `${n} matches (${items.length} loaded)`
      const start = (page - 1) * PAGE_SIZE
      const from = start + 1
      const to = Math.min(start + PAGE_SIZE, n)
      return `${n} matches · ${from}–${to} (${items.length} loaded)`
    }
    if (n === 0) return '0 records'
    if (n <= PAGE_SIZE) return `${n} records`
    const start = (page - 1) * PAGE_SIZE
    const from = start + 1
    const to = Math.min(start + PAGE_SIZE, n)
    return `${n} records · ${from}–${to}`
  }, [busy, items.length, filteredItems.length, page, searchQuery])

  // Admin policy:
  // - `equipment_bookings` are not meant to be created from admin UI.
  // - Other datasets follow standard CRUD rules; approval queues (Accept/Reject) do not allow adding.
  const canAddRecord = !showApprovalActions && key !== 'contact_messages' && key !== 'equipment_bookings'
  const addButtonLabel = key === 'projects' ? 'Add project' : key === 'job_categories' ? 'Add job category' : 'Add record'

  async function patchItem(id, body) {
    try {
      await apiFetch(`${resource.endpoint}/${id}`, { method: 'PATCH', token, jsonBody: body })
      await load()
      if (key === 'contact_messages') {
        window.dispatchEvent(new Event('verde:contact-inbox-updated'))
      }
      toastSuccess('Saved successfully.')
    } catch (e) {
      toastError(e?.message || 'Save failed.')
      throw e
    }
  }

  async function deleteItem(id) {
    try {
      await apiFetch(`${resource.endpoint}/${id}`, { method: 'DELETE', token })
      await load()
      if (key === 'contact_messages') {
        window.dispatchEvent(new Event('verde:contact-inbox-updated'))
      }
      toastSuccess('Deleted successfully.')
    } catch (e) {
      toastError(e?.message || 'Delete failed.')
      throw e
    }
  }

  async function handleLegacyApprove() {
    if (!legacyModal) return
    const { kind, data } = legacyModal
    setModalBusy(true)
    try {
      if (kind === 'application') await patchItem(data.application_id, { jobseeker_status: 'approved' })
      if (kind === 'booking') await patchItem(data.booking_id, { status: 'approved' })
      if (kind === 'order') await patchItem(data.order_id, { status: 'approved' })
      if (kind === 'request') await patchItem(data.request_id, { status: 'approved' })
      setLegacyModal(null)
    } finally {
      setModalBusy(false)
    }
  }

  async function handleLegacyReject() {
    if (!legacyModal) return
    const { kind, data } = legacyModal
    setModalBusy(true)
    try {
      if (kind === 'application') await patchItem(data.application_id, { jobseeker_status: 'rejected' })
      if (kind === 'booking') await patchItem(data.booking_id, { status: 'rejected' })
      if (kind === 'order') await patchItem(data.order_id, { status: 'rejected' })
      if (kind === 'request') await patchItem(data.request_id, { status: 'rejected' })
      setLegacyModal(null)
    } finally {
      setModalBusy(false)
    }
  }

  async function handleGenericApprove() {
    if (!genericModal) return
    const body = buildApprovePatch(key, resource, genericModal)
    setModalBusy(true)
    try {
      await patchItem(genericModal[resource.idKey], body)
      setGenericModal(null)
    } finally {
      setModalBusy(false)
    }
  }

  async function handleGenericReject() {
    if (!genericModal) return
    const body = buildRejectPatch(key, resource, genericModal)
    setModalBusy(true)
    try {
      await patchItem(genericModal[resource.idKey], body)
      setGenericModal(null)
    } finally {
      setModalBusy(false)
    }
  }

  const legacyApproveDisabled =
    legacyModal?.kind === 'application'
      ? isApprovedStatus(legacyModal.data.jobseeker_status) || normalizeStatus(legacyModal.data.jobseeker_status) === 'rejected'
      : legacyModal
        ? isApprovedStatus(legacyModal.data?.status)
        : true

  const legacyRejectDisabled =
    legacyModal?.kind === 'application'
      ? isApprovedStatus(legacyModal.data.jobseeker_status) || normalizeStatus(legacyModal.data.jobseeker_status) === 'rejected'
      : false

  const genericApproveDisabled = genericModal
    ? key === 'users'
      ? genericModal.active !== false
      : key === 'technicians'
        ? genericModal.status === true
        : isApprovedStatus(genericModal.status) || normalizeStatus(genericModal.status) === 'rejected'
    : true

  const genericRejectDisabled = genericModal
    ? key === 'users'
      ? genericModal.active === false
      : key === 'technicians'
        ? genericModal.status === false
        : normalizeStatus(genericModal.status) === 'rejected'
    : true

  function approvalAcceptDisabled(item) {
    if (key === 'job_applications') {
      const paidForJob = paidJobIds.has(Number(item?.job_id))
      if (paidForJob) return true
      return isApprovedStatus(item.jobseeker_status) || normalizeStatus(item.jobseeker_status) === 'rejected'
    }
    return isApprovedStatus(item.status) || normalizeStatus(item.status) === 'rejected'
  }

  function approvalRejectDisabled(item) {
    if (key === 'job_applications') {
      return isApprovedStatus(item.jobseeker_status) || normalizeStatus(item.jobseeker_status) === 'rejected'
    }
    return isApprovedStatus(item.status) || normalizeStatus(item.status) === 'rejected'
  }

  return {
    enabled,
    key,
    resource,
    validKey,
    token,
    role,
    items,
    busy,
    error,
    modalBusy,
    legacyModal,
    setLegacyModal,
    genericModal,
    setGenericModal,
    editor,
    setEditor,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    showApprovalActions,
    load,
    filteredItems,
    pageSlice,
    totalPages,
    listRangeLabel,
    canAddRecord,
    addButtonLabel,
    patchItem,
    deleteItem,
    handleLegacyApprove,
    handleLegacyReject,
    handleGenericApprove,
    handleGenericReject,
    legacyApproveDisabled,
    legacyRejectDisabled,
    genericApproveDisabled,
    genericRejectDisabled,
    approvalAcceptDisabled,
    approvalRejectDisabled,
    inboxReadMap,
    setInboxReadFlag,
    paymentLinkFilter,
    setPaymentLinkFilter,
    paymentLinkMeta,
    setPaymentLinkMeta,
  }
}

function GenericDetailModal({
  datasetKey,
  open,
  resource,
  item,
  onClose,
  onApprove,
  onReject,
  busy,
  approveDisabled,
  rejectDisabled,
  showApprovalActions,
}) {
  const [enhancedItem, setEnhancedItem] = useState(item)
  const { error: toastError } = useToast()
  const { token } = useAuth()
  const [fileBusy, setFileBusy] = useState(false)

  useEffect(() => {
    setEnhancedItem(item)
  }, [item])

  // Technician assignments: backend may or may not join request/technician details.
  // If names/emails are missing, fetch them by ID so the UI is always professional.
  useEffect(() => {
    let cancelled = false
    async function enhance() {
      if (!open) return
      if (datasetKey !== 'technician_assignments') return
      if (!item) return

      const requestId = item.request_id
      const technicianId = item.technician_id

      const needsRequest = !item.customer_name && requestId
      const needsTech = !item.technician_name && technicianId
      if (!needsRequest && !needsTech) return

      try {
        const [reqRes, techRes] = await Promise.all([
          needsRequest ? apiFetch(`/service-requests/${requestId}`, { token }) : Promise.resolve(null),
          needsTech ? apiFetch(`/technicians/${technicianId}`, { token }) : Promise.resolve(null),
        ])
        if (cancelled) return

        const next = { ...item }
        if (reqRes && typeof reqRes === 'object') {
          next.customer_name = reqRes.customer_name ?? next.customer_name
          next.customer_email = reqRes.customer_email ?? next.customer_email
          next.phone = reqRes.phone ?? next.phone
          next.location = reqRes.location ?? next.location
          next.service_type = reqRes.service_type ?? next.service_type
          next.description = reqRes.description ?? next.description
        }
        if (techRes && typeof techRes === 'object') {
          next.technician_name = techRes.name ?? next.technician_name
          next.technician_email = techRes.email ?? next.technician_email
          next.technician_phone = techRes.phone ?? next.technician_phone
          next.technician_specialization = techRes.specialization ?? next.technician_specialization
        }
        setEnhancedItem(next)
      } catch (e) {
        if (!cancelled) toastError(e?.message || 'Failed to load assignment details.')
      }
    }
    void enhance()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, datasetKey, item?.request_id, item?.technician_id])

  const stop = (e) => e.stopPropagation()
  const hideJobPaymentIds = null
  const effectiveItem = enhancedItem ?? item ?? {}

  if (!open || !item || !resource) return null

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">{resource.label} — details</h2>
          <button type="button" className="adminModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="adminModalBody">
          <div className="adminModalList">
            {datasetKey === 'job_payments' ? (
              <>
                <div className="adminModalRow">
                  <div className="adminModalDt">Payment ID</div>
                  <div className="adminModalDd">{effectiveItem.payment_id || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job Seeker</div>
                  <div className="adminModalDd">{effectiveItem.jobseeker_name || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job Seeker phone</div>
                  <div className="adminModalDd">{effectiveItem.jobseeker_phone || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job Seeker email</div>
                  <div className="adminModalDd">
                    {effectiveItem.jobseeker_email ? (
                      <a className="adminModalLink" href={`mailto:${String(effectiveItem.jobseeker_email)}`} rel="noreferrer">
                        {String(effectiveItem.jobseeker_email)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job</div>
                  <div className="adminModalDd">{effectiveItem.job_title || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Employer</div>
                  <div className="adminModalDd">{effectiveItem.employer_name || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Employer phone</div>
                  <div className="adminModalDd">{effectiveItem.employer_phone || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Employer email</div>
                  <div className="adminModalDd">
                    {effectiveItem.employer_email ? (
                      <a className="adminModalLink" href={`mailto:${String(effectiveItem.employer_email)}`} rel="noreferrer">
                        {String(effectiveItem.employer_email)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job ID</div>
                  <div className="adminModalDd">{effectiveItem.job_id || '—'}</div>
                </div>
                <div className="adminModalRow">
                  <div className="adminModalDt">Job Seeker ID</div>
                  <div className="adminModalDd">{effectiveItem.jobseeker_id || '—'}</div>
                </div>
              </>
            ) : null}
            {(resource?.fields || []).map((f) => {
              const v = effectiveItem[f.key]
              let display
              if (f.type === 'password' && v) display = '••••••'
              else if (f.type === 'boolean') display = v ? 'Yes' : 'No'
              else if (f.type === 'email' && v) {
                display = (
                  <a className="adminModalLink" href={`mailto:${String(v)}`} rel="noreferrer">
                    {String(v)}
                  </a>
                )
              }
              else if (f.type === 'file' && typeof v === 'string' && v) {
                // For payment proofs we must use signed URLs (PDF/Word/image) to avoid 401/404.
                    if (datasetKey === 'job_payments' && f.key === 'payment_proof') {
                  display = (
                    <button
                      type="button"
                      className="adminModalLink"
                      onClick={async () => {
                        try {
                          setFileBusy(true)
                          await jobPaymentProofAction({
                            token,
                            paymentId: effectiveItem.payment_id,
                            mode: 'open',
                          })
                        } catch (e) {
                          toastError(e?.message || 'Could not open file')
                        } finally {
                          setFileBusy(false)
                        }
                      }}
                      disabled={fileBusy || busy}
                      title="Open signed payment proof"
                    >
                      {fileBusy ? 'Opening…' : 'Open payment proof →'}
                    </button>
                  )
                } else if (datasetKey === 'request_quotes' && f.key === 'attachment') {
                  const qid = effectiveItem.quote_id
                  display = (
                    <span className="adminModalInlineActions" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="adminModalLink"
                        onClick={async () => {
                          try {
                            setFileBusy(true)
                            await requestQuoteFileAction({ token, quoteId: qid, mode: 'open' })
                          } catch (e) {
                            toastError(e?.message || 'Could not open file')
                          } finally {
                            setFileBusy(false)
                          }
                        }}
                        disabled={fileBusy || busy}
                        title="Open in a new tab"
                      >
                        {fileBusy ? '…' : 'Open file'}
                      </button>
                      <span aria-hidden className="adminModalSep" style={{ opacity: 0.45 }}>
                        |
                      </span>
                      <button
                        type="button"
                        className="adminModalLink"
                        onClick={async () => {
                          try {
                            setFileBusy(true)
                            await requestQuoteFileAction({ token, quoteId: qid, mode: 'download' })
                          } catch (e) {
                            toastError(e?.message || 'Could not download file')
                          } finally {
                            setFileBusy(false)
                          }
                        }}
                        disabled={fileBusy || busy}
                        title="Download to your device"
                      >
                        {fileBusy ? '…' : 'Download'}
                      </button>
                    </span>
                  )
                } else {
                  display = (
                    <a className="adminModalLink" href={resolveMediaUrl(v)} target="_blank" rel="noreferrer">
                      View file →
                    </a>
                  )
                }
              } else if (f.type === 'textarea' && typeof v === 'string' && v) {
                display = <span className="adminModalPreWrap">{v}</span>
              } else display = v == null || v === '' ? '—' : String(v)
              if (hideJobPaymentIds && hideJobPaymentIds.has(f.key)) return null
              return (
                <div key={f.key} className="adminModalRow">
                  <div className="adminModalDt">{f.label}</div>
                  <div className="adminModalDd">{display}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className={`adminModalFooter ${showApprovalActions ? '' : 'adminModalFooter--solo'}`}>
          <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
            Close
          </button>
          {showApprovalActions ? (
            <div className="adminModalFooterActions">
              <button type="button" className="btn btnDanger btnSm" onClick={onReject} disabled={busy || rejectDisabled}>
                {busy ? '…' : 'Reject'}
              </button>
              <button type="button" className="btn btnGreen btnSm" onClick={onApprove} disabled={busy || approveDisabled}>
                {busy ? '…' : 'Accept'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Single admin dataset UI (CRUD / approvals). Used by each `sections/*Management.jsx` file.
 * @param {{ datasetKey: string, enabled?: boolean }} props — `enabled: false` skips loading (e.g. Users → Directory tab).
 */
export default function AdminDatasetView({ datasetKey, enabled = true }) {
  const p = useDatasetState(datasetKey, { enabled })
  const { error: toastError } = useToast()
  const [proofBusyId, setProofBusyId] = useState(null)
  const [quoteAttachBusyId, setQuoteAttachBusyId] = useState(null)

  const {
    key,
    resource,
    validKey,
    token,
    role,
    items,
    busy,
    error,
    modalBusy,
    legacyModal,
    setLegacyModal,
    genericModal,
    setGenericModal,
    editor,
    setEditor,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    showApprovalActions,
    load,
    filteredItems,
    pageSlice,
    totalPages,
    listRangeLabel,
    canAddRecord,
    addButtonLabel,
    patchItem,
    deleteItem,
    handleLegacyApprove,
    handleLegacyReject,
    handleGenericApprove,
    handleGenericReject,
    legacyApproveDisabled,
    legacyRejectDisabled,
    genericApproveDisabled,
    genericRejectDisabled,
    approvalAcceptDisabled,
    approvalRejectDisabled,
    inboxReadMap,
    setInboxReadFlag,
    paymentLinkFilter,
    setPaymentLinkFilter,
    paymentLinkMeta,
    setPaymentLinkMeta,
  } = p
  const allowManualJobApplicationDecision = key !== 'job_applications'
  const showApprovalActionsInUi = showApprovalActions && allowManualJobApplicationDecision

  const runQuoteAttachment = useCallback(
    async (quoteId, mode) => {
      try {
        setQuoteAttachBusyId(quoteId)
        await requestQuoteFileAction({ token, quoteId, mode })
      } catch (e) {
        toastError(e?.message || (mode === 'download' ? 'Could not download file' : 'Could not open file'))
      } finally {
        setQuoteAttachBusyId(null)
      }
    },
    [token, toastError],
  )

  if (!enabled) return null

  if (!token) {
    const next = `/dashboard/admin`
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  }

  if (role !== 'admin') {
    return (
      <div className="adminMgmtPage adminMgmtPage--gate adminShellInset">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Admin only</div>
        </div>
      </div>
    )
  }

  if (!validKey || !resource) {
    return (
      <div className="adminMgmtPage adminMgmtPage--gate adminShellInset">
        <div className="formCard adminDashGate">
          <div className="emptyStateTitle">Unknown management page</div>
          <Link className="adminPanelLink" to="/dashboard/admin">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="adminMgmtPage adminMgmtShell adminViewportPane adminShellInset">
      {key === 'employers' ? (
        <AdminEmployerEditorModal
          open={editor !== null}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      ) : key === 'job_seekers' ? (
        <AdminJobSeekerEditorModal
          open={editor !== null}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      ) : key === 'jobs' ? (
        <AdminJobsEditorModal
          open={editor !== null}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      ) : key === 'equipment' ? (
        <AdminEquipmentEditorModal
          open={editor !== null}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      ) : key === 'technician_assignments' ? (
        <AdminTechnicianAssignmentsEditorModal
          open={editor !== null}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      ) : (
        <AdminRecordEditorModal
          open={editor !== null}
          resource={resource}
          mode={editor?.mode === 'edit' ? 'edit' : 'create'}
          item={editor?.mode === 'edit' ? editor.item : undefined}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      )}

      <AdminRequestDetailModal
        open={Boolean(legacyModal)}
        kind={legacyModal?.kind}
        data={legacyModal?.data}
        token={token}
        onClose={() => !modalBusy && setLegacyModal(null)}
        onApprove={handleLegacyApprove}
        onReject={handleLegacyReject}
        approveDisabled={legacyApproveDisabled}
        rejectDisabled={legacyRejectDisabled}
        busy={modalBusy}
        showApprovalActions={showApprovalActionsInUi}
      />

      <GenericDetailModal
        datasetKey={key}
        open={Boolean(genericModal) && !(key in LEGACY_MODAL_MAP)}
        resource={resource}
        item={genericModal}
        onClose={() => !modalBusy && setGenericModal(null)}
        onApprove={handleGenericApprove}
        onReject={handleGenericReject}
        busy={modalBusy}
        approveDisabled={genericApproveDisabled}
        rejectDisabled={genericRejectDisabled}
        showApprovalActions={showApprovalActionsInUi}
      />

      <div className="adminMgmtToolbar">
        <Link className="adminHubBack" to="/dashboard/admin">
          ← Dashboard
        </Link>
        <span className="adminResourceCrumb adminResourceCrumb--current" aria-current="page">
          {resource.label}
        </span>
      </div>

      <header className="adminMgmtHeader">
        <div>
          <h1 className="adminMgmtTitle">{resource.label}</h1>
          <p className="adminMgmtSubtitle">
            {showApprovalActionsInUi
              ? 'Approval queue — view details, then accept or reject.'
              : key === 'job_applications'
                ? 'Job applications are auto-approved when related job payment is marked paid.'
              : 'Manage this dataset — view records, add new, or edit and delete.'}
          </p>
        </div>
        <div className="adminMgmtHeaderRight">
          <label className="adminMgmtSearch">
            <span className="adminMgmtSearchLabel">Search</span>
            <input
              type="search"
              className="adminMgmtSearchInput"
              placeholder="Filter records…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter records in this dataset"
            />
          </label>
          <span className="adminMgmtCount">{listRangeLabel}</span>
          {key === 'job_payments' && paymentLinkFilter.jobId && paymentLinkFilter.jobSeekerId ? (
            <button
              type="button"
              className="btn btnOutline btnSm"
              onClick={() => {
                localStorage.removeItem('verde_admin_payments_filter_job_id')
                localStorage.removeItem('verde_admin_payments_filter_jobseeker_id')
                localStorage.removeItem('verde_admin_payments_filter_job_title')
                localStorage.removeItem('verde_admin_payments_filter_jobseeker_name')
                setPaymentLinkFilter({ jobId: '', jobSeekerId: '' })
                setPaymentLinkMeta({ jobTitle: '', jobSeekerName: '' })
              }}
              disabled={busy}
              title="Clear linked-application payment filter"
            >
              Clear payment filter
            </button>
          ) : null}
          {canAddRecord ? (
            <button type="button" className="btn btnGreen btnSm" onClick={() => setEditor({ mode: 'create' })} disabled={busy}>
              {addButtonLabel}
            </button>
          ) : null}
          <button type="button" className="btn btnOutline btnSm" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="toast error" style={{ position: 'static', marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {key === 'job_payments' && paymentLinkFilter.jobId && paymentLinkFilter.jobSeekerId && !busy ? (
        <div className="dashSubtle" style={{ marginBottom: 10 }}>
          Showing payments for <b>{paymentLinkMeta.jobTitle || `job #${paymentLinkFilter.jobId}`}</b> and applicant{' '}
          <b>{paymentLinkMeta.jobSeekerName || `job seeker #${paymentLinkFilter.jobSeekerId}`}</b>.
          {filteredItems.length === 0 ? ' No payment record found yet for this application.' : ''}
        </div>
      ) : null}

      <div className="adminMgmtScroll">
        <div className="adminMgmtCardWrap">
          {items.length === 0 ? (
            <div className="adminMgmtEmpty adminMgmtEmpty--cards">{busy ? 'Loading…' : 'No records yet.'}</div>
          ) : filteredItems.length === 0 ? (
            <div className="adminMgmtEmpty adminMgmtEmpty--cards">No records match your search.</div>
          ) : (
            <div className="adminMgmtCardGrid">
              {pageSlice.map((item) => {
                const id = item[resource.idKey]
                let title = rowTitle(item, resource.idKey, resource.label)
                if (key === 'job_payments') {
                  const seeker = item.jobseeker_name ? String(item.jobseeker_name).trim() : 'Job Seeker'
                  const amount = item.amount != null && item.amount !== '' ? ` — ${item.amount}` : ''
                  title = `${seeker}${amount}`
                }
                if (key === 'job_applications') {
                  const job = item.job_title ? String(item.job_title).trim() : 'Job'
                  const seeker = item.jobseeker_name ? String(item.jobseeker_name).trim() : 'Job Seeker'
                  const loc = item.job_location ? ` (${String(item.job_location).trim()})` : ''
                  title = `${job}${loc} — ${seeker}`
                }
                const statusLine = rowStatusLine(key, item, { readMap: inboxReadMap, idKey: resource.idKey })
                const detailLines = managementDetailLines(key, item, resource)
                const pillMod = adminMgmtStatusPillModifier(statusLine)
                const inboxRead = isAdminInboxRead(key, item, inboxReadMap, resource.idKey)
                const showInboxBell =
                  key === 'contact_messages' || key === 'service_requests' || key === 'request_quotes'
                const showDeleteOnApproval = showApprovalActions && APPROVAL_KEYS_WITH_DELETE.includes(key)

                return (
                  <article
                    key={id}
                    className={`adminMgmtCard ${key === 'job_payments' ? 'adminMgmtCard--compact' : ''}`}
                  >
                    <div className="adminMgmtCardTop">
                      <div className="adminMgmtCardTitleRow">
                        {showInboxBell ? (
                          <span
                            className="adminInboxBellWrap"
                            title={inboxRead ? 'Read' : 'Unread'}
                            aria-label={inboxRead ? 'Read' : 'Unread'}
                          >
                            <Bell
                              className={inboxRead ? 'adminInboxBell adminInboxBell--read' : 'adminInboxBell adminInboxBell--unread'}
                              size={18}
                              strokeWidth={2}
                              aria-hidden
                            />
                          </span>
                        ) : null}
                        <h2 className="adminMgmtCardTitle">{title}</h2>
                      </div>
                      <span className={`adminMgmtStatusPill adminMgmtStatusPill--${pillMod}`} title="Status">
                        {statusLine}
                      </span>
                    </div>
                    {detailLines.length > 0 ? (
                      <ul className="adminMgmtCardMeta">
                        {detailLines.map(({ label: lab, value: val }, idx) => (
                          <li key={`${lab}-${idx}`}>
                            <span className="adminMgmtCardMetaLab">{lab}</span>
                            {(() => {
                              const isEmail = String(lab || '').toLowerCase().includes('email') && String(val || '').includes('@')
                              return isEmail ? (
                                <a className="adminMgmtCardMetaVal adminModalLink" href={`mailto:${String(val)}`} onClick={(e) => e.stopPropagation()}>
                                  {String(val)}
                                </a>
                              ) : (
                                <span className="adminMgmtCardMetaVal">{val}</span>
                              )
                            })()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="adminMgmtCardMuted">No extra fields for this record.</p>
                    )}
                    <div className="adminMgmtCardActions">
                      {!ADMIN_DATASET_HIDE_VIEW_BUTTON.has(key) ? (
                        <button
                          type="button"
                          className="btn btnBlue btnSm adminMgmtActionBtn"
                          title="Open full record"
                          onClick={async () => {
                            const mk = LEGACY_MODAL_MAP[key]
                            if (mk) {
                              setLegacyModal({ kind: mk, data: item })
                              return
                            }

                            // For non-legacy datasets, fetch the latest record by ID.
                            // This avoids UI issues when list rows are missing joined fields.
                            try {
                              const idVal = item?.[resource.idKey]
                              if (!idVal) throw new Error('Missing record id')
                              const fresh = await apiFetch(`${resource.endpoint}/${idVal}`, { token })
                              setGenericModal(fresh && typeof fresh === 'object' ? fresh : item)
                            } catch (e) {
                              toastError(e?.message || 'Failed to open record.')
                              setGenericModal(item)
                            }
                          }}
                        >
                          View
                        </button>
                      ) : null}
                      {key === 'contact_messages' ? (
                        <>
                          <button
                            type="button"
                            className="btn btnOutline btnSm adminMgmtActionBtn"
                            disabled={busy}
                            title={inboxRead ? 'Mark message as unread' : 'Mark message as read'}
                            onClick={() => void patchItem(id, inboxRead ? { status: 'new' } : { status: 'read' })}
                          >
                            {inboxRead ? 'Mark as unread' : 'Mark as read'}
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger btnSm adminMgmtActionBtn"
                            onClick={() => {
                              if (!window.confirm('Delete this message?')) return
                              void deleteItem(id)
                            }}
                          >
                            Delete
                          </button>
                        </>
                      ) : showApprovalActions ? (
                        <>
                          {(key === 'service_requests' || key === 'request_quotes') && (
                            <button
                              type="button"
                              className="btn btnOutline btnSm adminMgmtActionBtn"
                              disabled={busy}
                              title={inboxRead ? 'Mark as unread' : 'Mark as read'}
                              onClick={() => setInboxReadFlag(id, !inboxRead)}
                            >
                              {inboxRead ? 'Mark as unread' : 'Mark as read'}
                            </button>
                          )}
                          {key === 'request_quotes' && item.attachment ? (
                            <>
                              <button
                                type="button"
                                className="btn btnOutline btnSm adminMgmtActionBtn"
                                disabled={busy || quoteAttachBusyId === id}
                                title="Open attachment in a new tab"
                                onClick={() => void runQuoteAttachment(id, 'open')}
                              >
                                {quoteAttachBusyId === id ? '…' : 'Open file'}
                              </button>
                              <button
                                type="button"
                                className="btn btnOutline btnSm adminMgmtActionBtn"
                                disabled={busy || quoteAttachBusyId === id}
                                title="Download attachment"
                                onClick={() => void runQuoteAttachment(id, 'download')}
                              >
                                {quoteAttachBusyId === id ? '…' : 'Download'}
                              </button>
                            </>
                          ) : null}
                          {key !== 'job_applications' ? (
                            <>
                              <button
                                type="button"
                                className="btn btnGreen btnSm adminMgmtActionBtn"
                                onClick={async () => {
                                  const body = buildApprovePatch(key, resource, item)
                                  await patchItem(id, body)
                                }}
                                disabled={approvalAcceptDisabled(item) || busy}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btnDanger btnSm adminMgmtActionBtn"
                                onClick={async () => {
                                  const body = buildRejectPatch(key, resource, item)
                                  await patchItem(id, body)
                                }}
                                disabled={approvalRejectDisabled(item) || busy}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          {key === 'equipment_bookings' ? (
                            <button
                              type="button"
                              className="btn btnOutline btnSm adminMgmtActionBtn"
                              onClick={async () => {
                                await patchItem(id, {
                                  status: 'returned',
                                  returned: true,
                                  returned_at: new Date().toISOString(),
                                })
                              }}
                              disabled={busy || normalizeStatus(item.status) === 'returned'}
                              title="Mark equipment as returned and restore available units"
                            >
                              Mark returned
                            </button>
                          ) : null}
                          {showDeleteOnApproval ? (
                            <button
                              type="button"
                              className="btn btnDanger btnSm adminMgmtActionBtn adminMgmtActionBtn--outline"
                              onClick={() => {
                                if (!window.confirm(`Delete this ${resource.label} record? This cannot be undone.`)) return
                                void deleteItem(id)
                              }}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          ) : null}
                          {key === 'job_applications' ? (
                            <button
                              type="button"
                              className="btn btnDanger btnSm adminMgmtActionBtn adminMgmtActionBtn--outline"
                              onClick={() => {
                                if (!window.confirm('Delete this Job Applications record? This cannot be undone.')) return
                                void deleteItem(id)
                              }}
                              disabled={busy}
                              title="Delete job application"
                            >
                              <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {key === 'job_payments' && item.payment_proof ? (
                            <button
                              type="button"
                              className="btn btnOutline btnSm adminMgmtActionBtn"
                              disabled={busy || proofBusyId === id}
                              onClick={async () => {
                                try {
                                  setProofBusyId(id)
                                  await jobPaymentProofAction({ token, paymentId: id, mode: 'download' })
                                } catch (e) {
                                  toastError(e?.message || 'Could not download payment proof')
                                } finally {
                                  setProofBusyId(null)
                                }
                              }}
                            >
                              {proofBusyId === id ? '…' : 'Download proof'}
                            </button>
                          ) : null}
                          {key === 'request_quotes' && item.attachment ? (
                            <>
                              <button
                                type="button"
                                className="btn btnOutline btnSm adminMgmtActionBtn"
                                disabled={busy || quoteAttachBusyId === id}
                                title="Open attachment in a new tab"
                                onClick={() => void runQuoteAttachment(id, 'open')}
                              >
                                {quoteAttachBusyId === id ? '…' : 'Open file'}
                              </button>
                              <button
                                type="button"
                                className="btn btnOutline btnSm adminMgmtActionBtn"
                                disabled={busy || quoteAttachBusyId === id}
                                title="Download attachment"
                                onClick={() => void runQuoteAttachment(id, 'download')}
                              >
                                {quoteAttachBusyId === id ? '…' : 'Download'}
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="btn btnOutline btnSm adminMgmtActionBtn"
                            onClick={() => setEditor({ mode: 'edit', item })}
                            disabled={busy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger btnSm adminMgmtActionBtn"
                            onClick={() => {
                              if (!window.confirm(`Delete this ${resource.label} record? This cannot be undone.`)) return
                              void deleteItem(id)
                            }}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {filteredItems.length > 0 ? (
          <div className="adminMgmtPagination" role="navigation" aria-label="Pages">
            <button
              type="button"
              className="btn btnOutline btnSm adminMgmtPageBtn"
              disabled={page <= 1 || busy}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        ) : null}

        <p className="adminMgmtFootnote">
          {key === 'contact_messages'
            ? 'Mark messages read or unread. The header badge counts unread messages only.'
            : key === 'service_requests' || key === 'request_quotes'
              ? 'Bell shows read vs unread (saved in this browser). Use Mark as read / Mark as unread alongside Accept and Reject.'
              : key === 'job_applications'
                ? 'Job applications no longer require manual Accept/Reject. Mark the related job payment as paid to auto-approve.'
              : showApprovalActions
                ? 'Accept and reject are available on approval queues; service requests, request quotes, and material orders also include delete when needed.'
                : 'All create, update, and delete actions for this area are handled on this page.'}
        </p>
      </div>
    </div>
  )
}
