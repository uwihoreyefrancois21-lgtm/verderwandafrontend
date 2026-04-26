import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

const ROLES = [
  { value: 'admin', label: 'admin' },
  { value: 'employer', label: 'employer' },
  { value: 'job_seeker', label: 'job_seeker' },
]

function normalizeRoleValue(v) {
  const r = String(v || '').trim().toLowerCase()
  if (r === 'job seeker' || r === 'jobseeker' || r === 'job-seeker') return 'job_seeker'
  if (r === 'admin') return 'admin'
  if (r === 'employer') return 'employer'
  return 'job_seeker'
}

function normalizeApprovalStatus(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'approved' || s === 'accept' || s === 'accepted') return 'approved'
  if (s === 'rejected' || s === 'reject') return 'rejected'
  return 'pending'
}

function normalizeActiveValue(v) {
  if (typeof v === 'boolean') return v
  const s = String(v || '').trim().toLowerCase()
  if (s === 'false' || s === '0' || s === 'no' || s === 'inactive') return false
  return true
}

/**
 * Edit user account (name, email, phone, role, active, optional password).
 */
export default function AdminEditUserModal({ open, user, token, onClose, onSaved }) {
  const { success: toastSuccess } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('job_seeker')
  const [active, setActive] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState('pending')
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !user) return
    setName(String(user.name || ''))
    setEmail(String(user.email || ''))
    setPhone(String(user.phone || ''))
    setRole(normalizeRoleValue(user.role))
    setActive(normalizeActiveValue(user.active))
    setApprovalStatus(normalizeApprovalStatus(user.approval_status))
    setPaymentProofFile(null)
    setPassword('')
    setError('')
  }, [open, user])

  if (!open || !user) return null

  const id = user.user_id
  const initialApproval = String(user.approval_status || 'pending').toLowerCase()

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const hasExistingProof = Boolean(String(user.payment_proof || '').trim())
      const hasProof = hasExistingProof || Boolean(paymentProofFile)
      const isTransitionToApproved = approvalStatus === 'approved' && initialApproval !== 'approved'
      if (isTransitionToApproved) {
        if (!hasProof) {
          setError('Cannot approve this user without payment proof.')
          setBusy(false)
          return
        }
      }

      const body = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        active,
        approval_status: approvalStatus,
      }
      if (password.trim()) {
        body.password = password.trim()
      }

      if (paymentProofFile) {
        const formData = new FormData()
        formData.append('name', body.name)
        formData.append('email', body.email)
        formData.append('phone', body.phone)
        formData.append('role', body.role)
        formData.append('approval_status', body.approval_status)
        formData.append('active', body.active ? 'true' : 'false')
        if (body.password) formData.append('password', body.password)
        formData.append('payment_proof', paymentProofFile)
        await apiFetch(`/users/${id}`, { method: 'PATCH', token, formData })
      } else {
        await apiFetch(`/users/${id}`, { method: 'PATCH', token, jsonBody: body })
      }

      if (isTransitionToApproved) toastSuccess('User approved successfully.')
      else if (paymentProofFile) toastSuccess('User and payment proof updated successfully.')
      else toastSuccess('User updated successfully.')
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function stop(e) {
    e.stopPropagation()
  }

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" aria-labelledby="adminEditUserTitle" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 id="adminEditUserTitle" className="adminModalTitle">
            Edit user
          </h2>
          <button type="button" className="adminModalClose" onClick={onClose} aria-label="Close">
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
              <span className="adminModalDt">Name</span>
              <input className="adminMgmtSearchInput" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Email</span>
              <input className="adminMgmtSearchInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Phone</span>
              <input className="adminMgmtSearchInput" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Role</span>
              <select className="adminMgmtSelect" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="adminModalRow adminModalRow--field" style={{ alignItems: 'center' }}>
              <span className="adminModalDt">Active</span>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Approval status</span>
              <select className="adminMgmtSelect" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            {String(user.payment_proof || '').trim() ? (
              <div className="adminModalRow">
                <span className="adminModalDt">Payment proof</span>
                <span className="adminModalDd">
                  <button
                    type="button"
                    className="adminModalLink"
                    onClick={() => {
                      window.open(String(user.payment_proof), '_blank', 'noopener,noreferrer')
                      setError('')
                    }}
                  >
                    View file →
                  </button>
                </span>
              </div>
            ) : null}
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Replace payment proof</span>
              <input
                className="adminMgmtSearchInput"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setPaymentProofFile(f)
                }}
              />
            </label>
            {paymentProofFile ? (
              <div className="adminModalRow">
                <span className="adminModalDt">Selected proof</span>
                <span className="adminModalDd">
                  <button
                    type="button"
                    className="adminModalLink"
                    onClick={() => {
                      const url = URL.createObjectURL(paymentProofFile)
                      window.open(url, '_blank', 'noopener,noreferrer')
                      setError('')
                      setTimeout(() => URL.revokeObjectURL(url), 1000)
                    }}
                  >
                    Preview selected file →
                  </button>
                </span>
              </div>
            ) : null}
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">New password</span>
              <input
                className="adminMgmtSearchInput"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>
          <div className="adminModalFooter adminModalFooter--solo">
            <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btnGreen btnSm" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
