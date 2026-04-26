import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

function trimStr(v) {
  return String(v || '').trim()
}

export default function AdminTechnicianAssignmentsEditorModal({ open, mode, item, token, onClose, onSaved }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const isEdit = mode === 'edit' && item

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [requests, setRequests] = useState([])
  const [technicians, setTechnicians] = useState([])

  const [requestId, setRequestId] = useState('')
  const [technicianId, setTechnicianId] = useState('')

  const requestIdNum = useMemo(() => (requestId === '' ? null : Number(requestId)), [requestId])
  const technicianIdNum = useMemo(() => (technicianId === '' ? null : Number(technicianId)), [technicianId])
  const selectedRequest = useMemo(
    () => requests.find((r) => Number(r.request_id) === Number(requestIdNum)) || null,
    [requests, requestIdNum],
  )
  const selectedTechnician = useMemo(
    () => technicians.find((t) => Number(t.technician_id) === Number(technicianIdNum)) || null,
    [technicians, technicianIdNum],
  )

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setError('')
    setRequests([])
    setTechnicians([])

    setRequestId(isEdit ? String(item?.request_id ?? '') : '')
    setTechnicianId(isEdit ? String(item?.technician_id ?? '') : '')

    let cancelled = false
    async function load() {
      try {
        const [reqRes, techRes] = await Promise.all([apiFetch('/service-requests', { token }), apiFetch('/technicians', { token })])
        if (cancelled) return
        setRequests(Array.isArray(reqRes) ? reqRes : [])
        setTechnicians(Array.isArray(techRes) ? techRes : [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load dropdown data.')
      }
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [open, isEdit, item, token])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!requestIdNum) return setError('Please choose a service request.')
    if (!technicianIdNum) return setError('Please choose a technician.')

    setBusy(true)
    try {
      const payload = {
        request_id: requestIdNum,
        technician_id: technicianIdNum,
        notify_parties: true,
        notification_contacts: {
          requester_email: trimStr(selectedRequest?.customer_email || selectedRequest?.email),
          requester_phone: trimStr(selectedRequest?.phone),
          technician_email: trimStr(selectedTechnician?.email),
          technician_phone: trimStr(selectedTechnician?.phone),
        },
      }
      if (isEdit) {
        await apiFetch(`/technician-assignments/${item.assignment_id}`, { method: 'PATCH', token, jsonBody: payload })
      } else {
        await apiFetch('/technician-assignments', { method: 'POST', token, jsonBody: payload })
      }
      toastSuccess(isEdit ? 'Assignment updated.' : 'Technician assigned.')
      onSaved?.()
      onClose?.()
    } catch (err) {
      const msg = err?.message || 'Save failed.'
      setError(msg)
      toastError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={(e) => e.stopPropagation()}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">{isEdit ? 'Edit technician assignment' : 'Assign technician'}</h2>
          <button type="button" className="adminModalClose" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <form className="adminModalBody" onSubmit={handleSubmit}>
          {error ? (
            <div className="toast error" style={{ position: 'static', marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          <div className="adminModalList">
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Service request</span>
              <select className="adminMgmtSelect" value={requestId} onChange={(e) => setRequestId(e.target.value)} disabled={busy} required>
                <option value="">{requests.length ? 'Choose request' : 'Loading…'}</option>
                {requests.map((r) => {
                  const label = `${trimStr(r.customer_name) || 'Customer'} · ${trimStr(r.service_type) || 'Service'} · ${trimStr(r.location) || 'Location'}`
                  return (
                    <option key={r.request_id} value={r.request_id}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Technician</span>
              <select className="adminMgmtSelect" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} disabled={busy} required>
                <option value="">{technicians.length ? 'Choose technician' : 'Loading…'}</option>
                {technicians.map((t) => {
                  const label = `${trimStr(t.name) || 'Technician'} · ${trimStr(t.specialization) || 'Specialization'}`
                  return (
                    <option key={t.technician_id} value={t.technician_id}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </label>
            {selectedRequest || selectedTechnician ? (
              <div className="adminModalRow">
                <span className="adminModalDt">Notification preview</span>
                <div className="adminModalDd">
                  <div>
                    Requester email: <b>{trimStr(selectedRequest?.customer_email || selectedRequest?.email) || '—'}</b>
                  </div>
                  <div>
                    Requester phone: <b>{trimStr(selectedRequest?.phone) || '—'}</b>
                  </div>
                  <div>
                    Technician email: <b>{trimStr(selectedTechnician?.email) || '—'}</b>
                  </div>
                  <div>
                    Technician phone: <b>{trimStr(selectedTechnician?.phone) || '—'}</b>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="adminModalFooter adminModalFooter--solo">
            <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btnGreen btnSm" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save assignment' : 'Assign technician'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

