import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

export default function MaterialSupplyPage() {
  const { success, error } = useToast()
  const [materials, setMaterials] = useState([])
  const [materialSearch, setMaterialSearch] = useState('')
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    material_id: '',
    customer_name: '',
    phone: '',
    delivery_address: '',
    quantity: '',
    total_price: '',
    payment_proof: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiFetch('/materials')
        if (!cancelled) setMaterials(Array.isArray(data) ? data : [])
      } catch {
        // ignore
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) => {
      const blob = [m.name, m.description].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [materials, materialSearch])

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.payment_proof) {
      error('Please attach payment proof.')
      return
    }
    if (!form.quantity) {
      error('Quantity is required.')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('material_id', form.material_id)
      fd.append('customer_name', form.customer_name)
      fd.append('phone', form.phone)
      fd.append('delivery_address', form.delivery_address)
      fd.append('quantity', String(form.quantity))
      fd.append('total_price', form.total_price)
      fd.append('status', 'pending')
      fd.append('payment_proof', form.payment_proof)

      await apiFetch('/material-orders', { method: 'POST', formData: fd })
      success('Material order submitted successfully.')
      setForm({
        material_id: '',
        customer_name: '',
        phone: '',
        delivery_address: '',
        quantity: '',
        total_price: '',
        payment_proof: null,
      })
    } catch (err) {
      error(err.message || 'Failed to submit order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Material Supply</h2>
        <p className="sectionSubtitle">Order water materials and project supplies.</p>
      </div>

      <div className="pageSearchRow" style={{ marginTop: 12 }}>
        <label className="field pageSearchField">
          <span className="fieldLabel">Search materials</span>
          <input
            className="fieldInput"
            type="search"
            placeholder="Filter by name or description"
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="dashGrid2" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <form onSubmit={onSubmit} className="formBody">
            <label className="field">
              <span className="fieldLabel">Material</span>
              <select className="fieldInput" value={form.material_id} onChange={(e) => setForm((f) => ({ ...f, material_id: e.target.value }))} required>
                <option value="">Select material</option>
                {filteredMaterials.map((m) => (
                  <option key={m.material_id} value={m.material_id} disabled={m.stock !== undefined && Number(m.stock) <= 0}>
                    {m.name}
                    {m.stock !== undefined ? ` (stock: ${m.stock})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {materials.length > 0 && filteredMaterials.length === 0 ? (
              <p className="dashSubtle" style={{ marginTop: 4 }}>
                No materials match your search. Clear the search box to see all items.
              </p>
            ) : null}

            <div className="formRow2">
              <label className="field">
                <span className="fieldLabel">Customer name</span>
                <input className="fieldInput" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="fieldLabel">Phone</span>
                <input className="fieldInput" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </label>
            </div>

            <label className="field">
              <span className="fieldLabel">Delivery address</span>
              <textarea className="fieldInput textarea" value={form.delivery_address} onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))} required />
            </label>

            <div className="formRow2">
              <label className="field">
                <span className="fieldLabel">Quantity</span>
                <input type="number" min="1" className="fieldInput" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="fieldLabel">Total price</span>
                <input className="fieldInput" value={form.total_price} onChange={(e) => setForm((f) => ({ ...f, total_price: e.target.value }))} required />
              </label>
            </div>

            <label className="field">
              <span className="fieldLabel">Payment proof</span>
              <input type="file" className="fieldInput" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setForm((f) => ({ ...f, payment_proof: e.target.files?.[0] || null }))} required />
            </label>

            <button className="btn btnBlue formSubmit" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit order'}
            </button>
          </form>
        </div>

        <div className="dashCard">
          <div className="dashTitle">Admin approval</div>
          <div className="dashSubtle" style={{ marginTop: 6 }}>
            Material orders require admin review to confirm availability and delivery scheduling.
          </div>
          <div className="dashList" style={{ marginTop: 12 }}>
            <div className="dashItem">
              <div className="dashItemTitle">Tip</div>
              <div className="dashItemMeta">Provide accurate delivery address for faster processing.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

