import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'

function stop(e) {
  e.stopPropagation()
}

function isUrlish(v) {
  const s = String(v || '').trim()
  return /^https?:\/\//i.test(s)
}

function locationNameById(countryRows, idValue) {
  const id = Number(idValue)
  if (!Number.isFinite(id) || id <= 0) return ''
  const row = countryRows.find((r) => Number(r.countryHierachyId) === id)
  return row ? String(row.hierachyName || '').trim() : ''
}

function locationValue(countryRows, idValue) {
  const name = locationNameById(countryRows, idValue)
  return name || '—'
}

function formatIsoDatetime(value) {
  const s = String(value || '').trim()
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

function ProfileBlock({ title, rows }) {
  const usableRows = Array.isArray(rows) ? rows.filter((r) => r && r.value != null && String(r.value).trim() !== '') : []
  if (!usableRows.length) {
    return (
      <div className="adminModalSection">
        <h3 className="adminModalSectionTitle">{title}</h3>
        <p className="adminModalMuted">No data on file.</p>
      </div>
    )
  }

  return (
    <div className="adminModalSection">
      <h3 className="adminModalSectionTitle">{title}</h3>
      <dl className="adminProfileDl">
        {usableRows.map((row) => {
          const val = row.value
          if (isUrlish(val)) {
            return (
              <div key={row.key} className="adminProfileRow">
                <dt>{row.label}</dt>
                <dd>
                  <a href={String(val)} target="_blank" rel="noopener noreferrer" className="adminModalLink">
                    Open file
                  </a>
                </dd>
              </div>
            )
          }
          return (
            <div key={row.key} className="adminProfileRow">
              <dt>{row.label}</dt>
              <dd>{String(val)}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

/**
 * Read-only profile: registration user_details + guarantor for a user (admin).
 */
export default function AdminUserProfileModal({ open, userId, token, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [countryRows, setCountryRows] = useState([])

  useEffect(() => {
    if (!open || !userId || !token) {
      setPayload(null)
      setError('')
      return
    }
    let cancelled = false
    async function load() {
      setBusy(true)
      setError('')
      setPayload(null)
      try {
        const [data, locations] = await Promise.all([
          apiFetch(`/users/${userId}/extended-profile`, { token }),
          apiFetch('/countrydata').catch(() => []),
        ])
        if (!cancelled) {
          setPayload(data && typeof data === 'object' ? data : null)
          setCountryRows(Array.isArray(locations) ? locations : [])
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load profile')
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, userId, token])

  if (!open || !userId) return null

  const u = payload?.user
  const userDetails = payload?.user_details || null
  const guarantor = payload?.guarantor || null

  const userDetailsRows = userDetails
    ? [
        { key: 'birth_province_id', label: 'Birth province', value: locationValue(countryRows, userDetails.birth_province_id) },
        { key: 'birth_district_id', label: 'Birth district', value: locationValue(countryRows, userDetails.birth_district_id) },
        { key: 'birth_sector_id', label: 'Birth sector', value: locationValue(countryRows, userDetails.birth_sector_id) },
        { key: 'birth_cell_id', label: 'Birth cell', value: locationValue(countryRows, userDetails.birth_cell_id) },
        { key: 'birth_village_id', label: 'Birth village', value: locationValue(countryRows, userDetails.birth_village_id) },
        { key: 'residence_province_id', label: 'Residence province', value: locationValue(countryRows, userDetails.residence_province_id) },
        { key: 'residence_district_id', label: 'Residence district', value: locationValue(countryRows, userDetails.residence_district_id) },
        { key: 'residence_sector_id', label: 'Residence sector', value: locationValue(countryRows, userDetails.residence_sector_id) },
        { key: 'residence_cell_id', label: 'Residence cell', value: locationValue(countryRows, userDetails.residence_cell_id) },
        { key: 'residence_village_id', label: 'Residence village', value: locationValue(countryRows, userDetails.residence_village_id) },
        { key: 'national_id', label: 'National ID', value: userDetails.national_id || '' },
        { key: 'passport_photo', label: 'Passport-style photo', value: userDetails.passport_photo || '' },
        { key: 'full_photo', label: 'Full photo', value: userDetails.full_photo || '' },
        { key: 'village_leader_name', label: 'Village leader name', value: userDetails.village_leader_name || '' },
        { key: 'village_leader_phone', label: 'Village leader phone', value: userDetails.village_leader_phone || '' },
        { key: 'created_at', label: 'Submitted at', value: formatIsoDatetime(userDetails.created_at) },
      ]
    : []

  const guarantorRows = guarantor
    ? [
        { key: 'full_name', label: 'Guarantor full name', value: guarantor.full_name || '' },
        { key: 'national_id', label: 'Guarantor phone', value: guarantor.national_id || '' },
        { key: 'district_id', label: 'Guarantor district', value: locationValue(countryRows, guarantor.district_id) },
        { key: 'sector_id', label: 'Guarantor sector', value: locationValue(countryRows, guarantor.sector_id) },
        { key: 'cell_id', label: 'Guarantor cell', value: locationValue(countryRows, guarantor.cell_id) },
        { key: 'village_id', label: 'Guarantor village', value: locationValue(countryRows, guarantor.village_id) },
        { key: 'relationship', label: 'Relationship', value: guarantor.relationship || '' },
        { key: 'created_at', label: 'Submitted at', value: formatIsoDatetime(guarantor.created_at) },
      ]
    : []

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" aria-labelledby="adminUserProfileTitle" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 id="adminUserProfileTitle" className="adminModalTitle">
            User profile
          </h2>
          <button type="button" className="adminModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="adminModalBody">
          {error ? (
            <div className="toast error" style={{ position: 'static', marginBottom: 12 }}>
              {error}
            </div>
          ) : null}
          {busy ? <p className="adminModalMuted">Loading…</p> : null}
          {!busy && !error && u ? (
            <>
              <div className="adminModalSection">
                <h3 className="adminModalSectionTitle">Account</h3>
                <dl className="adminProfileDl">
                  <div className="adminProfileRow">
                    <dt>Name</dt>
                    <dd>{u.name || '—'}</dd>
                  </div>
                  <div className="adminProfileRow">
                    <dt>Email</dt>
                    <dd>{u.email || '—'}</dd>
                  </div>
                  <div className="adminProfileRow">
                    <dt>Phone</dt>
                    <dd>{u.phone || '—'}</dd>
                  </div>
                  <div className="adminProfileRow">
                    <dt>Role</dt>
                    <dd>{u.role || '—'}</dd>
                  </div>
                  <div className="adminProfileRow">
                    <dt>Approval</dt>
                    <dd>{u.approval_status || '—'}</dd>
                  </div>
                </dl>
              </div>
              <ProfileBlock title="Registration details" rows={userDetailsRows} />
              <ProfileBlock title="Guarantor details" rows={guarantorRows} />
            </>
          ) : null}
        </div>
        <div className="adminModalFooter adminModalFooter--solo">
          <button type="button" className="btn btnOutline btnSm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
