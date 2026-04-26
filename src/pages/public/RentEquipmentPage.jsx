import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import heroFallback from '../../assets/hero.png'
import { SERVICE_IMAGE } from '../../constants/serviceImages'
import { apiFetch } from '../../services/api'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { useToast } from '../../context/ToastContext.jsx'

function computeInclusiveDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0
  const s = new Date(`${startDateStr}T12:00:00`)
  const e = new Date(`${endDateStr}T12:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0
  const diffDays = Math.round((e - s) / 86400000)
  return diffDays + 1
}

function formatMoney(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return '—'
  return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWF`
}

function isValidRwPhone(value) {
  const phone = String(value || '').trim()
  return /^07\d{8}$/.test(phone)
}

export default function RentEquipmentPage() {
  const RENT_TERMS_FALLBACK =
    'I confirm this rental request is accurate. I accept Verde Rwanda rental terms, safe equipment use obligations, and return requirements.'
  const [searchParams] = useSearchParams()
  const { success: toastSuccess, error: toastError } = useToast()
  const [equipment, setEquipment] = useState([])
  const [equipmentLoaded, setEquipmentLoaded] = useState(false)
  const [equipSearch, setEquipSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [bookingFor, setBookingFor] = useState(null)
  const autoOpenedFromUrl = useRef(false)

  const [form, setForm] = useState({
    equipment_id: '',
    customer_name: '',
    customer_email: '',
    phone: '',
    start_date: '',
    end_date: '',
    quantity: '1',
    total_price: '',
    payment_proof: null,
    terms_and_conditions: RENT_TERMS_FALLBACK,
    terms_accepted: false,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiFetch('/equipment')
        if (!cancelled) setEquipment(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setEquipment([])
      } finally {
        if (!cancelled) setEquipmentLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function availableUnits(eq) {
    if (!eq || eq.current_stock == null) return null
    return Math.max(0, Number.parseInt(eq.current_stock, 10) || 0)
  }

  function canRentEquipment(eq) {
    if (!eq || eq.availability === false) return false
    const au = availableUnits(eq)
    if (au === null) return true
    return au > 0
  }

  const openBookingModal = useCallback((eq) => {
    if (!canRentEquipment(eq)) return
    setBookingFor(eq)
    setModalOpen(true)
    setMessage('')
    setForm({
      equipment_id: String(eq.equipment_id),
      customer_name: '',
      customer_email: '',
      phone: '',
      start_date: '',
      end_date: '',
      quantity: '1',
      total_price: '',
      payment_proof: null,
      terms_and_conditions: String(eq?.terms_and_conditions || '').trim() || RENT_TERMS_FALLBACK,
      terms_accepted: false,
    })
    setTermsAccepted(false)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setBookingFor(null)
    setMessage('')
  }, [])

  useEffect(() => {
    const id = searchParams.get('equipment')
    if (!id || equipment.length === 0 || autoOpenedFromUrl.current) return
    const eq = equipment.find((e) => String(e.equipment_id) === String(id))
    if (eq && canRentEquipment(eq)) {
      autoOpenedFromUrl.current = true
      openBookingModal(eq)
    }
  }, [searchParams, equipment, openBookingModal])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modalOpen, closeModal])

  const modalImg = useMemo(() => {
    if (!bookingFor) return ''
    return resolveMediaUrl(bookingFor.image) || SERVICE_IMAGE.rent || heroFallback
  }, [bookingFor])

  function updateDates(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (!bookingFor) return next
      const days = computeInclusiveDays(next.start_date, next.end_date)
      const rate = Number(bookingFor.price_per_day) || 0
      const qty = Math.max(1, Number.parseInt(next.quantity, 10) || 1)
      if (days > 0 && rate >= 0) {
        next.total_price = (days * rate * qty).toFixed(2)
      }
      return next
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.payment_proof) {
      setMessage('Please attach payment proof.')
      return
    }
    if (!form.equipment_id) {
      setMessage('Please select equipment first.')
      return
    }
    if (!termsAccepted || !form.terms_accepted) {
      setMessage('To continue, please accept the Terms and Conditions.')
      return
    }
    if (!String(form.customer_email || '').trim()) {
      setMessage('Please enter your email.')
      return
    }
    if (!isValidRwPhone(form.phone)) {
      setMessage('Please enter a valid phone number: 10 digits starting with 07.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('equipment_id', form.equipment_id)
      fd.append('customer_name', form.customer_name)
      fd.append('customer_email', form.customer_email)
      fd.append('phone', form.phone)
      fd.append('start_date', form.start_date)
      fd.append('end_date', form.end_date)
      const qty = Math.max(1, Number.parseInt(form.quantity, 10) || 1)
      fd.append('quantity', String(qty))
      fd.append('total_price', form.total_price)
      fd.append('status', 'pending')
      fd.append('payment_proof', form.payment_proof)
      fd.append('terms_and_conditions', form.terms_and_conditions || RENT_TERMS_FALLBACK)
      fd.append('terms_accepted', String(Boolean(form.terms_accepted)))
      if (form.terms_accepted) fd.append('terms_accepted_at', new Date().toISOString())

      await apiFetch('/equipment-bookings', { method: 'POST', formData: fd })
      closeModal()
      toastSuccess('Booking submitted successfully.')
      setForm({
        equipment_id: '',
        customer_name: '',
        customer_email: '',
        phone: '',
        start_date: '',
        end_date: '',
        quantity: '1',
        total_price: '',
        payment_proof: null,
        terms_and_conditions: RENT_TERMS_FALLBACK,
        terms_accepted: false,
      })
      setTermsAccepted(false)
    } catch (err) {
      setMessage(err.message || 'Failed to submit booking.')
      toastError(err?.message || 'Failed to submit booking.')
    } finally {
      setBusy(false)
    }
  }

  const imgFor = (eq) => resolveMediaUrl(eq.image) || SERVICE_IMAGE.rent || heroFallback

  const filteredEquipment = useMemo(() => {
    const q = equipSearch.trim().toLowerCase()
    if (!q) return equipment
    return equipment.filter((eq) => {
      const blob = [eq.name, eq.category, eq.description].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [equipment, equipSearch])

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Rent Equipment</h2>
        <p className="sectionSubtitle">Construction and plumbing equipment — select an item and complete your booking.</p>
      </div>

      {!equipmentLoaded ? (
        <div className="dashCard" style={{ marginTop: 16 }}>
          <div className="dashSubtle">Loading equipment…</div>
        </div>
      ) : equipment.length === 0 ? (
        <div className="dashCard" style={{ marginTop: 16 }}>
          <div className="dashSubtle">No equipment listed yet.</div>
        </div>
      ) : (
        <>
          <div className="pageSearchRow">
            <label className="field pageSearchField">
              <span className="fieldLabel">Search equipment</span>
              <input
                className="fieldInput"
                type="search"
                placeholder="Search by name, category, or description"
                value={equipSearch}
                onChange={(e) => setEquipSearch(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>

          {filteredEquipment.length === 0 ? (
            <div className="dashCard" style={{ marginTop: 12 }}>
              <div className="dashSubtle">No equipment matches your search.</div>
            </div>
          ) : (
            <div className="rentEquipmentGrid rentEquipmentGrid4" style={{ marginTop: 16 }}>
              {filteredEquipment.map((eq) => (
                <article key={eq.equipment_id} className="rentEquipmentCard rentEquipmentCardStatic">
                  <div className="rentEquipmentCardImgWrap">
                    <img className="rentEquipmentCardImg" src={imgFor(eq)} alt="" loading="lazy" />
                    {(() => {
                      const au = availableUnits(eq)
                      if (au == null) {
                        return !canRentEquipment(eq) ? (
                          <span className="rentEquipmentCardBadge rentEquipmentCardBadgeOff">Out of stock</span>
                        ) : (
                          <span className="rentEquipmentCardBadge rentEquipmentCardBadgeOn">Available</span>
                        )
                      }
                      if (au <= 0) {
                        return <span className="rentEquipmentCardBadge rentEquipmentCardBadgeOff">Out of stock</span>
                      }
                      return (
                        <span className="rentEquipmentCardBadge rentEquipmentCardBadgeOn">
                          {au} available
                        </span>
                      )
                    })()}
                  </div>
                  <div className="rentEquipmentCardBody">
                    <div className="rentEquipmentCardTitle">{eq.name}</div>
                    {eq.category ? <div className="rentEquipmentCardCategory">{eq.category}</div> : null}
                    <div className="rentEquipmentCardPrice">{formatMoney(eq.price_per_day)} / day</div>
                    {availableUnits(eq) != null ? (
                      <div className="dashSubtle" style={{ marginTop: 6, fontSize: 13 }}>
                        {availableUnits(eq)} free unit{availableUnits(eq) === 1 ? '' : 's'} right now
                      </div>
                    ) : null}
                    {eq.description ? (
                      <p className="rentEquipmentCardTeaser">
                        {String(eq.description).trim().length > 140
                          ? `${String(eq.description).replace(/\s+/g, ' ').trim().slice(0, 140)}…`
                          : String(eq.description).trim()}
                      </p>
                    ) : null}
                    <div className="rentEquipmentCardFooter">
                      <button
                        type="button"
                        className="btn btnBlue btnSm rentEquipmentRentBtn"
                        onClick={() => openBookingModal(eq)}
                        disabled={!canRentEquipment(eq)}
                      >
                        Rent now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && bookingFor ? (
        <div
          className="rentModalBackdrop"
          onClick={closeModal}
          role="presentation"
          aria-hidden={!modalOpen}
        >
          <div
            className="rentModalDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rentModalTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rentModalHeader">
              <div>
                <h3 id="rentModalTitle" className="rentModalTitle">
                  Book equipment
                </h3>
                <p className="rentModalSubtitle">{bookingFor.name}</p>
              </div>
              <button type="button" className="rentModalClose" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="rentModalBody">
              <div className="rentModalPreview">
                <div className="rentModalPreviewImgWrap">
                  <img className="rentModalPreviewImg" src={modalImg} alt="" loading="lazy" />
                </div>
                <div className="rentModalPreviewMeta">
                  <span className="rentModalPreviewPrice">{formatMoney(bookingFor.price_per_day)} / day</span>
                  {bookingFor.category ? <span className="rentModalPreviewCat">{bookingFor.category}</span> : null}
                  {!canRentEquipment(bookingFor) ? (
                    <span className="statusPill red">Unavailable</span>
                  ) : (
                    <span className="statusPill blue">
                      <span className="statusDot" aria-hidden="true" />
                      {availableUnits(bookingFor) != null ? `${availableUnits(bookingFor)} available` : 'Available'}
                    </span>
                  )}
                </div>
              </div>
              {bookingFor.description ? (
                <p className="rentModalDesc">{String(bookingFor.description).trim()}</p>
              ) : null}

              <form onSubmit={onSubmit} className="formBody rentModalForm">
                <label className="field">
                  <span className="fieldLabel">Equipment</span>
                  <input
                    className="fieldInput"
                    readOnly
                    value={`${bookingFor.name} (ID ${bookingFor.equipment_id})`}
                  />
                </label>

                <div className="field">
                  <span className="fieldLabel">Terms & Conditions</span>
                  <div className="dashSubtle" style={{ whiteSpace: 'pre-wrap' }}>
                    {form.terms_and_conditions || RENT_TERMS_FALLBACK}
                  </div>
                </div>
                <label className="checkRow">
                  <input
                    type="checkbox"
                    checked={Boolean(form.terms_accepted)}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, terms_accepted: e.target.checked }))
                      setTermsAccepted(e.target.checked)
                    }}
                  />
                  <span>I have read and accept these rental terms and conditions.</span>
                </label>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Customer name</span>
                    <input
                      className="fieldInput"
                      value={form.customer_name}
                      onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Phone</span>
                    <input
                      className="fieldInput"
                      type="tel"
                      inputMode="numeric"
                      pattern="07[0-9]{8}"
                      maxLength={10}
                      placeholder="07XXXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Email</span>
                  <input
                    className="fieldInput"
                    value={form.customer_email}
                    onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="field">
                  <span className="fieldLabel">Quantity (units)</span>
                  <input
                    type="number"
                    className="fieldInput"
                    min={1}
                    max={
                      availableUnits(bookingFor) != null ? availableUnits(bookingFor) : undefined
                    }
                    value={form.quantity}
                    onChange={(e) => {
                      const raw = e.target.value
                      setForm((f) => {
                        const next = { ...f, quantity: raw }
                        if (bookingFor) {
                          const days = computeInclusiveDays(next.start_date, next.end_date)
                          const rate = Number(bookingFor.price_per_day) || 0
                          const qty = Math.max(1, Number.parseInt(next.quantity, 10) || 1)
                          if (days > 0 && rate >= 0) {
                            next.total_price = (days * rate * qty).toFixed(2)
                          }
                        }
                        return next
                      })
                    }}
                    required
                  />
                </label>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Start date</span>
                    <input
                      type="date"
                      className="fieldInput"
                      value={form.start_date}
                      onChange={(e) => updateDates('start_date', e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">End date</span>
                    <input
                      type="date"
                      className="fieldInput"
                      value={form.end_date}
                      onChange={(e) => updateDates('end_date', e.target.value)}
                      required
                    />
                  </label>
                </div>

                <p className="rentEquipmentPriceHint dashSubtle">
                  {form.start_date && form.end_date && bookingFor.price_per_day != null
                    ? (() => {
                        const days = computeInclusiveDays(form.start_date, form.end_date)
                        if (days <= 0) return 'End date must be on or after start date.'
                        const qty = Math.max(1, Number.parseInt(form.quantity, 10) || 1)
                        return `${days} day${days === 1 ? '' : 's'} × ${formatMoney(bookingFor.price_per_day)} / day × ${qty} unit${qty === 1 ? '' : 's'}`
                      })()
                    : 'Select dates to calculate rental days.'}
                </p>

                <label className="field">
                  <span className="fieldLabel">Total price</span>
                  <input
                    className="fieldInput"
                    value={form.total_price}
                    onChange={(e) => setForm((f) => ({ ...f, total_price: e.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span className="fieldLabel">Payment proof</span>
                  <input
                    type="file"
                    className="fieldInput"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setForm((f) => ({ ...f, payment_proof: e.target.files?.[0] || null }))}
                    required
                  />
                </label>

                {message ? (
                  <div
                    className={`toast ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('please') ? 'error' : 'success'}`}
                    style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}
                  >
                    {message}
                  </div>
                ) : null}

                <div className="rentEquipmentFormActions">
                  <button className="btn btnBlue formSubmit" type="submit" disabled={busy}>
                    {busy ? 'Submitting...' : 'Submit booking'}
                  </button>
                  <button type="button" className="btn btnOutline" onClick={closeModal} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
