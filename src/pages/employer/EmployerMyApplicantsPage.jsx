import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext.jsx'
import { useAuth } from '../../context/useAuth'
import { apiFetch } from '../../services/api'
import { isApprovedStatus, statusTone } from './employerDashboardHelpers'

function parseMaybeJsonRecord(v) {
  if (v == null) return null
  if (typeof v === 'object' && !Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const o = JSON.parse(v)
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null
    } catch {
      return null
    }
  }
  return null
}

function jobServiceFeeMarkedPaidForRow(a) {
  return Boolean(
    (a.jobseeker_phone && String(a.jobseeker_phone).trim()) ||
      (a.jobseeker_email && String(a.jobseeker_email).trim()) ||
      (a.cv_file && String(a.cv_file).trim())
  )
}

function isHttpUrl(v) {
  return /^https?:\/\//i.test(String(v || '').trim())
}

function stop(e) {
  e.stopPropagation()
}

function locationNameById(countryMap, idValue) {
  const id = Number(idValue)
  if (!Number.isFinite(id) || id <= 0) return ''
  return countryMap.get(id) || ''
}

function locationValue(countryMap, idValue) {
  const name = locationNameById(countryMap, idValue)
  return name || '—'
}

const APPLICANT_PROFILE_LABELS = {
  national_id: 'National ID',
  passport_photo: 'Passport-style photo',
  full_photo: 'Full photo',
  village_leader_name: 'Village leader name',
  village_leader_phone: 'Village leader phone',
  birth_province_id: 'Birth province id',
  birth_district_id: 'Birth district id',
  birth_sector_id: 'Birth sector id',
  birth_cell_id: 'Birth cell id',
  birth_village_id: 'Birth village id',
  residence_province_id: 'Residence province id',
  residence_district_id: 'Residence district id',
  residence_sector_id: 'Residence sector id',
  residence_cell_id: 'Residence cell id',
  residence_village_id: 'Residence village id',
  user_id: 'User id',
}

const GUARANTOR_PROFILE_LABELS = {
  full_name: 'Guarantor name',
  national_id: 'Guarantor phone',
  district_id: 'Guarantor district id',
  sector_id: 'Guarantor sector id',
  cell_id: 'Guarantor cell id',
  village_id: 'Guarantor village id',
  relationship: 'Relationship',
  user_id: 'User id',
}

function fieldRowsFromProfiles(applicantProfile, guarantorProfile, countryMap) {
  const applicantRows = applicantProfile
    ? [
        { key: 'birth_province_id', label: 'Birth province', value: locationValue(countryMap, applicantProfile.birth_province_id) },
        { key: 'birth_district_id', label: 'Birth district', value: locationValue(countryMap, applicantProfile.birth_district_id) },
        { key: 'birth_sector_id', label: 'Birth sector', value: locationValue(countryMap, applicantProfile.birth_sector_id) },
        { key: 'birth_cell_id', label: 'Birth cell', value: locationValue(countryMap, applicantProfile.birth_cell_id) },
        { key: 'birth_village_id', label: 'Birth village', value: locationValue(countryMap, applicantProfile.birth_village_id) },
        { key: 'residence_province_id', label: 'Residence province', value: locationValue(countryMap, applicantProfile.residence_province_id) },
        { key: 'residence_district_id', label: 'Residence district', value: locationValue(countryMap, applicantProfile.residence_district_id) },
        { key: 'residence_sector_id', label: 'Residence sector', value: locationValue(countryMap, applicantProfile.residence_sector_id) },
        { key: 'residence_cell_id', label: 'Residence cell', value: locationValue(countryMap, applicantProfile.residence_cell_id) },
        { key: 'residence_village_id', label: 'Residence village', value: locationValue(countryMap, applicantProfile.residence_village_id) },
        { key: 'national_id', label: APPLICANT_PROFILE_LABELS.national_id, value: applicantProfile.national_id || '' },
        { key: 'passport_photo', label: APPLICANT_PROFILE_LABELS.passport_photo, value: applicantProfile.passport_photo || '' },
        { key: 'full_photo', label: APPLICANT_PROFILE_LABELS.full_photo, value: applicantProfile.full_photo || '' },
        { key: 'village_leader_name', label: APPLICANT_PROFILE_LABELS.village_leader_name, value: applicantProfile.village_leader_name || '' },
        { key: 'village_leader_phone', label: APPLICANT_PROFILE_LABELS.village_leader_phone, value: applicantProfile.village_leader_phone || '' },
      ].filter((r) => r.value != null && String(r.value).trim() !== '')
    : []

  const guarantorRows = guarantorProfile
    ? [
        { key: 'full_name', label: GUARANTOR_PROFILE_LABELS.full_name, value: guarantorProfile.full_name || '' },
        { key: 'national_id', label: GUARANTOR_PROFILE_LABELS.national_id, value: guarantorProfile.national_id || '' },
        { key: 'district_id', label: 'Guarantor district', value: locationValue(countryMap, guarantorProfile.district_id) },
        { key: 'sector_id', label: 'Guarantor sector', value: locationValue(countryMap, guarantorProfile.sector_id) },
        { key: 'cell_id', label: 'Guarantor cell', value: locationValue(countryMap, guarantorProfile.cell_id) },
        { key: 'village_id', label: 'Guarantor village', value: locationValue(countryMap, guarantorProfile.village_id) },
        { key: 'relationship', label: GUARANTOR_PROFILE_LABELS.relationship, value: guarantorProfile.relationship || '' },
      ].filter((r) => r.value != null && String(r.value).trim() !== '')
    : []

  return { applicantRows, guarantorRows }
}

