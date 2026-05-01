import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

const METHODS = [
  { id: 'momo', label: 'Mobile Money (MoMo pay code:059914 Name: Verde Rwanda Ltd)' },
  { id: 'bank', label: 'Bank transfer( Equity Bank:)' },
 
]

export default function SubmitJobPaymentModal({ open, token, jobId, jobTitle, onClose, onSubmitted }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [feeType, setFeeType] = useState('')
  const [feeRate, setFeeRate] = useState('')
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')

  const jobIdStr = useMemo(() => (jobId == null ? '' : String(jobId)), [jobId])

  function parseSalaryAmount(rawSalary) {
    const s = String(rawSalary || '').toLowerCase().replace(/,/g, '').trim()
    if (!s) return null
    const kMatch = s.match(/(\d+(?:\.\d+)?)\s*k/)
    if (kMatch?.[1]) return Number(kMatch[1]) * 1000
    const numMatch = s.match(/(\d+(?:\.\d+)?)/)
    if (numMatch?.[1]) return Number(numMatch[1])
    return null
  }

  function computeServiceFee(salary) {
    if (!Number.isFinite(salary) || salary <= 0) return { amount: 8000, type: 'fixed', rate: 8000 }
    if (salary <= 49000) return { amount: 8000, type: 'fixed', rate: 8000 }
    if (salary <= 79000) return { amount: 12000, type: 'fixed', rate: 12000 }
    if (salary <= 119000) return { amount: 15000, type: 'fixed', rate: 15000 }
    if (salary <= 200000) return { amount: 18000, type: 'fixed', rate: 18000 }
    return { amount: Math.round(salary * 0.15), type: 'percentage', rate: 0.15 }
  }

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setMethod('')
    setAmount('')
    setSalaryAmount('')
    setFeeType('')
    setFeeRate('')
    setFile(null)
    setErr('')
  }, [open, jobIdStr])

  useEffect(() => {
    if (!open || !jobIdStr || !token) return
    let cancelled = false
    async function loadFee() {
      try {
        const job = await apiFetch(`/jobs/${jobIdStr}`, { token })
        if (cancelled) return
        const salary = parseSalaryAmount(job?.salary)
        const fee = computeServiceFee(salary)
        setSalaryAmount(Number.isFinite(salary) ? String(salary) : '')
        setAmount(String(fee.amount))
        setFeeType(fee.type)
        setFeeRate(String(fee.rate))
      } catch {
        if (cancelled) return
        setSalaryAmount('')
        setAmount('8000')
        setFeeType('fixed')
        setFeeRate('8000')
      }
    }
    void loadFee()
    return () => {
      cancelled = true
    }
  }, [open, jobIdStr, token])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!jobIdStr) return setErr('Missing job id.')
    if (!method) return setErr('Please choose a payment method.')
    if (!file) return setErr('Please attach payment proof (image or PDF).')

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('job_id', jobIdStr)
      if (amount.trim()) fd.append('amount', amount.trim())
      fd.append('payment_method', method)
      fd.append('payment_proof', file)

      await apiFetch('/job-payments', { method: 'POST', token, formData: fd })
      toastSuccess('Payment proof submitted.')
      onSubmitted?.()
      onClose?.()
    } catch (e2) {
      const msg = e2?.message || 'Failed to submit payment.'
      setErr(msg)
      toastError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={() => !busy && onClose?.()}>
      <div className="adminModal adminModal--wideGeneric" onClick={(e) => e.stopPropagation()}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">Submit payment proof</h2>
          <button type="button" className="adminModalClose" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <form className="adminModalBody" onSubmit={submit}>
          {jobTitle ? (
            <div className="adminMgmtCardMuted" style={{ marginBottom: 10 }}>
              Job: <strong>{jobTitle}</strong>
            </div>
          ) : null}

          {err ? (
            <div className="toast error" style={{ position: 'static', marginBottom: 12 }}>
              {err}
            </div>
          ) : null}

          <div className="adminModalList">
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Payment method *</span>
              <select className="adminMgmtSelect" value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy} required>
                <option value="">Choose method</option>
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Amount (optional)</span>
              <input className="adminMgmtSearchInput" value={amount} disabled placeholder="Auto-calculated service fee" />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Salary amount</span>
              <input className="adminMgmtSearchInput" value={salaryAmount} disabled placeholder="From job salary range" />
            </label>
            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Fee rule</span>
              <input
                className="adminMgmtSearchInput"
                value={feeType === 'percentage' ? `${Number(feeRate || 0) * 100}%` : `${feeRate || 0} RWF`}
                disabled
                placeholder="Service fee rule"
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Payment proof *</span>
              <input
                type="file"
                className="adminMgmtSearchInput"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={busy}
                required
              />
            </label>
          </div>

          <div className="adminModalFooter adminModalFooter--solo">
            <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btnGreen btnSm" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

