import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../services/api'

const STRONG_PASSWORD_HINT = 'Use at least 8 characters with uppercase, lowercase, number, and special character.'

/** Rwanda mobile: 10 digits starting with 07 (e.g. MTN/Airtel style). */
const RW_PHONE_10_LEN = 10

function digitsOnlyPhone10(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, RW_PHONE_10_LEN)
}

function isValidRwLeaderPhone07(value) {
  return /^07\d{8}$/.test(String(value || ''))
}

function isStrongPassword(value) {
  const v = String(value || '')
  return /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z\d]/.test(v) && v.length >= 8
}

function normalizeRoleForRedirect(role) {
  const r = String(role || '').trim().toLowerCase()
  if (r === 'job seeker' || r === 'jobseeker' || r === 'job_seeker' || r === 'job-seeker') return 'job_seeker'
  if (r === 'employer') return 'employer'
  if (r === 'admin') return 'admin'
  return r
}

/** Only allow in-app paths (prevents open redirects). */
function safeNextPath(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const p = raw.trim().split('?')[0].split('#')[0]
  if (!p.startsWith('/')) return ''
  if (p.includes('//') || p.includes('..')) return ''
  return p
}

function canUseNextForRole(next, roleNorm) {
  if (!next) return false
  const publicPrefixes = [
    '/',
    '/jobs',
    '/services',
    '/projects',
    '/contact',
    '/about-us',
    '/request-quotes',
    '/rent-equipment',
    '/material-supply',
    '/service-requests',
  ]
  if (publicPrefixes.some((p) => next === p || next.startsWith(`${p}/`))) return true
  if (roleNorm === 'admin') return next.startsWith('/admin') || next.startsWith('/dashboard/admin')
  if (roleNorm === 'employer') return next.startsWith('/dashboard/employer') || next.startsWith('/employer/')
  if (roleNorm === 'job_seeker') {
    return (
      next.startsWith('/dashboard/jobseeker') ||
      /^\/jobs\/[^/]+\/apply$/.test(next)
    )
  }
  return false
}

const COUNTRY_LEVELS = {
  province: 1,
  district: 2,
  sector: 3,
  cell: 4,
  village: 5,
}