function EmployerApplicantDetailsModal({ open, app, countryMap, onClose }) {
  if (!open || !app) return null
  const applicantProfile = parseMaybeJsonRecord(app.applicant_profile)
  const guarantorProfile = parseMaybeJsonRecord(app.guarantor_profile)
  const { applicantRows, guarantorRows } = fieldRowsFromProfiles(applicantProfile, guarantorProfile, countryMap)

  return (
    <div className="adminModalOverlay" role="dialog" aria-modal="true" aria-labelledby="employerApplicantProfileTitle" onClick={onClose}>
      <div className="adminModal adminModal--wideGeneric" onClick={stop}>
        <div className="adminModalHead">
          <h2 id="employerApplicantProfileTitle" className="adminModalTitle">
            Applicant details
          </h2>
          <button type="button" className="adminModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="adminModalBody">
          <div className="adminModalSection">
            <h3 className="adminModalSectionTitle">Applicant (registration)</h3>
            {applicantRows.length === 0 ? (
              <p className="adminModalMuted">No data on file.</p>
            ) : (
              <dl className="adminProfileDl">
                {applicantRows.map((row) => (
                  <div key={row.key} className="adminProfileRow">
                    <dt>{row.label}</dt>
                    <dd>
                      {isHttpUrl(row.value) ? (
                        <a href={String(row.value)} target="_blank" rel="noopener noreferrer" className="adminModalLink">
                          Open file
                        </a>
                      ) : (
                        String(row.value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="adminModalSection">
            <h3 className="adminModalSectionTitle">Guarantor</h3>
            {guarantorRows.length === 0 ? (
              <p className="adminModalMuted">No data on file.</p>
            ) : (
              <dl className="adminProfileDl">
                {guarantorRows.map((row) => (
                  <div key={row.key} className="adminProfileRow">
                    <dt>{row.label}</dt>
                    <dd>{String(row.value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
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

export default function EmployerMyApplicantsPage() {
  const { token, role } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [busy, setBusy] = useState(false)
  const [apps, setApps] = useState([])
  const [countryMap, setCountryMap] = useState(new Map())
  const [selectedAppForDetails, setSelectedAppForDetails] = useState(null)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [experienceYearsQuery, setExperienceYearsQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const canAccess = role === 'employer'
  const itemsPerPage = 4

  async function loadApps() {
    setBusy(true)
    try {
      const appsRes = await apiFetch('/job-applications', { token })
      setApps(Array.isArray(appsRes) ? appsRes : [])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token || !canAccess) return
    void loadApps()
  }, [token, canAccess])

  useEffect(() => {
    if (!token || !canAccess) return
    let cancelled = false
    async function loadCountries() {
      try {
        const data = await apiFetch('/countrydata')
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.rows || []
        const m = new Map()
        list.forEach((r) => {
          if (r.countryHierachyId) m.set(Number(r.countryHierachyId), String(r.hierachyName || '').trim())
        })
        setCountryMap(m)
      } catch (e) {
        console.error('Failed to load country data', e)
      }
    }
    void loadCountries()
    return () => {
      cancelled = true
    }
  }, [token, canAccess])

  async function setEmployerStatus(appId, next) {
    try {
      await apiFetch(`/job-applications/${appId}`, { method: 'PATCH', token, jsonBody: { employer_status: next } })
      // Update local state instead of full refresh
      setApps((prev) =>
        prev.map((a) => (String(a.application_id) === String(appId) ? { ...a, employer_status: next } : a))
      )
      toastSuccess(next === 'approved' ? 'Application approved.' : 'Application rejected.')
    } catch (e) {
      toastError(e?.message || 'Failed to update status')
    }
  }

  async function openSignedApplicationFile(appId, field) {
    try {
      const data = await apiFetch(`/job-applications/${appId}/signed-file?field=${encodeURIComponent(field)}`, { token })
      const url = data && typeof data === 'object' && data.url ? data.url : null
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(e?.message || 'Could not open file')
    }
  }

  const jobOptions = useMemo(() => {
    const map = new Map()
    apps.forEach((a) => {
      const id = Number(a.job_id)
      if (!Number.isFinite(id) || id <= 0 || map.has(id)) return
      const title = String(a.job_title || '').trim() || 'Untitled job'
      const location = String(a.job_location || '').trim()
      map.set(id, { id, label: location ? `${title} - ${location}` : title })
    })
    return Array.from(map.values())
  }, [apps])

  const filteredApps = useMemo(() => {
    const selectedId = Number(selectedJobId)
    const yearsQ = experienceYearsQuery.trim()
    return apps.filter((a) => {
      const jobOk = !selectedId || Number(a.job_id) === selectedId
      const yearsValue = String(a.experience_years ?? '').trim()
      const yearsOk = !yearsQ || yearsValue === yearsQ
      return jobOk && yearsOk
    })
  }, [apps, selectedJobId, experienceYearsQuery])

  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredApps.slice(startIndex, endIndex)
  }, [filteredApps, currentPage, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please login as Employer.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to="/auth?next=%2Fdashboard%2Femployer%2Fapplicants">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Employer only</div>
          <div className="emptyStateText">Your role is not Employer.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <EmployerApplicantDetailsModal
        open={!!selectedAppForDetails}
        app={selectedAppForDetails}
        countryMap={countryMap}
        onClose={() => setSelectedAppForDetails(null)}
      />
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">My applicants</h2>
        <p className="sectionSubtitle">
          Name, skills, experience, education and experience years are visible anytime. Phone, email, CV, diploma, and full applicant plus guarantor registration details unlock only after your service fee for that job is marked paid by admin.
        </p>
      </div>

      <div className="dashCard" style={{ marginTop: 12 }}>
        <div className="dashHeadRow">
          <div className="dashSubtle">
            {busy ? 'Loading...' : `${filteredApps.length} items`}
            {' '}— Showing {filteredApps.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredApps.length)}
          </div>
        </div>
        <div className="pageSearchRow" style={{ marginTop: 10 }}>
          <div className="formRow2" style={{ width: '100%' }}>
            <label className="field pageSearchField">
              <span className="fieldLabel">Filter by job</span>
              <select
                className="fieldInput"
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All jobs</option>
                {jobOptions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field pageSearchField">
              <span className="fieldLabel">Filter by experience years</span>
              <input
                className="fieldInput"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 2"
                value={experienceYearsQuery}
                onChange={(e) => {
                  setExperienceYearsQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </label>
          </div>
        </div>

        <div className="employerApplicantsGrid" style={{ marginTop: 12 }}>
          {paginatedApps.map((a) => {
            const already = isApprovedStatus(a.employer_status)
            const education = a.education_level || ''
            const skillsText = String(a.skills || '').trim() || '-'
            const experienceText = String(a.experience || '').trim() || '-'
            const yearsText =
              a.experience_years != null && String(a.experience_years).trim() !== '' ? String(a.experience_years) : '-'
            const canViewDetails = jobServiceFeeMarkedPaidForRow(a)
            return (
              <article key={a.application_id} className="employerApplicantCard">
                <div className="employerApplicantHead">
                  <div className="dashItemTitle">{a.job_title} - {a.job_location}</div>
                  <div className="dashItemMeta">
                    <span className={`statusPill ${statusTone(a.employer_status)}`}>
                      <span className="statusDot" aria-hidden="true" />
                      Employer: {a.employer_status || 'pending'}
                    </span>
                    <span className={`statusPill ${statusTone(a.jobseeker_status)}`}>
                      <span className="statusDot" aria-hidden="true" />
                      JobSeeker: {a.jobseeker_status || 'pending'}
                    </span>
                  </div>
                </div>

                <div className="employerApplicantFieldGrid" aria-label="Applicant details">
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Full name</span>
                    <span className="employerApplicantValue">{a.jobseeker_name || '-'}</span>
                  </div>
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Education</span>
                    <span className="employerApplicantValue">{education || '-'}</span>
                  </div>
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Skills</span>
                    <span className="employerApplicantValue">{skillsText}</span>
                  </div>
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Experience years</span>
                    <span className="employerApplicantValue">{yearsText}</span>
                  </div>
                  <div className="employerApplicantMini employerApplicantSpan2">
                    <span className="employerApplicantLabel">Experience</span>
                    <span className="employerApplicantValue">{experienceText}</span>
                  </div>
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Phone</span>
                    <span className="employerApplicantValue">{a.jobseeker_phone || 'hidden'}</span>
                  </div>
                  <div className="employerApplicantMini">
                    <span className="employerApplicantLabel">Email</span>
                    <span className="employerApplicantValue">
                      {a.jobseeker_email ? (
                        <a href={`mailto:${a.jobseeker_email}`}>{a.jobseeker_email}</a>
                      ) : (
                        'hidden'
                      )}
                    </span>
                  </div>
                </div>

                {(a.cv_file || a.diploma_file) ? (
                  <div className="employerApplicantDocs">
                    {a.cv_file ? (
                      <button
                        type="button"
                        className="btn btnOutline btnSm"
                        onClick={() => void openSignedApplicationFile(a.application_id, 'cv_file')}
                      >
                        Open CV
                      </button>
                    ) : null}
                    {a.diploma_file ? (
                      <button
                        type="button"
                        className="btn btnOutline btnSm"
                        onClick={() => void openSignedApplicationFile(a.application_id, 'diploma_file')}
                      >
                        Open diploma
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="dashActions">
                  <button
                    className="btn btnOutline btnSm"
                    type="button"
                    onClick={() => {
                      if (!canViewDetails) {
                        toastError('Details unlock only after admin marks the service fee as paid for this job.')
                        return
                      }
                      setSelectedAppForDetails(a)
                    }}
                  >
                    View details
                  </button>
                  <button className="btn btnGreen btnSm" type="button" disabled={already} onClick={() => setEmployerStatus(a.application_id, 'approved')}>
                    Approve
                  </button>
                  <button className="btn btnOutline btnSm" type="button" onClick={() => setEmployerStatus(a.application_id, 'rejected')} disabled={already}>
                    Reject
                  </button>
                </div>
              </article>
            )
          })}

          {!busy && filteredApps.length === 0 ? (
            <div className="dashSubtle employerApplicantsGridEmpty">
              {apps.length === 0
                ? 'No applications found yet. Post a job to start receiving applications.'
                : 'No applicants match the current search/filter.'}
            </div>
          ) : null}
        </div>

        {totalPages > 1 && (
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn btnOutline btnSm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                minWidth: 'auto',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ← Previous
            </button>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: '4px 8px',
                    border: currentPage === pageNum ? '2px solid #007bff' : '1px solid #ddd',
                    backgroundColor: currentPage === pageNum ? '#007bff' : '#fff',
                    color: currentPage === pageNum ? '#fff' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: currentPage === pageNum ? '600' : '400',
                    fontSize: '14px',
                  }}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              className="btn btnOutline btnSm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                minWidth: 'auto',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
