import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

function normalizeListUnique(arr) {
  const out = []
  const seen = new Set()
  for (const v of arr || []) {
    const t = String(v || '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export default function AdminEquipmentEditorModal({ open, mode, item, token, onClose, onSaved }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const isEdit = mode === 'edit' && item

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [categoryMode, setCategoryMode] = useState('select') // 'select' | 'other'
  const [category, setCategory] = useState('') // selected category when select mode
  const [otherCategory, setOtherCategory] = useState('') // typed category in other mode
  const [description, setDescription] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [pricePerDay, setPricePerDay] = useState('')
  const [totalStock, setTotalStock] = useState('1')
  const [currentStock, setCurrentStock] = useState('1')
  const [availability, setAvailability] = useState(true)
  const [imageFile, setImageFile] = useState(null)

  const [categories, setCategories] = useState([])
  const [dropdownBusy, setDropdownBusy] = useState(false)

  const currentCategory = useMemo(() => {
    const v = isEdit ? String(item?.category ?? '') : ''
    return v.trim()
  }, [isEdit, item])

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setError('')

    setName(isEdit ? String(item?.name ?? '') : '')
    setDescription(isEdit ? String(item?.description ?? '') : '')
    setTermsAndConditions(isEdit ? String(item?.terms_and_conditions ?? '') : '')
    setPricePerDay(isEdit ? (item?.price_per_day == null ? '' : String(item.price_per_day)) : '')
    setTotalStock(
      isEdit ? (item?.total_stock == null ? '0' : String(item.total_stock)) : '1',
    )
    setCurrentStock(
      isEdit ? (item?.current_stock == null ? '0' : String(item.current_stock)) : '1',
    )
    setAvailability(isEdit ? Boolean(item?.availability) : true)
    setImageFile(null)

    const cat = currentCategory
    const isOther = false
    if (cat) {
      setCategoryMode(isOther ? 'other' : 'select')
      setCategory(cat)
      setOtherCategory('')
    } else {
      setCategoryMode('select')
      setCategory('')
      setOtherCategory('')
    }

    let cancelled = false
    async function loadCategories() {
      setDropdownBusy(true)
      try {
        const eq = await apiFetch('/equipment', { token })
        const list = Array.isArray(eq) ? eq : []
        const cats = normalizeListUnique(list.map((x) => x.category))
        if (cancelled) return
        // Ensure current category is visible even if it’s not in the distinct list.
        const merged = currentCategory && !cats.includes(currentCategory) ? [currentCategory, ...cats] : cats
        setCategories(merged)
      } catch (_e) {
        if (!cancelled) setCategories(currentCategory ? [currentCategory] : [])
      } finally {
        if (!cancelled) setDropdownBusy(false)
      }
    }

    void loadCategories()
    return () => {
      cancelled = true
    }
  }, [open, isEdit, item, token, currentCategory])

  if (!open) return null

  const selectedCategoryValue = categoryMode === 'other' ? otherCategory : category

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const tName = String(name || '').trim()
    const tDesc = String(description || '').trim()
    const tTerms = String(termsAndConditions || '').trim()
    const tPrice = String(pricePerDay || '').trim()
    const tCategory = String(selectedCategoryValue || '').trim()

    if (!tName) return setError('Name is required.')
    if (!tCategory) return setError('Equipment category is required.')
    if (!tDesc) return setError('Description is required.')
    if (!tPrice) return setError('Price per day is required.')

    const tTot = Number.parseInt(String(totalStock || '').trim(), 10)
    const tCur = Number.parseInt(String(currentStock || '').trim(), 10)
    if (!Number.isFinite(tTot) || tTot < 0) return setError('Total stock must be a non-negative number.')
    if (!Number.isFinite(tCur) || tCur < 0) return setError('Available stock must be a non-negative number.')
    if (tCur > tTot) return setError('Available stock cannot exceed total fleet size.')

    if (!isEdit && !(imageFile instanceof File)) {
      return setError('Image is required.')
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', tName)
      fd.append('category', tCategory)
      fd.append('description', tDesc)
      fd.append('terms_and_conditions', tTerms)
      fd.append('price_per_day', tPrice)
      fd.append('total_stock', String(tTot))
      fd.append('current_stock', String(tCur))
      fd.append('availability', availability ? 'true' : 'false')
      if (imageFile instanceof File) fd.append('image', imageFile)

      if (isEdit) {
        await apiFetch(`/equipment/${item.equipment_id}`, { method: 'PATCH', token, formData: fd })
      } else {
        await apiFetch('/equipment', { method: 'POST', token, formData: fd })
      }

      toastSuccess(isEdit ? 'Equipment updated.' : 'Equipment created.')
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
          <h2 className="adminModalTitle">{isEdit ? 'Edit equipment' : 'Add equipment'}</h2>
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
              <span className="adminModalDt">Name</span>
              <input className="adminMgmtSearchInput" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Category</span>
              <div style={{ display: 'grid', gap: 8 }}>
                <select
                  className="adminMgmtSelect"
                  value={categoryMode}
                  onChange={(e) => setCategoryMode(e.target.value)}
                  disabled={busy || dropdownBusy}
                >
                  <option value="select">Choose category</option>
                  <option value="other">Other (type)</option>
                </select>

                {categoryMode === 'select' ? (
                  <select className="adminMgmtSelect" value={category} onChange={(e) => setCategory(e.target.value)} disabled={busy || dropdownBusy} required>
                    <option value="">{dropdownBusy ? 'Loading…' : 'Select category'}</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="adminMgmtSearchInput"
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                    disabled={busy}
                    placeholder="Enter category name"
                    required
                  />
                )}
              </div>
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Description</span>
              <textarea className="adminMgmtSearchInput" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} required />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Terms & Conditions</span>
              <textarea
                className="adminMgmtSearchInput"
                rows={4}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                disabled={busy}
                placeholder="Enter terms shown to customers during booking"
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Price per day</span>
              <input
                className="adminMgmtSearchInput"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                disabled={busy}
                required
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Fleet size (total units)</span>
              <input
                className="adminMgmtSearchInput"
                type="number"
                min={0}
                value={totalStock}
                onChange={(e) => setTotalStock(e.target.value)}
                disabled={busy}
                required
              />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Units available now</span>
              <input
                className="adminMgmtSearchInput"
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                disabled={busy}
                required
              />
            </label>
            <p className="dashSubtle" style={{ gridColumn: '1 / -1', margin: '-4px 0 0' }}>
              Approving rentals reduces “available”; rejecting or deleting approved bookings returns units.
            </p>

            <label className="adminModalRow adminModalRow--field" style={{ alignItems: 'center' }}>
              <span className="adminModalDt">Available</span>
              <input type="checkbox" checked={Boolean(availability)} onChange={(e) => setAvailability(e.target.checked)} disabled={busy} />
            </label>

            <label className="adminModalRow adminModalRow--field">
              <span className="adminModalDt">Image {isEdit ? '(optional)' : '(required)'}</span>
              <input type="file" className="adminMgmtSearchInput" onChange={(e) => setImageFile(e.target.files?.[0] || null)} disabled={busy} />
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

