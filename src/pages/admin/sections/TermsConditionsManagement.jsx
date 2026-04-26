import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import { apiFetch } from '../../../services/api'

export default function TermsConditionsManagement() {
  const { token } = useAuth()
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    content: '',
    version: '',
    applies_to: 'both',
    is_active: true,
  })
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const loadTerms = useCallback(async () => {
    try {
      const data = await apiFetch('/terms-conditions', { token })
      setTerms(data || [])
    } catch (err) {
      console.error('Failed to load terms:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadTerms()
  }, [loadTerms])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (editing) {
        await apiFetch(`/terms-conditions/${editing.term_id}`, {
          method: 'PATCH',
          token,
          jsonBody: form,
        })
        setShowEditModal(false)
      } else {
        await apiFetch('/terms-conditions', {
          method: 'POST',
          token,
          jsonBody: form,
        })
        setShowCreateModal(false)
      }
      setForm({ title: '', content: '', version: '', applies_to: 'both', is_active: true })
      setEditing(null)
      loadTerms()
    } catch (err) {
      alert('Failed to save terms: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleEdit = (term) => {
    setForm({
      title: term.title,
      content: term.content,
      version: term.version,
      applies_to: term.applies_to,
      is_active: term.is_active,
    })
    setEditing(term)
    setShowEditModal(true)
  }

  const openCreateModal = () => {
    setForm({ title: '', content: '', version: '', applies_to: 'both', is_active: true })
    setEditing(null)
    setShowCreateModal(true)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setForm({ title: '', content: '', version: '', applies_to: 'both', is_active: true })
    setEditing(null)
  }

  const handleDelete = async (termId) => {
    if (!confirm('Are you sure you want to delete this term?')) return
    try {
      await apiFetch(`/terms-conditions/${termId}`, { method: 'DELETE', token })
      loadTerms()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  const toggleActive = async (term) => {
    try {
      await apiFetch(`/terms-conditions/${term.term_id}`, {
        method: 'PATCH',
        token,
        jsonBody: { is_active: !term.is_active },
      })
      loadTerms()
    } catch (err) {
      alert('Failed to update: ' + err.message)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(terms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTerms = terms.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(page)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="adminMgmtPage adminShellInset">
      <div className="adminMgmtHeader">
        <h2 className="adminMgmtTitle">Terms & Conditions Management</h2>
        <p className="adminMgmtSubtitle">Create and manage terms & conditions for employers and job seekers.</p>
        <button className="btn btnPrimary" onClick={openCreateModal}>
          Add New Terms
        </button>
      </div>

      <div className="adminMgmtContent">
        <div className="adminUserMgmtTableWrap">
          <table className="adminUserMgmtTable">
            <thead>
              <tr>
                <th>Title</th>
                <th>Version</th>
                <th>Applies To</th>
                <th>Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentTerms.map((term) => (
                <tr key={term.term_id}>
                  <td>{term.title}</td>
                  <td>{term.version}</td>
                  <td>{term.applies_to}</td>
                  <td>
                    <button
                      className={`btn btnSm ${term.is_active ? 'btnSuccess' : 'btnOutline'}`}
                      onClick={() => toggleActive(term)}
                    >
                      {term.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>{new Date(term.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btnOutline btnSm" onClick={() => handleEdit(term)} style={{ marginRight: 8 }}>
                      Edit
                    </button>
                    <button className="btn btnDanger btnSm" onClick={() => handleDelete(term.term_id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              className="btn btnOutline btnSm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn btnSm ${page === currentPage ? 'btnPrimary' : 'btnOutline'}`}
                onClick={() => goToPage(page)}
                style={{ margin: '0 2px' }}
              >
                {page}
              </button>
            ))}
            <button
              className="btn btnOutline btnSm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modalOverlay" onClick={closeModals}>
          <div className="modalContent modalLarge" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Create New Terms & Conditions</h3>
              <button className="modalClose" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modalBody">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <label className="field">
                    <span className="fieldLabel">Title</span>
                    <input
                      type="text"
                      className="fieldInput"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Version</span>
                    <input
                      type="text"
                      className="fieldInput"
                      value={form.version}
                      onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <label className="field">
                    <span className="fieldLabel">Applies To</span>
                    <select
                      className="fieldInput"
                      value={form.applies_to}
                      onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
                    >
                      <option value="both">Both</option>
                      <option value="employer">Employer</option>
                      <option value="jobseeker">Job Seeker</option>
                    </select>
                  </label>
                  <label className="checkRow" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    <span>Active</span>
                  </label>
                </div>
                <label className="field">
                  <span className="fieldLabel">Content</span>
                  <textarea
                    className="fieldInput textarea"
                    rows={10}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="modalFooter">
                <button type="button" className="btn btnOutline" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btnPrimary" disabled={busy}>
                  {busy ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modalOverlay" onClick={closeModals}>
          <div className="modalContent modalLarge" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Edit Terms & Conditions</h3>
              <button className="modalClose" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modalBody">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <label className="field">
                    <span className="fieldLabel">Title</span>
                    <input
                      type="text"
                      className="fieldInput"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Version</span>
                    <input
                      type="text"
                      className="fieldInput"
                      value={form.version}
                      onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <label className="field">
                    <span className="fieldLabel">Applies To</span>
                    <select
                      className="fieldInput"
                      value={form.applies_to}
                      onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
                    >
                      <option value="both">Both</option>
                      <option value="employer">Employer</option>
                      <option value="jobseeker">Job Seeker</option>
                    </select>
                  </label>
                  <label className="checkRow" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    <span>Active</span>
                  </label>
                </div>
                <label className="field">
                  <span className="fieldLabel">Content</span>
                  <textarea
                    className="fieldInput textarea"
                    rows={10}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="modalFooter">
                <button type="button" className="btn btnOutline" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btnPrimary" disabled={busy}>
                  {busy ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}