import { useState } from 'react'
import { apiFetch } from '../../services/api'
import { useToast } from '../../context/ToastContext.jsx'

export default function RequestQuotePage() {
  const { success, error } = useToast()
  const contact = {
    phone: '+250788599614',
    email: 'verderwanda@gmail.com',
    address: 'Kicukiro, Kicukiro, Umujyi wa Kigali, RWANDA',
  }

  const [quote, setQuote] = useState({
    customer_name: '',
    phone: '',
    email: '',
    service_type: '',
    project_description: '',
    location: '',
    attachment: null,
  })

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    if (!quote.attachment) {
      setMessage('Please attach a file.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('customer_name', quote.customer_name)
      fd.append('phone', quote.phone)
      fd.append('email', quote.email)
      fd.append('service_type', quote.service_type)
      fd.append('project_description', quote.project_description)
      fd.append('location', quote.location)
      fd.append('status', 'new')
      fd.append('attachment', quote.attachment)

      await apiFetch('/request-quotes', { method: 'POST', formData: fd })
      success('Your quote request has been submitted successfully.')
      setQuote({
        customer_name: '',
        phone: '',
        email: '',
        service_type: '',
        project_description: '',
        location: '',
        attachment: null,
      })
    } catch (err) {
      error(err.message || 'Failed to submit quote.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Request a Quote</h2>
        <p className="sectionSubtitle">Tell us about your project and attach details for faster response.</p>
      </div>

      <div className="dashGrid2" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <form onSubmit={onSubmit} className="formBody requestQuoteForm">
            <div className="formRow2">
              <label className="field">
                <span className="fieldLabel">Customer name</span>
                <input className="fieldInput" placeholder="Enter full name" value={quote.customer_name} onChange={(e) => setQuote((q) => ({ ...q, customer_name: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="fieldLabel">Phone</span>
                <input className="fieldInput" placeholder="Enter phone number" value={quote.phone} onChange={(e) => setQuote((q) => ({ ...q, phone: e.target.value }))} required />
              </label>
            </div>

            <div className="formRow2">
              <label className="field">
                <span className="fieldLabel">Email</span>
                <input className="fieldInput" type="email" placeholder="Enter email address" value={quote.email} onChange={(e) => setQuote((q) => ({ ...q, email: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="fieldLabel">Service type</span>
                <input className="fieldInput" placeholder="e.g. Plumbing installation" value={quote.service_type} onChange={(e) => setQuote((q) => ({ ...q, service_type: e.target.value }))} required />
              </label>
            </div>

            <label className="field">
              <span className="fieldLabel">Project description</span>
              <textarea className="fieldInput textarea" placeholder="Describe your project scope, quantity, and timeline" value={quote.project_description} onChange={(e) => setQuote((q) => ({ ...q, project_description: e.target.value }))} required />
            </label>

            <label className="field">
              <span className="fieldLabel">Location</span>
              <input className="fieldInput" placeholder="Enter project location" value={quote.location} onChange={(e) => setQuote((q) => ({ ...q, location: e.target.value }))} required />
            </label>

            <label className="field">
              <span className="fieldLabel">Attachment</span>
              <input className="fieldInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setQuote((q) => ({ ...q, attachment: e.target.files?.[0] || null }))} required />
            </label>

            <button className="btn btnBlue formSubmit" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Send quote request'}
            </button>
          </form>
        </div>

        <div className="dashCard">
          <div className="dashTitle">Need support?</div>
          <div className="dashSubtle" style={{ marginTop: 6 }}>
            Call or send WhatsApp to get a faster estimate.
          </div>

          <div className="dashList" style={{ marginTop: 12 }}>
            <div className="dashItem">
              <div className="dashItemTitle">Phone</div>
              <div className="dashItemMeta">
                <span>{contact.phone}</span>
              </div>
            </div>
            <div className="dashItem">
              <div className="dashItemTitle">Email</div>
              <div className="dashItemMeta">
                <span>{contact.email}</span>
              </div>
            </div>
            <div className="dashItem">
              <div className="dashItemTitle">Office location</div>
              <div className="dashItemMeta">
                <span>{contact.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

