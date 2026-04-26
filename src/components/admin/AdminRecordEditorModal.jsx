import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/api'
import { isFileType } from '../../config/adminDatasets.config'
import { useToast } from '../../context/ToastContext.jsx'

const MAX_UPLOAD_MB = 200

function initialValues(resource, item, mode) {
  const out = {}
  if (!resource?.fields) return out
  for (const f of resource.fields) {
    if (mode === 'edit' && item && Object.prototype.hasOwnProperty.call(item, f.key)) {
      const v = item[f.key]
      if (f.type === 'boolean') {
        out[f.key] = Boolean(v)
      } else if (f.type === 'number') {
        out[f.key] = v == null || v === '' ? '' : String(v)
      } else {
        out[f.key] = v == null ? '' : String(v)
      }
    } else {
      if (f.type === 'boolean') out[f.key] = false
      else out[f.key] = ''
    }
    // file inputs tracked separately
  }
  return out
}

function hasAnyFile(resource, files) {
  if (!resource?.fields || !files) return false
  return resource.fields.some((f) => isFileType(f.type) && files[f.key] instanceof File)
}

/**
 * Create / edit a dataset record — JSON or multipart when file fields are set.
 */
export default function AdminRecordEditorModal({ open, resource, mode, item, token, onClose, onSaved }) {
  const [values, setValues] = useState({})
  const [files, setFiles] = useState({})
  const [mediaInputMode, setMediaInputMode] = useState({ media_source: 'file', thumbnail: 'file' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { success: toastSuccess, error: toastError } = useToast()

  const isEdit = mode === 'edit' && item
  const isMediaPosts = resource?.key === 'media_posts'

  useEffect(() => {
    if (!open || !resource) return
    setValues(initialValues(resource, item, mode))
    setFiles({})
    if (resource.key === 'media_posts') {
      const existingSource = String(item?.media_source || '').trim()
      const existingThumb = String(item?.thumbnail || '').trim()
      setMediaInputMode({
        media_source: /^https?:\/\//i.test(existingSource) ? 'url' : 'file',
        thumbnail: /^https?:\/\//i.test(existingThumb) ? 'url' : 'file',
      })
    } else {
      setMediaInputMode({ media_source: 'file', thumbnail: 'file' })
    }
    setError('')
  }, [open, resource, mode, item])

  const title = useMemo(() => {
    if (!resource) return ''
    return `${isEdit ? 'Edit' : 'Add'} ${resource.label}`
  }, [resource, isEdit])

  if (!open || !resource) return null

  function setField(key, v) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  function setFileField(key, file) {
    setFiles((prev) => ({ ...prev, [key]: file || undefined }))
  }

  function validate() {
    const mediaType = String(values.media_type || '').trim().toLowerCase()
    const mediaSourceUrl = String(values.media_source || '').trim()

    if (isMediaPosts && (mediaType === 'image' || mediaType === 'video')) {
      if (mediaInputMode.media_source === 'file' && !(files.media_source instanceof File) && !(isEdit && item?.media_source)) {
        return 'Media Source is required. Upload a file or switch to URL mode.'
      }
      if (mediaInputMode.media_source === 'url') {
        if (!mediaSourceUrl) return 'Media Source URL is required.'
        if (!/^https?:\/\//i.test(mediaSourceUrl)) return 'Media Source URL must start with http:// or https://'
      }
    }

    for (const f of resource.fields) {
      if (mode === 'create' && f.requiredOnCreate) {
        if (isMediaPosts && f.key === 'media_source' && mediaInputMode.media_source === 'url') continue
        if (isFileType(f.type)) {
          if (!(files[f.key] instanceof File)) {
            return `${f.label} is required`
          }
        } else {
          const v = values[f.key]
          if (v === '' || v == null) return `${f.label} is required`
        }
      }
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setBusy(true)
    setError('')
    try {
      const useMultipart = hasAnyFile(resource, files)

      if (useMultipart) {
        const fd = new FormData()
        for (const f of resource.fields) {
          if (isFileType(f.type)) {
            if (isMediaPosts && (f.key === 'media_source' || f.key === 'thumbnail') && mediaInputMode[f.key] === 'url') {
              const mediaSourceUrl = String(values.media_source || '').trim()
              const thumbUrl = String(values.thumbnail || '').trim()
              if (f.key === 'media_source' && mediaSourceUrl) fd.append('media_source', mediaSourceUrl)
              if (f.key === 'thumbnail' && thumbUrl) fd.append('thumbnail', thumbUrl)
              continue
            }
            if (files[f.key] instanceof File) {
              fd.append(f.key, files[f.key])
            }
            // Edit without new file: omit field — backend keeps existing upload
          } else {
            let v = values[f.key]
            if (f.type === 'boolean') {
              fd.append(f.key, v ? 'true' : 'false')
            } else if (f.type === 'number') {
              if (v === '' || v == null) continue
              fd.append(f.key, String(Number(v)))
            } else if (f.type === 'password') {
              if (isEdit && !String(v || '').trim()) continue
              fd.append(f.key, String(v))
            } else {
              fd.append(f.key, String(v ?? ''))
            }
          }
        }
        if (isEdit) {
          await apiFetch(`${resource.endpoint}/${item[resource.idKey]}`, { method: 'PATCH', token, formData: fd })
        } else {
          await apiFetch(resource.endpoint, { method: 'POST', token, formData: fd })
        }
      } else {
        const body = {}
        for (const f of resource.fields) {
          if (isFileType(f.type)) {
            if (isMediaPosts && (f.key === 'media_source' || f.key === 'thumbnail') && mediaInputMode[f.key] === 'url') {
              if (f.key === 'media_source') body.media_source = String(values.media_source || '').trim()
              if (f.key === 'thumbnail') body.thumbnail = String(values.thumbnail || '').trim()
            }
            continue
          }
          let v = values[f.key]
          if (f.type === 'boolean') {
            body[f.key] = Boolean(v)
            continue
          }
          if (f.type === 'number') {
            if (v === '' || v == null) {
              if (mode === 'create' && f.requiredOnCreate) body[f.key] = 0
            } else {
              body[f.key] = Number(v)
            }
            continue
          }
          if (f.type === 'password') {
            if (isEdit && !String(v || '').trim()) continue
            body[f.key] = String(v)
            continue
          }
          body[f.key] = v
        }
        if (isEdit) {
          await apiFetch(`${resource.endpoint}/${item[resource.idKey]}`, { method: 'PATCH', token, jsonBody: body })
        } else {
          await apiFetch(resource.endpoint, { method: 'POST', token, jsonBody: body })
        }
      }

      onSaved?.()
      onClose?.()
      toastSuccess(isEdit ? 'Record updated.' : 'Record created.')
    } catch (err) {
      setError(err.message || 'Request failed')
      toastError(err.message || 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function stop(ev) {
    ev.stopPropagation()
  }

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 className="adminModalTitle">{title}</h2>
          <button type="button" className="adminModalClose" onClick={onClose} aria-label="Close" disabled={busy}>
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
            {resource.fields.map((f) => {
              if (isMediaPosts && f.key === 'media_source') {
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field">
                    <span className="adminModalDt">
                      {f.label}
                      {mode === 'create' && f.requiredOnCreate ? ' *' : ''}
                    </span>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <select
                        className="adminMgmtSearchInput"
                        value={mediaInputMode.media_source}
                        onChange={(e) => setMediaInputMode((prev) => ({ ...prev, media_source: e.target.value }))}
                        disabled={busy}
                      >
                        <option value="file">Upload file</option>
                        <option value="url">Use URL</option>
                      </select>

                      {mediaInputMode.media_source === 'file' ? (
                        <input
                          type="file"
                          className="adminMgmtSearchInput"
                          onChange={(e) => setFileField(f.key, e.target.files?.[0])}
                        />
                      ) : (
                        <input
                          className="adminMgmtSearchInput"
                          type="url"
                          placeholder="https://example.com/banner-image.jpg"
                          value={values.media_source ?? ''}
                          onChange={(e) => setField('media_source', e.target.value)}
                        />
                      )}

                      <div className="adminMgmtCardMuted">Maximum upload size: {MAX_UPLOAD_MB}MB</div>

                      {isEdit && item?.[f.key] && !(files[f.key] instanceof File) ? (
                        <div className="adminMgmtCardMuted">
                          Current: {String(item[f.key]).slice(0, 80)}
                          {String(item[f.key]).length > 80 ? '…' : ''}
                        </div>
                      ) : null}
                    </div>
                  </label>
                )
              }

              if (isMediaPosts && f.key === 'thumbnail') {
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field">
                    <span className="adminModalDt">{f.label}</span>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <select
                        className="adminMgmtSearchInput"
                        value={mediaInputMode.thumbnail}
                        onChange={(e) => setMediaInputMode((prev) => ({ ...prev, thumbnail: e.target.value }))}
                        disabled={busy}
                      >
                        <option value="file">Upload file</option>
                        <option value="url">Use URL</option>
                      </select>

                      {mediaInputMode.thumbnail === 'file' ? (
                        <input
                          type="file"
                          className="adminMgmtSearchInput"
                          onChange={(e) => setFileField(f.key, e.target.files?.[0])}
                        />
                      ) : (
                        <input
                          className="adminMgmtSearchInput"
                          type="url"
                          placeholder="https://example.com/video-poster.jpg"
                          value={values.thumbnail ?? ''}
                          onChange={(e) => setField('thumbnail', e.target.value)}
                        />
                      )}

                      <div className="adminMgmtCardMuted">Maximum upload size: {MAX_UPLOAD_MB}MB</div>

                      {isEdit && item?.[f.key] && !(files[f.key] instanceof File) ? (
                        <div className="adminMgmtCardMuted">
                          Current: {String(item[f.key]).slice(0, 80)}
                          {String(item[f.key]).length > 80 ? '…' : ''}
                        </div>
                      ) : null}
                    </div>
                  </label>
                )
              }

              if (isFileType(f.type)) {
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field">
                    <span className="adminModalDt">
                      {f.label}
                      {mode === 'create' && f.requiredOnCreate ? ' *' : ''}
                    </span>
                    <div>
                      <input
                        type="file"
                        className="adminMgmtSearchInput"
                        accept={f.type === 'image' ? 'image/*' : undefined}
                        onChange={(e) => setFileField(f.key, e.target.files?.[0])}
                      />
                      <div className="adminMgmtCardMuted" style={{ marginTop: 6 }}>
                        Maximum upload size: {MAX_UPLOAD_MB}MB
                      </div>
                      {isEdit && item?.[f.key] && !(files[f.key] instanceof File) ? (
                        <div className="adminMgmtCardMuted" style={{ marginTop: 6 }}>
                          Current: {String(item[f.key]).slice(0, 80)}
                          {String(item[f.key]).length > 80 ? '…' : ''}
                        </div>
                      ) : null}
                    </div>
                  </label>
                )
              }

              if (f.type === 'boolean') {
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field" style={{ alignItems: 'center' }}>
                    <span className="adminModalDt">{f.label}</span>
                    <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => setField(f.key, e.target.checked)} />
                  </label>
                )
              }

              if (f.type === 'textarea') {
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field">
                    <span className="adminModalDt">
                      {f.label}
                      {mode === 'create' && f.requiredOnCreate ? ' *' : ''}
                    </span>
                    <textarea
                      className="adminMgmtSearchInput"
                      rows={4}
                      maxLength={f.maxLength}
                      value={values[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      required={mode === 'create' && f.requiredOnCreate}
                    />
                  </label>
                )
              }

              if (f.type === 'select') {
                const opts = Array.isArray(f.options) ? f.options : []
                return (
                  <label key={f.key} className="adminModalRow adminModalRow--field">
                    <span className="adminModalDt">
                      {f.label}
                      {mode === 'create' && f.requiredOnCreate ? ' *' : ''}
                    </span>
                    <select
                      className="adminMgmtSearchInput"
                      value={values[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      required={mode === 'create' && f.requiredOnCreate}
                    >
                      <option value="">Select {String(f.label || '').toLowerCase()}</option>
                      {opts.map((opt) => (
                        <option key={String(opt)} value={String(opt)}>
                          {String(opt)}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              }

              const inputType =
                f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : f.type === 'date' ? 'date' : 'text'

              return (
                <label key={f.key} className="adminModalRow adminModalRow--field">
                  <span className="adminModalDt">
                    {f.label}
                    {mode === 'create' && f.requiredOnCreate ? ' *' : ''}
                  </span>
                  <input
                    className="adminMgmtSearchInput"
                    type={inputType}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, f.type === 'number' ? e.target.value : e.target.value)}
                    required={mode === 'create' && f.requiredOnCreate && f.type !== 'password'}
                    autoComplete={f.type === 'password' ? 'new-password' : undefined}
                  />
                </label>
              )
            })}
          </div>

          <div className="adminModalFooter adminModalFooter--solo">
            <button type="button" className="btn btnOutline btnSm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btnGreen btnSm" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
