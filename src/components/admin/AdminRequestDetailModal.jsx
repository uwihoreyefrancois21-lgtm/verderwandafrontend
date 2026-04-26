import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'
import { resolveMediaUrl } from '../../utils/mediaUrl'

function Row({ label, children }) {
  return (
    <div className="adminModalRow">
      <div className="adminModalDt">{label}</div>
      <div className="adminModalDd">{children}</div>
    </div>
  )
}

function formatVal(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

/**
 * Legacy “rich” detail modal for job applications, equipment bookings, material orders, service requests.
 */
export default function AdminRequestDetailModal({
  open,
  kind,
  data,
  token,
  onClose,
  onApprove,
  onReject,
  approveDisabled,
  rejectDisabled,
  busy,
  showApprovalActions,
}) {
  if (!open || !data) return null

  const { error: toastError } = useToast()

  const stop = (e) => e.stopPropagation()

  let title = 'Details'
  if (kind === 'application') title = 'Job application'
  if (kind === 'booking') title = 'Equipment booking'
  if (kind === 'order') title = 'Material order'
  if (kind === 'request') title = 'Service request'

  const applicationId = useMemo(() => data?.application_id, [data])
  const bookingId = useMemo(() => data?.booking_id, [data])
  const orderId = useMemo(() => data?.order_id, [data])
  const [fileBusyField, setFileBusyField] = useState('')
  const [bookingEquipmentName, setBookingEquipmentName] = useState('')
  const [bookingPaymentProofSignedUrl, setBookingPaymentProofSignedUrl] = useState('')
  const [bookingPaymentProofBusy, setBookingPaymentProofBusy] = useState(false)

  function getUrlExt(url) {
    if (!url) return ''
    try {
      const path = String(url).split('?')[0]
      const dot = path.lastIndexOf('.')
      if (dot === -1) return ''
      return path.slice(dot + 1).toLowerCase()
    } catch {
      return ''
    }
  }

  const bookingPaymentProofExt = getUrlExt(data?.payment_proof)
  const paymentProofIsImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(bookingPaymentProofExt)

  async function openSignedJobApplicationFile(field) {
    if (!applicationId) return
    setFileBusyField(field)
    try {
      const res = await apiFetch(`/job-applications/${applicationId}/signed-file?field=${encodeURIComponent(field)}`, { token })
      const url = res && typeof res === 'object' ? res.url : null
      if (!url) {
        throw new Error('File URL not available')
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(e?.message || 'Could not open file')
    } finally {
      setFileBusyField('')
    }
  }

  async function openSignedBookingPaymentProof(field) {
    if (!bookingId) return
    setFileBusyField(field)
    try {
      setBookingPaymentProofBusy(true)
      const res = await apiFetch(`/equipment-bookings/${bookingId}/signed-file?field=${encodeURIComponent(field)}`, { token })
      const url = res && typeof res === 'object' ? res.url : null
      if (!url) throw new Error('File URL not available')
      setBookingPaymentProofSignedUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      const msg = e?.message || 'Could not open file'
      // Fallback: if signed endpoint isn't available yet, try opening the stored URL directly.
      // This may still 401 if the file is private; but at least we show something helpful.
      if (Number(e?.status) === 404 && data?.payment_proof) {
        try {
          const url = resolveMediaUrl(data.payment_proof)
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        } catch {
          // ignore and show toast below
        }
      }
      toastError(msg)
    } finally {
      setFileBusyField('')
      setBookingPaymentProofBusy(false)
    }
  }

  async function openSignedMaterialOrderPaymentProof(field) {
    if (!orderId) return
    setFileBusyField(field)
    try {
      const res = await apiFetch(`/material-orders/${orderId}/signed-file?field=${encodeURIComponent(field)}`, { token })
      const url = res && typeof res === 'object' ? res.url : null
      if (!url) throw new Error('File URL not available')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(e?.message || 'Could not open file')
    } finally {
      setFileBusyField('')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadEquipmentName() {
      if (!open) return
      if (kind !== 'booking') return
      if (!data) return
      const hasName = Boolean(data.equipment_name || data.name)
      if (hasName) return
      const equipmentId = data.equipment_id
      if (!equipmentId) return
      try {
        const res = await apiFetch(`/equipment/${equipmentId}`, { token })
        if (!cancelled) setBookingEquipmentName(res?.name || '')
      } catch {
        if (!cancelled) setBookingEquipmentName('')
      }
    }
    void loadEquipmentName()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, data?.booking_id, data?.equipment_id])

  useEffect(() => {
    // Ensure we don't show a previous booking's signed file.
    if (!open || kind !== 'booking') return
    setBookingPaymentProofSignedUrl('')
  }, [open, kind, data?.booking_id])

  useEffect(() => {
    let cancelled = false
    async function preloadPaymentProof() {
      if (!open) return
      if (kind !== 'booking') return
      if (!bookingId) return
      if (!data?.payment_proof) return
      if (bookingPaymentProofSignedUrl) return
      try {
        const res = await apiFetch(`/equipment-bookings/${bookingId}/signed-file?field=${encodeURIComponent('payment_proof')}`, { token })
        const url = res && typeof res === 'object' ? res.url : null
        if (!cancelled && url) setBookingPaymentProofSignedUrl(url)
      } catch {
        // Keep UI usable even if preview preloading fails.
      }
    }
    void preloadPaymentProof()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, bookingId, data?.payment_proof, token])

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">{title}</h2>
          <button type="button" className="adminModalClose" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>
        <div className="adminModalBody">
          <div className="adminModalList">
            {kind === 'application' ? (
              <>
                <Row label="Job title">{formatVal(data.job_title)}</Row>
                <Row label="Job location">{formatVal(data.job_location)}</Row>
                <Row label="Employer status">{formatVal(data.employer_status)}</Row>
                <Row label="Jobseeker status">{formatVal(data.jobseeker_status)}</Row>

                <Row label="Employer">{formatVal(data.employer_name)}</Row>
                <Row label="Employer phone">{formatVal(data.employer_phone)}</Row>
                <Row label="Employer email">{formatVal(data.employer_email)}</Row>

                <Row label="Job Seeker">{formatVal(data.jobseeker_name)}</Row>
                <Row label="Job Seeker phone">{formatVal(data.jobseeker_phone)}</Row>
                <Row label="Job Seeker email">{formatVal(data.jobseeker_email)}</Row>

                {data.diploma_file ? (
                  <Row label="Diploma file">
                    <button
                      type="button"
                      className="adminModalLink"
                      onClick={() => void openSignedJobApplicationFile('diploma_file')}
                      disabled={fileBusyField === 'diploma_file' || busy}
                      title="Open signed diploma file"
                    >
                      {fileBusyField === 'diploma_file' ? 'Opening…' : 'Open diploma →'}
                    </button>
                  </Row>
                ) : (
                  <Row label="Diploma file">—</Row>
                )}

                {data.cv_file ? (
                  <Row label="CV file">
                    <button
                      type="button"
                      className="adminModalLink"
                      onClick={() => void openSignedJobApplicationFile('cv_file')}
                      disabled={fileBusyField === 'cv_file' || busy}
                      title="Open signed CV file"
                    >
                      {fileBusyField === 'cv_file' ? 'Opening…' : 'Open CV →'}
                    </button>
                  </Row>
                ) : (
                  <Row label="CV file">—</Row>
                )}
              </>
            ) : null}

            {kind === 'booking' ? (
              <>
                <Row label="Booking ID">{formatVal(data.booking_id)}</Row>
                <Row label="Equipment">{formatVal(data.equipment_name || bookingEquipmentName || data.name)}</Row>
                <Row label="Quantity (units)">{formatVal(data.quantity != null ? data.quantity : '1')}</Row>
                <Row label="Customer">{formatVal(data.customer_name)}</Row>
                <Row label="Customer email">
                  {data.customer_email ? (
                    <a className="adminModalLink" href={`mailto:${data.customer_email}`}>
                      {data.customer_email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Row>
                <Row label="Phone">{formatVal(data.phone)}</Row>
                <Row label="Start date">{formatVal(data.start_date)}</Row>
                <Row label="End date">{formatVal(data.end_date)}</Row>
                <Row label="Total price">{formatVal(data.total_price)}</Row>
                <Row label="Status">{formatVal(data.status)}</Row>
                {data.payment_proof ? (
                  <Row label="Payment proof">
                    {paymentProofIsImage && bookingPaymentProofSignedUrl ? (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={bookingPaymentProofSignedUrl}
                          alt="Payment proof"
                          style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8 }}
                        />
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="adminModalLink"
                        onClick={() => void openSignedBookingPaymentProof('payment_proof')}
                        disabled={fileBusyField === 'payment_proof' || busy || bookingPaymentProofBusy}
                        title="Open signed payment proof"
                      >
                        {fileBusyField === 'payment_proof' ? 'Opening…' : 'Open payment proof →'}
                      </button>
                      {bookingPaymentProofSignedUrl ? (
                        <a className="adminModalLink" href={bookingPaymentProofSignedUrl} target="_blank" rel="noreferrer">
                          Download / View →
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="adminModalLink"
                          onClick={() => void openSignedBookingPaymentProof('payment_proof')}
                          disabled={fileBusyField === 'payment_proof' || busy || bookingPaymentProofBusy}
                          title="Open signed payment proof"
                        >
                          Download / View →
                        </button>
                      )}
                    </div>
                  </Row>
                ) : null}
              </>
            ) : null}

            {kind === 'order' ? (
              <>
                <Row label="Order ID">{formatVal(data.order_id)}</Row>
                <Row label="Material ID">{formatVal(data.material_id)}</Row>
                <Row label="Customer">{formatVal(data.customer_name)}</Row>
                <Row label="Phone">{formatVal(data.phone)}</Row>
                <Row label="Delivery address">
                  {data.delivery_address ? <span className="adminModalPreWrap">{String(data.delivery_address)}</span> : '—'}
                </Row>
                <Row label="Quantity">{formatVal(data.quantity)}</Row>
                <Row label="Total price">{formatVal(data.total_price)}</Row>
                <Row label="Status">{formatVal(data.status)}</Row>
                {data.payment_proof ? (
                  <Row label="Payment proof">
                    <button
                      type="button"
                      className="adminModalLink"
                      onClick={() => void openSignedMaterialOrderPaymentProof('payment_proof')}
                      disabled={fileBusyField === 'payment_proof' || busy}
                      title="Open signed payment proof"
                    >
                      {fileBusyField === 'payment_proof' ? 'Opening…' : 'Open payment proof →'}
                    </button>
                  </Row>
                ) : null}
              </>
            ) : null}

            {kind === 'request' ? (
              <>
                <Row label="Request ID">{formatVal(data.request_id)}</Row>
                <Row label="Customer">{formatVal(data.customer_name)}</Row>
                <Row label="Customer email">
                  {data.customer_email ? (
                    <a className="adminModalLink" href={`mailto:${data.customer_email}`}>
                      {data.customer_email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Row>
                <Row label="Phone">{formatVal(data.phone)}</Row>
                <Row label="Location">{formatVal(data.location)}</Row>
                <Row label="Service type">{formatVal(data.service_type)}</Row>
                <Row label="Description">
                  {data.description ? <span className="adminModalPreWrap">{String(data.description)}</span> : '—'}
                </Row>
                <Row label="Status">{formatVal(data.status)}</Row>
                <Row label="Technician">{formatVal(data.technician_name || data.technician_id)}</Row>
              </>
            ) : null}

            {!['application', 'booking', 'order', 'request'].includes(kind) ? (
              <Row label="Record">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
              </Row>
            ) : null}
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