function toIntOrNull(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function getChildrenByLevel(rows, parentId, levelId) {
  const parent = toIntOrNull(parentId)
  return rows.filter((r) => Number(r.countryLevelId) === levelId && Number(r.parentId) === parent)
}

const JOB_SEEKER_REGISTER_STEPS = 5

function isOfflineNow() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export default function AuthPage() {
  const { login, register, loading, token, role: userRole } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = (searchParams.get('next') || '').trim()

  const [mode, setMode] = useState('login')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('Job Seeker')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotBusy, setForgotBusy] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [registerStep, setRegisterStep] = useState(1)
  const [countryRows, setCountryRows] = useState([])
  const [countryLoading, setCountryLoading] = useState(false)
  const [countryError, setCountryError] = useState('')
  const [networkMessage, setNetworkMessage] = useState(() => (isOfflineNow() ? 'Check your internet connection and try again.' : ''))

  const [userDetails, setUserDetails] = useState({
    birth_province_id: '',
    birth_district_id: '',
    birth_sector_id: '',
    birth_cell_id: '',
    birth_village_id: '',
    residence_province_id: '',
    residence_district_id: '',
    residence_sector_id: '',
    residence_cell_id: '',
    residence_village_id: '',
    passport_photo: null,
    full_photo: null,
    village_leader_name: '',
    village_leader_phone: '',
  })
  const [guarantor, setGuarantor] = useState({
    full_name: '',
    phone: '',
    district_id: '',
    sector_id: '',
    cell_id: '',
    village_id: '',
    relationship: '',
  })

  useEffect(() => {
    if (!token || loading) return
    const rNorm = normalizeRoleForRedirect(userRole)
    if (!rNorm) return
    const next = safeNextPath(nextPath)
    if (canUseNextForRole(next, rNorm)) {
      navigate(next, { replace: true })
      return
    }
    if (rNorm === 'admin') {
      navigate('/dashboard/admin', { replace: true })
      return
    }
    if (rNorm === 'employer') {
      navigate('/dashboard/employer', { replace: true })
      return
    }
    if (rNorm === 'job_seeker') {
      navigate('/dashboard/jobseeker', { replace: true })
      return
    }
    navigate('/dashboard', { replace: true })
  }, [token, userRole, loading, navigate, nextPath])

  useEffect(() => {
    function handleOffline() {
      setNetworkMessage('Check your internet connection and try again.')
    }

    function handleOnline() {
      setNetworkMessage('')
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'register' || role !== 'Job Seeker') return
    let cancelled = false
    async function loadCountryRows() {
      setCountryLoading(true)
      setCountryError('')
      const paths = ['/countrydata', '/country-data', '/locations/countrydata']
      try {
        let rows = null
        for (const path of paths) {
          try {
            const data = await apiFetch(path)
            const list = Array.isArray(data) ? data : data?.rows
            if (Array.isArray(list)) {
              rows = list
              break
            }
          } catch {
            // Try fallback path.
          }
        }
        if (!rows) throw new Error('Country hierarchy data is unavailable.')
        if (!cancelled) setCountryRows(rows)
      } catch (err) {
        if (!cancelled) setCountryError(err?.message || 'Failed to load country data.')
      } finally {
        if (!cancelled) setCountryLoading(false)
      }
    }
    void loadCountryRows()
    return () => {
      cancelled = true
    }
  }, [mode, role])

  useEffect(() => {
    if (mode !== 'register') setRegisterStep(1)
  }, [mode])

  function updateUserDetails(field, value) {
    setUserDetails((prev) => ({ ...prev, [field]: value }))
  }

  function updateGuarantor(field, value) {
    setGuarantor((prev) => ({ ...prev, [field]: value }))
  }

  const birthDistricts = getChildrenByLevel(countryRows, userDetails.birth_province_id, COUNTRY_LEVELS.district)
  const birthSectors = getChildrenByLevel(countryRows, userDetails.birth_district_id, COUNTRY_LEVELS.sector)
  const birthCells = getChildrenByLevel(countryRows, userDetails.birth_sector_id, COUNTRY_LEVELS.cell)
  const birthVillages = getChildrenByLevel(countryRows, userDetails.birth_cell_id, COUNTRY_LEVELS.village)

  const residenceDistricts = getChildrenByLevel(countryRows, userDetails.residence_province_id, COUNTRY_LEVELS.district)
  const residenceSectors = getChildrenByLevel(countryRows, userDetails.residence_district_id, COUNTRY_LEVELS.sector)
  const residenceCells = getChildrenByLevel(countryRows, userDetails.residence_sector_id, COUNTRY_LEVELS.cell)
  const residenceVillages = getChildrenByLevel(countryRows, userDetails.residence_cell_id, COUNTRY_LEVELS.village)

  const guarantorSectors = getChildrenByLevel(countryRows, guarantor.district_id, COUNTRY_LEVELS.sector)
  const guarantorCells = getChildrenByLevel(countryRows, guarantor.sector_id, COUNTRY_LEVELS.cell)
  const guarantorVillages = getChildrenByLevel(countryRows, guarantor.cell_id, COUNTRY_LEVELS.village)
  const provinces = countryRows.filter((r) => Number(r.countryLevelId) === COUNTRY_LEVELS.province)

  async function onForgotSubmit(e) {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    if (isOfflineNow()) {
      setForgotError('Check your internet connection and try again.')
      setNetworkMessage('Check your internet connection and try again.')
      return
    }
    setForgotBusy(true)
    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        jsonBody: { email: forgotEmail.trim() },
      })
      const msg = data?.message || 'If the account exists, you will receive an email with a temporary password.'
      setForgotMessage(msg)
      setForgotEmail('')
    } catch (err) {
      if (err?.isNetworkError) setNetworkMessage('Check your internet connection and try again.')
      setForgotError(err.message || 'Could not send email. Try again later.')
    } finally {
      setForgotBusy(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (isOfflineNow()) {
      setError('Check your internet connection and try again.')
      setNetworkMessage('Check your internet connection and try again.')
      return
    }
    setBusy(true)
    try {
      let result = null
      if (mode === 'register') {
        if (!String(phone || '').trim()) {
          setError('Please enter your phone number.')
          setBusy(false)
          return
        }
        if (!isValidRwLeaderPhone07(phone)) {
          setError(`Phone number must be ${RW_PHONE_10_LEN} digits and start with 07 (e.g. 0700000000).`)
          setBusy(false)
          return
        }
        if (role === 'Job Seeker' && registerStep === 1) {
          if (!isStrongPassword(password)) {
            setError(STRONG_PASSWORD_HINT)
            setBusy(false)
            return
          }
          if (password !== confirmPassword) {
            setError('Passwords do not match.')
            setBusy(false)
            return
          }
          if (!paymentProofFile) {
            setError('Payment proof is required for account registration.')
            setBusy(false)
            return
          }
          setRegisterStep(2)
          setBusy(false)
          return
        }
        if (role === 'Job Seeker' && registerStep === 2) {
          const birthFields = ['birth_province_id', 'birth_district_id', 'birth_sector_id', 'birth_cell_id', 'birth_village_id']
          if (birthFields.some((f) => !String(userDetails[f] || '').trim())) {
            setError('Please complete your birth address (all levels).')
            setBusy(false)
            return
          }
          if (countryError) {
            setError(countryError)
            setBusy(false)
            return
          }
          setRegisterStep(3)
          setBusy(false)
          return
        }
        if (role === 'Job Seeker' && registerStep === 3) {
          const residenceFields = [
            'residence_province_id',
            'residence_district_id',
            'residence_sector_id',
            'residence_cell_id',
            'residence_village_id',
          ]
          if (residenceFields.some((f) => !String(userDetails[f] || '').trim())) {
            setError('Please complete your residence address (all levels).')
            setBusy(false)
            return
          }
          if (countryError) {
            setError(countryError)
            setBusy(false)
            return
          }
          setRegisterStep(4)
          setBusy(false)
          return
        }
        if (role === 'Job Seeker' && registerStep === 4) {
          if (!(userDetails.passport_photo instanceof File) || !(userDetails.full_photo instanceof File)) {
            setError('Passport-style photo and full photo are required.')
            setBusy(false)
            return
          }
          if (!String(userDetails.village_leader_name || '').trim()) {
            setError("Please enter the village leader's full name.")
            setBusy(false)
            return
          }
          if (!String(userDetails.village_leader_phone || '').trim()) {
            setError("Please enter the village leader's phone number.")
            setBusy(false)
            return
          }
          if (!isValidRwLeaderPhone07(userDetails.village_leader_phone)) {
            setError(`Village leader phone must be ${RW_PHONE_10_LEN} digits and start with 07 (e.g. 0788123456).`)
            setBusy(false)
            return
          }
          setRegisterStep(5)
          setBusy(false)
          return
        }
        if (!isStrongPassword(password)) {
          setError(STRONG_PASSWORD_HINT)
          setBusy(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          setBusy(false)
          return
        }
        if (!paymentProofFile) {
          setError('Payment proof is required for account registration.')
          setBusy(false)
          return
        }
        if (role === 'Job Seeker') {
          if (registerStep !== JOB_SEEKER_REGISTER_STEPS) {
            setError('Please complete all registration steps.')
            setBusy(false)
            return
          }
          const requiredUserDetailFields = [
            'birth_province_id',
            'birth_district_id',
            'birth_sector_id',
            'birth_cell_id',
            'birth_village_id',
            'residence_province_id',
            'residence_district_id',
            'residence_sector_id',
            'residence_cell_id',
            'residence_village_id',
            'village_leader_name',
            'village_leader_phone',
          ]
          if (requiredUserDetailFields.some((f) => !String(userDetails[f] || '').trim())) {
            setError('Your profile details are incomplete. Go back and check each step.')
            setBusy(false)
            return
          }
          if (!isValidRwLeaderPhone07(userDetails.village_leader_phone)) {
            setError(`Village leader phone must be ${RW_PHONE_10_LEN} digits and start with 07.`)
            setBusy(false)
            return
          }
          if (!(userDetails.passport_photo instanceof File) || !(userDetails.full_photo instanceof File)) {
            setError('Passport-style photo and full photo are required.')
            setBusy(false)
            return
          }
          const missingGuarantor = ['full_name', 'phone', 'district_id', 'sector_id', 'cell_id', 'village_id', 'relationship'].some(
            (f) => !String(guarantor[f] || '').trim()
          )
          if (missingGuarantor) {
            setError('All guarantor fields are required.')
            setBusy(false)
            return
          }
          if (!isValidRwLeaderPhone07(guarantor.phone)) {
            setError(`Guarantor phone must be ${RW_PHONE_10_LEN} digits and start with 07.`)
            setBusy(false)
            return
          }
          if (countryError) {
            setError(countryError)
            setBusy(false)
            return
          }
        }
        result = await register({
          name,
          email,
          phone,
          role,
          password,
          paymentProofFile,
          userDetails:
            role === 'Job Seeker'
              ? {
                  ...userDetails,
                  birth_province_id: toIntOrNull(userDetails.birth_province_id),
                  birth_district_id: toIntOrNull(userDetails.birth_district_id),
                  birth_sector_id: toIntOrNull(userDetails.birth_sector_id),
                  birth_cell_id: toIntOrNull(userDetails.birth_cell_id),
                  birth_village_id: toIntOrNull(userDetails.birth_village_id),
                  residence_province_id: toIntOrNull(userDetails.residence_province_id),
                  residence_district_id: toIntOrNull(userDetails.residence_district_id),
                  residence_sector_id: toIntOrNull(userDetails.residence_sector_id),
                  residence_cell_id: toIntOrNull(userDetails.residence_cell_id),
                  residence_village_id: toIntOrNull(userDetails.residence_village_id),
                }
              : null,
          guarantor:
            role === 'Job Seeker'
              ? {
                  full_name: guarantor.full_name,
                  phone: guarantor.phone,
                  district_id: toIntOrNull(guarantor.district_id),
                  sector_id: toIntOrNull(guarantor.sector_id),
                  cell_id: toIntOrNull(guarantor.cell_id),
                  village_id: toIntOrNull(guarantor.village_id),
                  relationship: guarantor.relationship,
                }
              : null,
        })
        setRegisterSuccess(result?.message || 'Registration submitted. Please wait for admin approval before login or call Admin to:0 788 599 614.')
        setMode('login')
        setName('')
        setEmail('')
        setPhone('')
        setRole('Job Seeker')
        setPassword('')
        setConfirmPassword('')
        setPaymentProofFile(null)
        setUserDetails({
          birth_province_id: '',
          birth_district_id: '',
          birth_sector_id: '',
          birth_cell_id: '',
          birth_village_id: '',
          residence_province_id: '',
          residence_district_id: '',
          residence_sector_id: '',
          residence_cell_id: '',
          residence_village_id: '',
          passport_photo: null,
          full_photo: null,
          village_leader_name: '',
          village_leader_phone: '',
        })
        setGuarantor({
          full_name: '',
          phone: '',
          district_id: '',
          sector_id: '',
          cell_id: '',
          village_id: '',
          relationship: '',
        })
        setBusy(false)
        return
      } else {
        await login({ email, password })
        return
      }

      const rawRole = result?.user?.role || ''
      const rNorm = normalizeRoleForRedirect(rawRole)

      const next = safeNextPath(nextPath)
      if (canUseNextForRole(next, rNorm)) {
        return navigate(next, { replace: true })
      }
      if (rNorm === 'admin') {
        return navigate('/dashboard/admin', { replace: true })
      }
      if (rNorm === 'employer') return navigate('/dashboard/employer', { replace: true })
      if (rNorm === 'job_seeker') return navigate('/dashboard/jobseeker', { replace: true })
      return navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err?.isNetworkError) setNetworkMessage('Check your internet connection and try again.')
      setError(err.message || 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  const hint =
    nextPath === '/jobs' || nextPath.startsWith('/jobs')
      ? 'Sign in as a Job Seeker to return to job applications.'
      : nextPath === '/dashboard/jobseeker' || nextPath.startsWith('/dashboard/jobseeker')
        ? 'Sign in as a Job Seeker to open your dashboard.'
        : nextPath.startsWith('/employer/') || nextPath.startsWith('/dashboard/employer')
          ? 'The registration fee is 2,500 FRW'
        : safeNextPath(nextPath).startsWith('/admin')
          ? 'Administrator sign-in to open the admin area you requested.'
          : 'Secure access to your Verde Rwanda account.'

  const jobSeekerStepCopy = {
  /*   1: {
     
      lead: 'Account details and payment proof. The next four screens collect birth, residence, photos and village leader, then guarantor.',
    }, */
    2: {
      title: 'Birth address',
      lead: 'Select province through village from the official hierarchy.',
    },
    3: {
      title: 'Residence address',
      lead: 'Where you live now—same hierarchy, one level at a time.',
    },
    4: {
      title: 'Photos & village leader',
      lead: 'Upload your passport-style and full photos, then enter village leader contact.',
    },
    5: {
      title: 'Guarantor',
      lead: `Guarantor phone must be ${RW_PHONE_10_LEN} digits starting with 07. Complete address and relationship, then submit.`,
    },
  }

  const registerHeading =
    mode === 'login' ? 'Sign in' : role === 'Job Seeker' ? jobSeekerStepCopy[registerStep]?.title || 'Create account' : 'Create account'

  const registerLead =
    mode === 'register' && role === 'Job Seeker' ? jobSeekerStepCopy[registerStep]?.lead || hint : hint

  return (
    <div className="authPageShell">
      <div
        className={
          mode === 'register' && role === 'Job Seeker' && registerStep >= 2
            ? 'authCardCompact authCardCompact--registerWide'
            : 'authCardCompact'
        }
      >
        <div className="authCardHead">
          <h1 className="authHeading">{mode === 'register' ? registerHeading : 'Sign in'}</h1>
          <p className="authLead">{mode === 'register' ? registerLead : hint}</p>
          <p style={{ fontSize: "14px", color: "#333" }}>
  <strong style={{ color: "#0d6efd" }}>Momo Pay Code:</strong> 059914 | 
  <strong style={{ color: "#0d6efd" }}> Name:</strong> Verde Rwanda Ltd | 
  <strong style={{ color: "#0d6efd" }}> Bank:</strong> Equity Bank | 
  <strong style={{ color: "#0d6efd" }}> Account:</strong> 
</p>
          {networkMessage ? <div className="toast error authToastInline authNetworkBanner">{networkMessage}</div> : null}
          {mode === 'register' && role === 'Job Seeker' ? (
            <>
              <div className="authStepper authStepper--five" role="navigation" aria-label={`Registration, step ${registerStep} of ${JOB_SEEKER_REGISTER_STEPS}`}>
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <div key={stepNum} className="authStepperSegment">
                    <div className={`authStepperStep ${registerStep === stepNum ? 'is-active' : ''} ${registerStep > stepNum ? 'is-done' : ''}`}>
                      <span className="authStepperNum" aria-hidden="true">
                        {stepNum}
                      </span>
                      <span className="authStepperLabel">
                        {stepNum === 1
                          ? 'Acct'
                          : stepNum === 2
                            ? 'Birth'
                            : stepNum === 3
                              ? 'Home'
                              : stepNum === 4
                                ? 'Photos'
                                : 'Guar'}
                      </span>
                    </div>
                    {stepNum < JOB_SEEKER_REGISTER_STEPS ? <div className="authStepperRail" aria-hidden="true" /> : null}
                  </div>
                ))}
              </div>
              <p className="authStepperCaption">
                Step {registerStep} of {JOB_SEEKER_REGISTER_STEPS}
              </p>
            </>
          ) : null}
        </div>

        <div className="authTabs authTabsCompact">
          <button
            type="button"
            className={mode === 'login' ? 'authTab active' : 'authTab'}
            onClick={() => {
              setMode('login')
              setRegisterStep(1)
              setShowForgot(false)
              setForgotMessage('')
              setForgotError('')
              setRegisterSuccess('')
              setConfirmPassword('')
              setShowPassword(false)
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'authTab active' : 'authTab'}
            onClick={() => {
              setMode('register')
              setRegisterStep(1)
              setShowForgot(false)
              setRegisterSuccess('')
              setConfirmPassword('')
              setShowPassword(false)
            }}
          >
            Register
          </button>
        </div>

        {showForgot && mode === 'login' ? (
          <form onSubmit={onForgotSubmit} className="authForm authFormCompact forgotPasswordPanel">
            <p className="authForgotIntro">Enter the email for your account. We will send a temporary password you can use to sign in, then change your password from your profile.</p>
            <label className="field fieldCompact">
              <span className="fieldLabel">Email</span>
              <input
                className="fieldInput"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            {forgotMessage ? <div className="toast success authToastInline">{forgotMessage}</div> : null}
            {forgotError ? <div className="toast error authToastInline">{forgotError}</div> : null}
            <button className="btn btnBlue authSubmitBtn" type="submit" disabled={forgotBusy}>
              {forgotBusy ? 'Sending…' : 'Send temporary password'}
            </button>
            <button
              type="button"
              className="authLinkButton"
              onClick={() => {
                setShowForgot(false)
                setForgotMessage('')
                setForgotError('')
              }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form
            onSubmit={onSubmit}
            className={`authForm authFormCompact${mode === 'register' && role === 'Job Seeker' && registerStep >= 2 ? ' authFormRegisterProfile' : ''}`}
          >
            {mode === 'register' && (
              <>
                {!(role === 'Job Seeker' && registerStep >= 2) ? (
                  <>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Full name</span>
                      <input className="fieldInput" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
                    </label>

                    <label className="field fieldCompact">
                      <span className="fieldLabel">Email</span>
                      <input className="fieldInput" type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                    </label>

                    <label className="field fieldCompact">
                      <span className="fieldLabel">Phone</span>
                      <input
                        className="fieldInput"
                        inputMode="numeric"
                        placeholder="0788123456"
                        pattern="07[0-9]{8}"
                        value={phone}
                        onChange={(e) => setPhone(digitsOnlyPhone10(e.target.value))}
                        maxLength={RW_PHONE_10_LEN}
                        autoComplete="tel"
                        required
                      />
                    </label>

                    <label className="field fieldCompact">
                      <span className="fieldLabel">I am registering as</span>
                      <select
                        className="fieldInput"
                        value={role}
                        onChange={(e) => {
                          setRole(e.target.value)
                          setRegisterStep(1)
                        }}
                      >
                        <option value="Job Seeker">Job Seeker</option>
                        <option value="Employer">Employer</option>
                      </select>
                    </label>
                  </>
                ) : null}

                {role === 'Job Seeker' && registerStep === 2 ? (
                  <>
    
                    {countryError ? <div className="toast error authToastInline">{countryError}</div> : null}
                    <h3 className="authSectionTitle">Birth address</h3>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Birth province</span>
                      <select
                        className="fieldInput"
                        value={userDetails.birth_province_id}
                        onChange={(e) => {
                          updateUserDetails('birth_province_id', e.target.value)
                          updateUserDetails('birth_district_id', '')
                          updateUserDetails('birth_sector_id', '')
                          updateUserDetails('birth_cell_id', '')
                          updateUserDetails('birth_village_id', '')
                        }}
                        required
                        disabled={countryLoading}
                      >
                        <option value="">{countryLoading ? 'Loading country data...' : 'Select province'}</option>
                        {provinces.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Birth district</span>
                      <select
                        className="fieldInput"
                        value={userDetails.birth_district_id}
                        onChange={(e) => {
                          updateUserDetails('birth_district_id', e.target.value)
                          updateUserDetails('birth_sector_id', '')
                          updateUserDetails('birth_cell_id', '')
                          updateUserDetails('birth_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select district</option>
                        {birthDistricts.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Birth sector</span>
                      <select
                        className="fieldInput"
                        value={userDetails.birth_sector_id}
                        onChange={(e) => {
                          updateUserDetails('birth_sector_id', e.target.value)
                          updateUserDetails('birth_cell_id', '')
                          updateUserDetails('birth_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select sector</option>
                        {birthSectors.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Birth cell</span>
                      <select
                        className="fieldInput"
                        value={userDetails.birth_cell_id}
                        onChange={(e) => {
                          updateUserDetails('birth_cell_id', e.target.value)
                          updateUserDetails('birth_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select cell</option>
                        {birthCells.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Birth village</span>
                      <select className="fieldInput" value={userDetails.birth_village_id} onChange={(e) => updateUserDetails('birth_village_id', e.target.value)} required>
                        <option value="">Select village</option>
                        {birthVillages.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                {role === 'Job Seeker' && registerStep === 3 ? (
                  <>
                    <p className="authSectionLead">Select your current residence from province down to village.</p>
                    {countryError ? <div className="toast error authToastInline">{countryError}</div> : null}
                    <h3 className="authSectionTitle">Residence address</h3>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Residence province</span>
                      <select
                        className="fieldInput"
                        value={userDetails.residence_province_id}
                        onChange={(e) => {
                          updateUserDetails('residence_province_id', e.target.value)
                          updateUserDetails('residence_district_id', '')
                          updateUserDetails('residence_sector_id', '')
                          updateUserDetails('residence_cell_id', '')
                          updateUserDetails('residence_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select province</option>
                        {provinces.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Residence district</span>
                      <select
                        className="fieldInput"
                        value={userDetails.residence_district_id}
                        onChange={(e) => {
                          updateUserDetails('residence_district_id', e.target.value)
                          updateUserDetails('residence_sector_id', '')
                          updateUserDetails('residence_cell_id', '')
                          updateUserDetails('residence_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select district</option>
                        {residenceDistricts.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Residence sector</span>
                      <select
                        className="fieldInput"
                        value={userDetails.residence_sector_id}
                        onChange={(e) => {
                          updateUserDetails('residence_sector_id', e.target.value)
                          updateUserDetails('residence_cell_id', '')
                          updateUserDetails('residence_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select sector</option>
                        {residenceSectors.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Residence cell</span>
                      <select
                        className="fieldInput"
                        value={userDetails.residence_cell_id}
                        onChange={(e) => {
                          updateUserDetails('residence_cell_id', e.target.value)
                          updateUserDetails('residence_village_id', '')
                        }}
                        required
                      >
                        <option value="">Select cell</option>
                        {residenceCells.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Residence village</span>
                      <select className="fieldInput" value={userDetails.residence_village_id} onChange={(e) => updateUserDetails('residence_village_id', e.target.value)} required>
                        <option value="">Select village</option>
                        {residenceVillages.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                {role === 'Job Seeker' && registerStep === 4 ? (
                  <>
                    <h3 className="authSectionTitle">Your photos</h3>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Passport-style photo</span>
                      <input className="fieldInput" type="file" accept="image/*" onChange={(e) => updateUserDetails('passport_photo', e.target.files?.[0] || null)} required />
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Full photo</span>
                      <input className="fieldInput" type="file" accept="image/*" onChange={(e) => updateUserDetails('full_photo', e.target.files?.[0] || null)} required />
                    </label>

                    <h3 className="authSectionTitle">Village leader contact</h3>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Village leader full name</span>
                      <input
                        className="fieldInput"
                        placeholder="e.g. Jean Baptiste Ntambara"
                        value={userDetails.village_leader_name}
                        onChange={(e) => updateUserDetails('village_leader_name', e.target.value)}
                        required
                        maxLength={150}
                        autoComplete="name"
                      />
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Village leader phone</span>
                      <input
                        className="fieldInput"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="0788123456"
                        pattern="07[0-9]{8}"
                        value={userDetails.village_leader_phone}
                        onChange={(e) => updateUserDetails('village_leader_phone', digitsOnlyPhone10(e.target.value))}
                        required
                        maxLength={RW_PHONE_10_LEN}
                      />
                    </label>
                  </>
                ) : null}

                {role === 'Job Seeker' && registerStep === 5 ? (
                  <>
                   
                    {countryError ? <div className="toast error authToastInline">{countryError}</div> : null}
                    <h3 className="authSectionTitle">Guarantor</h3>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor full name</span>
                      <input className="fieldInput" value={guarantor.full_name} onChange={(e) => updateGuarantor('full_name', e.target.value)} required maxLength={150} />
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor phone</span>
                      <input
                        className="fieldInput"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="0788123456"
                        pattern="07[0-9]{8}"
                        value={guarantor.phone}
                        onChange={(e) => updateGuarantor('phone', digitsOnlyPhone10(e.target.value))}
                        required
                        maxLength={RW_PHONE_10_LEN}
                      />
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor district</span>
                      <select
                        className="fieldInput"
                        value={guarantor.district_id}
                        onChange={(e) => {
                          updateGuarantor('district_id', e.target.value)
                          updateGuarantor('sector_id', '')
                          updateGuarantor('cell_id', '')
                          updateGuarantor('village_id', '')
                        }}
                        required
                      >
                        <option value="">Select district</option>
                        {countryRows.filter((r) => Number(r.countryLevelId) === COUNTRY_LEVELS.district).map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor sector</span>
                      <select
                        className="fieldInput"
                        value={guarantor.sector_id}
                        onChange={(e) => {
                          updateGuarantor('sector_id', e.target.value)
                          updateGuarantor('cell_id', '')
                          updateGuarantor('village_id', '')
                        }}
                        required
                      >
                        <option value="">Select sector</option>
                        {guarantorSectors.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor cell</span>
                      <select
                        className="fieldInput"
                        value={guarantor.cell_id}
                        onChange={(e) => {
                          updateGuarantor('cell_id', e.target.value)
                          updateGuarantor('village_id', '')
                        }}
                        required
                      >
                        <option value="">Select cell</option>
                        {guarantorCells.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Guarantor village</span>
                      <select className="fieldInput" value={guarantor.village_id} onChange={(e) => updateGuarantor('village_id', e.target.value)} required>
                        <option value="">Select village</option>
                        {guarantorVillages.map((row) => (
                          <option key={row.countryHierachyId} value={row.countryHierachyId}>
                            {row.hierachyName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field fieldCompact">
                      <span className="fieldLabel">Relationship</span>
                      <input className="fieldInput" value={guarantor.relationship} onChange={(e) => updateGuarantor('relationship', e.target.value)} required maxLength={100} />
                    </label>
                  </>
                ) : null}
              </>
            )}

            {mode === 'login' && (
              <label className="field fieldCompact">
                <span className="fieldLabel">Email</span>
                <input className="fieldInput" type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
            )}

            {mode === 'register' && !(role === 'Job Seeker' && registerStep >= 2) ? (
              <label className="field fieldCompact">
                <span className="fieldLabel">Payment proof(2500FRW)</span>
                <input
                  className="fieldInput"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  required
                />
              </label>
            ) : null}

            {(mode === 'login' || (mode === 'register' && !(role === 'Job Seeker' && registerStep >= 2))) && (
              <>
                <label className="field fieldCompact">
                  <span className="fieldLabel">Password</span>
                  <div className="passwordInputWrap">
                    <input
                      className="fieldInput passwordFieldInput"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="passwordIconBtn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                {mode === 'register' ? (
                  <label className="field fieldCompact">
                    <span className="fieldLabel">Confirm password</span>
                    <div className="passwordInputWrap">
                      <input
                        className="fieldInput passwordFieldInput"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordIconBtn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                ) : null}
                {mode === 'register' ? <div className="dashSubtle">{STRONG_PASSWORD_HINT}</div> : null}
              </>
            )}

            {mode === 'login' ? (
              <button type="button" className="authLinkButton authForgotLink" onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            ) : null}

            {error ? <div className="toast error authToastInline">{error}</div> : null}
            {registerSuccess ? <div className="toast success authToastInline">{registerSuccess}</div> : null}

            {mode === 'register' && role === 'Job Seeker' && registerStep >= 2 ? (
              <div className="authRegisterFooter">
                <button
                  type="button"
                  className="btn btnOutline authRegisterFooterBack"
                  onClick={() => setRegisterStep((s) => Math.max(1, s - 1))}
                  disabled={busy || loading}
                >
                  Back
                </button>
                <button className="btn btnBlue authRegisterFooterSubmit" type="submit" disabled={busy || loading}>
                  {busy || loading
                    ? 'Please wait…'
                    : registerStep < JOB_SEEKER_REGISTER_STEPS
                      ? 'Continue'
                      : 'Submit registration'}
                </button>
              </div>
            ) : (
              <button className="btn btnBlue authSubmitBtn" type="submit" disabled={busy || loading}>
                {busy || loading
                  ? 'Please wait…'
                  : mode === 'register'
                    ? role === 'Job Seeker' && registerStep === 1
                      ? 'Continue to birth address'
                      : 'Create account'
                    : 'Sign in'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
