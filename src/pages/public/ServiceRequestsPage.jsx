import { useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

export default function ServiceRequestsPage() {
  const { success, error } = useToast()
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    phone: '',
    location: '',
    service_type: '',
    service_type_other: '',
    description: '',
  })

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await apiFetch('/service-requests', {
        method: 'POST',
        jsonBody: {
          ...form,
          service_type:
            form.service_type === 'Other'
              ? (form.service_type_other || '').trim()
              : form.service_type,
          status: 'new',
          // technician_id is optional; backend model only inserts provided fields
        },
      })
      success('Service request sent successfully.')
      setForm({
        customer_name: '',
        customer_email: '',
        phone: '',
        location: '',
        service_type: '',
        service_type_other: '',
        description: '',
      })
    } catch (err) {
      error(err.message || 'Failed to send request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Service Requests</h2>
        <p className="sectionSubtitle">Send us your request and we will contact you for scheduling and next steps.</p>
      </div>

      <div className="dashGrid2" style={{ marginTop: 14 }}>
        <div className="dashCard">
          <div className="dashHeadRow" style={{ marginBottom: 8 }}>
            <div>
              <div className="dashTitle">Request a service</div>
              <div className="dashSubtle">We handle plumbing, water systems, equipment support, and maintenance.</div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="formBody serviceRequestForm">
            <div className="formRow2">
              <label className="field">
                <span className="fieldLabel">Full name</span>
                <input className="fieldInput" placeholder="Enter full name" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="fieldLabel">Phone</span>
                <input className="fieldInput" placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </label>
            </div>

            <label className="field">
              <span className="fieldLabel">Email</span>
              <input className="fieldInput" placeholder="Enter email address" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} type="email" required />
            </label>

            <label className="field">
              <span className="fieldLabel">Location</span>
              <input className="fieldInput" placeholder="Enter service location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} required />
            </label>

            <label className="field">
              <span className="fieldLabel">Service type</span>
              <select className="fieldInput" value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))} required>
                <option value="">Select service</option>
                <option value="Plumbing Solutions">Plumbing </option>
                <option value="Water System Solutions">Water Supply Solutions</option>
                <option value="Equipment Support">Equipment Rentals</option>
                <option value="Material Supply">Material Supply</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {form.service_type === 'Other' ? (
              <label className="field">
                <span className="fieldLabel">Other service type</span>
                <input
                  className="fieldInput"
                  placeholder="Write your service type"
                  value={form.service_type_other}
                  onChange={(e) => setForm((f) => ({ ...f, service_type_other: e.target.value }))}
                  required
                />
              </label>
            ) : null}

            <label className="field">
              <span className="fieldLabel">Description</span>
              <textarea className="fieldInput textarea" placeholder="Describe the issue and what support you need" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </label>

            <button className="btn btnGreen formSubmit" type="submit" disabled={busy}>
              {busy ? 'Sending...' : 'Send request'}
            </button>
          </form>
        </div>

        <div className="dashCard">
          <div className="dashTitle">How it works</div>
          <div className="dashSubtle" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7 }}>
            Submit the form with your location and service details.
            <br />
            We review the request and respond to schedule the right technical team.
          </div>

          <div className="dashList" style={{ marginTop: 12 }}>
            <div className="dashItem">
              <div className="dashItemTitle">Fast response</div>
              <div className="dashItemMeta">We follow up quickly for coordination.</div>
            </div>
            <div className="dashItem">
              <div className="dashItemTitle">Technical planning</div>
              <div className="dashItemMeta">We propose the best practical solution.</div>
            </div>
            <div className="dashItem">
              <div className="dashItemTitle">Transparent updates</div>
              <div className="dashItemMeta">Clear communication throughout.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

