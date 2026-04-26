import { useEffect, useMemo, useState } from 'react'
import './App.css'
import heroImg from './assets/hero.png'

function WhatsAppFloatingButton() {
  return (
    <a
      className="whatsappFloating"
      href="https://wa.me/250788599614"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with WhatsApp"
      title="WhatsApp Verde Rwanda"
    >
      <svg viewBox="0 0 32 32" className="whatsappIcon" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.07 18.03c-.12-.06-.71-.35-1.64-.8c-.2-.1-.36-.15-.52.1c-.16.2-.6.8-.74.96c-.14.16-.27.18-.49.08c-.22-.1-.92-.34-1.75-1.08c-.65-.58-1.09-1.31-1.22-1.53c-.13-.22-.01-.34.09-.44c.1-.1.22-.27.33-.4c.11-.14.14-.22.21-.37c.07-.15.03-.28-.02-.4c-.05-.12-.52-1.28-.7-1.74c-.18-.44-.37-.38-.52-.39h-.45c-.15 0-.39.06-.59.28c-.2.22-.77.75-.77 1.82c0 1.07.79 2.1.9 2.24c.11.14 1.55 2.37 3.76 3.32c.53.23.95.36 1.27.46c.53.17 1.01.15 1.39.1c.43-.06 1.32-.54 1.5-1.06c.19-.53.19-.99.13-1.06c-.06-.08-.22-.13-.34-.2Z"
        />
        <path
          fill="currentColor"
          d="M16 3.5C9.9 3.5 5 8.38 5 14.5c0 2.04.55 3.95 1.56 5.6L5.1 28.5l8.66-1.46c1.55.84 3.31 1.46 5.32 1.46c6.1 0 11-4.88 11-11c0-6.12-4.9-11-11-11Zm0 19.5c-1.67 0-3.19-.47-4.53-1.28l-.31-.19l-5.36.9l.88-5.3l-.2-.31C6.99 15.46 6.5 14.02 6.5 13c0-5.1 4.1-9 9.5-9s9.5 3.9 9.5 9s-4.1 10-9.5 10Z"
        />
      </svg>
    </a>
  )
}

function SmallIcon({ variant }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (variant === 'plumbing') {
    return (
      <svg viewBox="0 0 24 24" className="cardIcon" aria-hidden="true">
        <path {...common} d="M5 19l4-4" />
        <path {...common} d="M9 15l5-5" />
        <path {...common} d="M14 10l5 5" />
        <path {...common} d="M2 22l2-2" />
      </svg>
    )
  }

  if (variant === 'water') {
    return (
      <svg viewBox="0 0 24 24" className="cardIcon" aria-hidden="true">
        <path {...common} d="M12 2s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12Z" />
      </svg>
    )
  }

  if (variant === 'rent') {
    return (
      <svg viewBox="0 0 24 24" className="cardIcon" aria-hidden="true">
        <path {...common} d="M3 7h18" />
        <path {...common} d="M6 7V4h12v3" />
        <path {...common} d="M6 7l-1 14h14l-1-14" />
        <path {...common} d="M9 12h6" />
      </svg>
    )
  }

  if (variant === 'jobs') {
    return (
      <svg viewBox="0 0 24 24" className="cardIcon" aria-hidden="true">
        <path {...common} d="M9 6V4h6v2" />
        <path {...common} d="M3 8h18v12H3z" />
        <path {...common} d="M3 12h18" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="cardIcon" aria-hidden="true">
      <path {...common} d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path {...common} d="M3 7v10l9 4 9-4V7" />
    </svg>
  )
}

export default function App() {
  const services = [
    {
      title: 'Plumbing Solutions',
      description: 'Design, installation and maintenance for reliable plumbing systems.',
      variant: 'plumbing',
    },
    {
      title: 'Water System Solutions',
      description: 'Design, construction and supervision for distribution networks and storage infrastructure.',
      variant: 'water',
    },
    {
      title: 'Equipment Rentals',
      description: 'Access dependable construction and plumbing equipment for your projects.',
      variant: 'rent',
    },
    {
      title: 'Employment Opportunities',
      description: 'A dynamic platform connecting job seekers and employers in the sector.',
      variant: 'jobs',
    },
    {
      title: 'Material Supply',
      description: 'High-quality water materials to support your installations.',
      variant: 'materials',
    },
  ]

  const projectsPlaceholder = [
    { title: 'Installed Pipelines', image: heroImg },
    { title: 'Water Tanks & Storage', image: heroImg },
    { title: 'Pump Installations', image: heroImg },
    { title: 'Construction Site Works', image: heroImg },
    { title: 'Distribution Network Supervision', image: heroImg },
    { title: 'Water Infrastructure Projects', image: heroImg },
  ]

  const contact = {
    phone: '+250788599614',
    email: 'verderwanda@gmail.com',
    address: 'Kicukiro, Kicukiro, Umujyi wa Kigali, RWANDA',
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

  function normalizeRole(role) {
    const r = String(role || '').trim().toLowerCase()
    if (r === 'admin') return 'admin'
    if (r === 'employer') return 'employer'
    if (r === 'job seeker' || r === 'jobseeker' || r === 'job_seeker' || r === 'job-seeker') return 'job_seeker'
    return r
  }

  const [token, setToken] = useState(() => localStorage.getItem('verde_token') || '')
  const [me, setMe] = useState(null)

  const [categories, setCategories] = useState([])
  const [equipment, setEquipment] = useState([])
  const [materials, setMaterials] = useState([])
  const [jobs, setJobs] = useState([])
  const [employers, setEmployers] = useState([])
  const [jobSeekers, setJobSeekers] = useState([])
  const [projectsApi, setProjectsApi] = useState([])

  // Dashboard data
  const [dashBusy, setDashBusy] = useState(false)
  const [adminJobApplications, setAdminJobApplications] = useState([])
  const [adminEquipmentBookings, setAdminEquipmentBookings] = useState([])
  const [adminMaterialOrders, setAdminMaterialOrders] = useState([])
  const [adminServiceRequests, setAdminServiceRequests] = useState([])
  const [employerJobApplications, setEmployerJobApplications] = useState([])
  const [jobSeekerJobApplications, setJobSeekerJobApplications] = useState([])

  const normalizedMeRole = useMemo(() => normalizeRole(me?.role), [me])

  const currentEmployer = useMemo(() => {
    if (!me?.user_id) return null
    const found = employers.find((e) => Number(e.user_id) === Number(me.user_id))
    return found || null
  }, [employers, me])

  const currentJobSeeker = useMemo(() => {
    if (!me?.user_id) return null
    const found = jobSeekers.find((js) => Number(js.user_id) === Number(me.user_id))
    return found || null
  }, [jobSeekers, me])

  const [toast, setToast] = useState(null)
  function showToast(type, message) {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 4500)
  }

  function logout() {
    localStorage.removeItem('verde_token')
    setToken('')
    setMe(null)
    showToast('success', 'Logged out.')
  }

  async function apiRequest(path, { method = 'GET', jsonBody = undefined, formData = undefined, tokenOverride } = {}) {
    const headers = {}
    const bearer = tokenOverride ?? token
    if (bearer) headers.Authorization = `Bearer ${bearer}`
    if (!formData && jsonBody) headers['Content-Type'] = 'application/json'

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData ? formData : jsonBody ? JSON.stringify(jsonBody) : undefined,
    })

    const text = await res.text()
    let parsed = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    if (!res.ok) {
      const message = parsed?.error?.message || parsed?.message || res.statusText || 'Request failed'
      throw new Error(message)
    }
    return parsed?.data ?? parsed
  }

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      if (!token) {
        setMe(null)
        return
      }
      try {
        const data = await apiRequest('/auth/me')
        if (!cancelled) setMe(data)
      } catch (e) {
        if (!cancelled) {
          setToken('')
          localStorage.removeItem('verde_token')
          setMe(null)
          showToast('error', e.message || 'Session expired. Please log in again.')
        }
      }
    }
    void loadMe()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function loadPublic() {
      try {
        const [catRes, eqRes, matRes, jobsRes, empRes, jsRes, projectsRes] = await Promise.all([
          apiRequest('/job-categories'),
          apiRequest('/equipment'),
          apiRequest('/materials'),
          apiRequest('/jobs'),
          apiRequest('/employers'),
          apiRequest('/job-seekers'),
          apiRequest('/projects'),
        ])
        if (cancelled) return
        setCategories(catRes || [])
        setEquipment(eqRes || [])
        setMaterials(matRes || [])
        setJobs(jobsRes || [])
        setEmployers(empRes || [])
        setJobSeekers(jsRes || [])
        setProjectsApi(projectsRes || [])
      } catch (e) {
        if (!cancelled) showToast('error', e.message || 'Failed to load site data.')
      }
    }
    void loadPublic()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAdminDash() {
    setDashBusy(true)
    try {
      const [apps, bookings, orders, requests] = await Promise.all([
        apiRequest('/job-applications'),
        apiRequest('/equipment-bookings'),
        apiRequest('/material-orders'),
        apiRequest('/service-requests'),
      ])
      setAdminJobApplications(apps || [])
      setAdminEquipmentBookings(bookings || [])
      setAdminMaterialOrders(orders || [])
      setAdminServiceRequests(requests || [])
    } finally {
      setDashBusy(false)
    }
  }

  async function loadEmployerDash() {
    setDashBusy(true)
    try {
      const apps = await apiRequest('/job-applications')
      setEmployerJobApplications(apps || [])
    } finally {
      setDashBusy(false)
    }
  }

  async function loadJobSeekerDash() {
    setDashBusy(true)
    try {
      const apps = await apiRequest('/job-applications')
      setJobSeekerJobApplications(apps || [])
    } finally {
      setDashBusy(false)
    }
  }

  function normalizeAnyStatus(s) {
    return String(s || '').trim().toLowerCase()
  }

  function isApprovedStatus(s) {
    const v = normalizeAnyStatus(s)
    return v === 'approved' || v === 'accepted' || v === 'accept'
  }

  function statusTone(status) {
    const v = normalizeAnyStatus(status)
    if (isApprovedStatus(v)) return 'green'
    if (v === 'rejected' || v === 'reject' || v === 'declined') return 'red'
    if (!v || v === 'pending' || v === 'new' || v === 'submitted') return 'blue'
    return 'blue'
  }

  async function adminSetJobSeekerStatus(applicationId, nextStatus) {
    await apiRequest(`/job-applications/${applicationId}`, {
      method: 'PATCH',
      jsonBody: { jobseeker_status: nextStatus },
    })
    await loadAdminDash()
  }

  async function adminSetBookingStatus(bookingId, nextStatus) {
    await apiRequest(`/equipment-bookings/${bookingId}`, {
      method: 'PATCH',
      jsonBody: { status: nextStatus },
    })
    await loadAdminDash()
  }

  async function adminSetOrderStatus(orderId, nextStatus) {
    await apiRequest(`/material-orders/${orderId}`, {
      method: 'PATCH',
      jsonBody: { status: nextStatus },
    })
    await loadAdminDash()
  }

  async function adminSetRequestStatus(requestId, nextStatus) {
    await apiRequest(`/service-requests/${requestId}`, {
      method: 'PATCH',
      jsonBody: { status: nextStatus },
    })
    await loadAdminDash()
  }

  async function employerSetEmployerStatus(applicationId, nextStatus) {
    await apiRequest(`/job-applications/${applicationId}`, {
      method: 'PATCH',
      jsonBody: { employer_status: nextStatus },
    })
    await loadEmployerDash()
  }

  useEffect(() => {
    if (!token) return
    if (normalizedMeRole === 'admin') {
      void loadAdminDash()
    } else if (normalizedMeRole === 'employer') {
      void loadEmployerDash()
    } else if (normalizedMeRole === 'job_seeker') {
      void loadJobSeekerDash()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, normalizedMeRole])

  function AuthCard({ initialMode = 'login' }) {
    const [mode, setMode] = useState(initialMode)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState('Job Seeker')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)

    async function onSubmit(e) {
      e.preventDefault()
      setBusy(true)
      try {
        const payload =
          mode === 'register'
            ? { name, email, phone: phone || '', password, role }
            : { email, password }
        const data = await apiRequest(mode === 'register' ? '/auth/register' : '/auth/login', {
          method: 'POST',
          jsonBody: payload,
        })
        const nextToken = data?.token
        if (!nextToken) throw new Error('Missing token in response.')

        localStorage.setItem('verde_token', nextToken)
        setToken(nextToken)
        showToast('success', 'Login successful.')
      } catch (err) {
        showToast('error', err.message || 'Authentication failed.')
      } finally {
        setBusy(false)
      }
    }

    return (
      <div className="authCard">
        <div className="authTabs">
          <button type="button" className={mode === 'login' ? 'authTab active' : 'authTab'} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'authTab active' : 'authTab'} onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="authForm">
          {mode === 'register' && (
            <>
              <label className="field">
                <span className="fieldLabel">Full name</span>
                <input className="fieldInput" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <div className="formRow2">
                <label className="field">
                  <span className="fieldLabel">Email</span>
                  <input className="fieldInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="fieldLabel">Phone</span>
                  <input className="fieldInput" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span className="fieldLabel">Role</span>
                <select className="fieldInput" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Admin">Admin</option>
                  <option value="Employer">Employer</option>
                  <option value="Job Seeker">Job Seeker</option>
                </select>
              </label>
            </>
          )}

          {mode === 'login' && (
            <label className="field">
              <span className="fieldLabel">Email</span>
              <input className="fieldInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          )}

          <label className="field">
            <span className="fieldLabel">Password</span>
            <input className="fieldInput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button className="btn btnBlue" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </div>
    )
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
  const [quoteBusy, setQuoteBusy] = useState(false)

  async function submitQuote(e) {
    e.preventDefault()
    if (!quote.attachment) return showToast('error', 'Please attach a file.')
    setQuoteBusy(true)
    try {
      const formData = new FormData()
      formData.append('customer_name', quote.customer_name)
      formData.append('phone', quote.phone)
      formData.append('email', quote.email)
      formData.append('service_type', quote.service_type)
      formData.append('project_description', quote.project_description)
      formData.append('location', quote.location)
      formData.append('status', 'new')
      formData.append('attachment', quote.attachment)
      await apiRequest('/request-quotes', { method: 'POST', formData })
      showToast('success', 'Quote request submitted successfully.')
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
      showToast('error', err.message || 'Failed to submit quote.')
    } finally {
      setQuoteBusy(false)
    }
  }

  const [contactMsg, setContactMsg] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [contactBusy, setContactBusy] = useState(false)

  async function submitContactMsg(e) {
    e.preventDefault()
    setContactBusy(true)
    try {
      await apiRequest('/contact-messages', { method: 'POST', jsonBody: { ...contactMsg, status: 'new' } })
      showToast('success', 'Message sent successfully.')
      setContactMsg({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      showToast('error', err.message || 'Failed to send message.')
    } finally {
      setContactBusy(false)
    }
  }

  const [rent, setRent] = useState({
    equipment_id: '',
    customer_name: '',
    phone: '',
    start_date: '',
    end_date: '',
    total_price: '',
    payment_proof: null,
  })
  const [rentBusy, setRentBusy] = useState(false)

  async function submitRent(e) {
    e.preventDefault()
    if (!rent.payment_proof) return showToast('error', 'Please attach payment proof.')
    setRentBusy(true)
    try {
      const formData = new FormData()
      formData.append('equipment_id', rent.equipment_id)
      formData.append('customer_name', rent.customer_name)
      formData.append('phone', rent.phone)
      formData.append('start_date', rent.start_date)
      formData.append('end_date', rent.end_date)
      formData.append('total_price', rent.total_price)
      formData.append('status', 'pending')
      formData.append('payment_proof', rent.payment_proof)
      await apiRequest('/equipment-bookings', { method: 'POST', formData })
      showToast('success', 'Equipment booking submitted successfully.')
      setRent({
        equipment_id: '',
        customer_name: '',
        phone: '',
        start_date: '',
        end_date: '',
        total_price: '',
        payment_proof: null,
      })
    } catch (err) {
      showToast('error', err.message || 'Failed to submit booking.')
    } finally {
      setRentBusy(false)
    }
  }

  const [materialOrder, setMaterialOrder] = useState({
    material_id: '',
    customer_name: '',
    phone: '',
    delivery_address: '',
    quantity: '',
    total_price: '',
    payment_proof: null,
  })
  const [materialOrderBusy, setMaterialOrderBusy] = useState(false)

  async function submitMaterialOrder(e) {
    e.preventDefault()
    if (!materialOrder.material_id) return showToast('error', 'Select a material.')
    if (!materialOrder.payment_proof) return showToast('error', 'Please attach payment proof.')
    if (!materialOrder.quantity) return showToast('error', 'Quantity is required.')

    setMaterialOrderBusy(true)
    try {
      const formData = new FormData()
      formData.append('material_id', materialOrder.material_id)
      formData.append('customer_name', materialOrder.customer_name)
      formData.append('phone', materialOrder.phone)
      formData.append('delivery_address', materialOrder.delivery_address)
      formData.append('quantity', String(materialOrder.quantity))
      formData.append('total_price', materialOrder.total_price)
      formData.append('status', 'pending')
      formData.append('payment_proof', materialOrder.payment_proof)

      await apiRequest('/material-orders', { method: 'POST', formData })
      showToast('success', 'Material order submitted successfully.')
      setMaterialOrder({
        material_id: '',
        customer_name: '',
        phone: '',
        delivery_address: '',
        quantity: '',
        total_price: '',
        payment_proof: null,
      })
    } catch (err) {
      showToast('error', err.message || 'Failed to submit material order.')
    } finally {
      setMaterialOrderBusy(false)
    }
  }

  const [postJob, setPostJob] = useState({
    category_id: '',
    title: '',
    description: '',
    location: '',
    salary: '',
    term_id: '',
  })
  const [postJobBusy, setPostJobBusy] = useState(false)

  async function submitPostJob(e) {
    e.preventDefault()
    if (!currentEmployer?.employer_id) return showToast('error', 'Employer profile not found for your account.')
    if (!postJob.category_id) return showToast('error', 'Please select a category.')
    if (!postJob.term_id) return showToast('error', 'Please accept the Terms & Conditions.')
    setPostJobBusy(true)
    try {
      await apiRequest('/jobs', {
        method: 'POST',
        jsonBody: {
          employer_id: currentEmployer.employer_id,
          category_id: postJob.category_id,
          title: postJob.title,
          description: postJob.description,
          location: postJob.location,
          salary: postJob.salary,
          status: 'open',
          term_id: postJob.term_id,
        },
      })
      showToast('success', 'Job posted successfully.')
      setPostJob({
        category_id: '',
        title: '',
        description: '',
        location: '',
        salary: '',
        term_id: '',
      })
    } catch (err) {
      showToast('error', err.message || 'Failed to post job.')
    } finally {
      setPostJobBusy(false)
    }
  }

  const [apply, setApply] = useState({
    job_id: '',
    cover_message: '',
    cv_file: null,
    agree: true,
  })
  const [applyBusy, setApplyBusy] = useState(false)

  async function submitApply(e) {
    e.preventDefault()
    if (!apply.job_id) return showToast('error', 'Select a job to apply.')
    if (!currentJobSeeker?.jobseeker_id) return showToast('error', 'Job seeker profile not found for your account.')
    if (!apply.cv_file) return showToast('error', 'Please upload your CV.')
    if (!apply.agree) return showToast('error', 'Please accept the terms to continue.')
    setApplyBusy(true)
    try {
      const formData = new FormData()
      formData.append('job_id', apply.job_id)
      formData.append('jobseeker_id', currentJobSeeker.jobseeker_id)
      formData.append('cover_message', apply.cover_message)
      formData.append('employer_status', 'pending')
      formData.append('jobseeker_status', 'submitted')
      formData.append('cv_file', apply.cv_file)
      await apiRequest('/job-applications', { method: 'POST', formData })
      showToast('success', 'Application submitted successfully.')
      setApply({ job_id: '', cover_message: '', cv_file: null, agree: true })
    } catch (err) {
      showToast('error', err.message || 'Failed to apply.')
    } finally {
      setApplyBusy(false)
    }
  }

  return (
    <div className="appRoot">
      <WhatsAppFloatingButton />

      <header className="header">
        <div className="container headerInner">
          <a className="brand" href="#home" aria-label="Verde Rwanda Ltd home">
            <img className="brandLogo" src="/logo.png" alt="Verde Rwanda Ltd logo" />
            <div className="brandText">
              <div className="brandName">Verde Rwanda Ltd</div>
              <div className="brandSub">Plumbing and Water Systems</div>
            </div>
          </a>

          <nav className="nav">
            <a href="#services">Services</a>
            <a href="#why">Why Us</a>
            <a href="#projects">Projects</a>
            <a href="#material-supply">Material Supply</a>
            {token && normalizedMeRole === 'admin' && <a href="#admin-approvals">Admin Approvals</a>}
            {token && normalizedMeRole === 'employer' && <a href="#employer-dashboard">Employer Dashboard</a>}
            {token && normalizedMeRole === 'job_seeker' && <a href="#jobseeker-dashboard">Job Seeker Dashboard</a>}
            <a href="#contact">Contact</a>

            {token ? (
              <button type="button" className="navBtn" onClick={logout}>
                Logout
              </button>
            ) : null}
          </nav>

          <a className="navCta" href="#request-quote">
            Request a Quote
          </a>
        </div>
      </header>

      <main>
        <section id="home" className="heroSection">
          <div className="container heroGrid">
            <div className="heroCopy">
              <div className="pill">Reliable. Sustainable. Built to last.</div>
              <h1 className="heroTitle">Professional Plumbing &amp; Water System Solutions in Rwanda</h1>
              <p className="heroLead">
                We design, install and maintain reliable plumbing and water infrastructure systems. We also
                provide equipment rentals, material supply and employment placement opportunities.
              </p>

              <div className="ctaRow">
                <a className="btn btnBlue" href="#request-quote">
                  Request a Quote
                </a>
                <a className="btn btnGreen" href="#post-job">
                  Post a Job
                </a>
                <a className="btn btnBlue" href="#rent-equipment">
                  Rent Equipment
                </a>
                <a className="btn btnOutline" href="#find-job">
                  Find a Job
                </a>
              </div>
            </div>

            <div className="heroMedia">
              <div className="heroImageCard">
                <img className="heroImage" src={heroImg} alt="Plumbing and water infrastructure" />
                <div className="heroGlow" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section sectionServices">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">What we do</h2>
              <p className="sectionSubtitle">Five core services delivered with technical excellence and fast response.</p>
            </div>

            <div className="cardsGrid">
              {services.map((s) => (
                <div key={s.title} className="serviceCard">
                  <div className="serviceIconWrap">
                    <SmallIcon variant={s.variant} />
                  </div>
                  <h3 className="serviceTitle">{s.title}</h3>
                  <p className="serviceDesc">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="section sectionWhy">
          <div className="container whyGrid">
            <div>
              <h2 className="sectionTitle">Why Choose Us</h2>
              <p className="sectionSubtitle">
                We combine modern engineering practices with dependable equipment and transparent pricing.
              </p>
            </div>

            <div className="whyCards">
              <div className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">Experienced Water Engineers</h3>
                  <p className="whyDesc">Built for Rwanda's real-world infrastructure and water management needs.</p>
                </div>
              </div>
              <div className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">Professional Design Tools</h3>
                  <p className="whyDesc">Using modern tools like Revit, AutoCAD, ArchiCAD, GIS and watergerm workflows.</p>
                </div>
              </div>
              <div className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">Reliable Equipment</h3>
                  <p className="whyDesc">We provide dependable rentals and materials for stable project delivery.</p>
                </div>
              </div>
              <div className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">Fast Response Team</h3>
                  <p className="whyDesc">Clear timelines, quick communication, and on-time execution.</p>
                </div>
              </div>
              <div className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">Transparent Pricing</h3>
                  <p className="whyDesc">We explain costs clearly and propose practical engineering solutions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="section sectionProjects">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Projects</h2>
              <p className="sectionSubtitle">Photos of installed pipelines, tanks, pump installations and site works.</p>
            </div>

            <div className="projectsGrid">
              {(projectsApi.length ? projectsApi : projectsPlaceholder).map((p) => (
                <div key={p.title} className="projectCard">
                  <div className="projectImageWrap">
                    <img className="projectImage" src={p.image || heroImg} alt={p.title} />
                  </div>
                  <div className="projectMeta">
                    <h3 className="projectTitle">{p.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="projectsNote">
              Replace these placeholder images with your real project photos (pipelines, tanks, pumps, and construction sites).
            </div>
          </div>
        </section>

        <section id="request-quote" className="section sectionForm">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Request a Quote</h2>
              <p className="sectionSubtitle">Tell us about your project and attach the required details.</p>
            </div>

            <div className="formCard">
              <form onSubmit={submitQuote} className="formBody">
                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Customer name</span>
                    <input className="fieldInput" value={quote.customer_name} onChange={(e) => setQuote((q) => ({ ...q, customer_name: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Phone</span>
                    <input className="fieldInput" value={quote.phone} onChange={(e) => setQuote((q) => ({ ...q, phone: e.target.value }))} required />
                  </label>
                </div>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Email</span>
                    <input className="fieldInput" type="email" value={quote.email} onChange={(e) => setQuote((q) => ({ ...q, email: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Service type</span>
                    <input className="fieldInput" value={quote.service_type} onChange={(e) => setQuote((q) => ({ ...q, service_type: e.target.value }))} required />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Project description</span>
                  <textarea className="fieldInput textarea" value={quote.project_description} onChange={(e) => setQuote((q) => ({ ...q, project_description: e.target.value }))} required />
                </label>

                <label className="field">
                  <span className="fieldLabel">Location</span>
                  <input className="fieldInput" value={quote.location} onChange={(e) => setQuote((q) => ({ ...q, location: e.target.value }))} required />
                </label>

                <label className="field">
                  <span className="fieldLabel">Attachment</span>
                  <input
                    className="fieldInput"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setQuote((q) => ({ ...q, attachment: e.target.files?.[0] || null }))}
                    required
                  />
                </label>

                <button className="btn btnBlue formSubmit" type="submit" disabled={quoteBusy}>
                  {quoteBusy ? 'Submitting...' : 'Send quote request'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section id="post-job" className="section sectionForm">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Post a Job</h2>
              <p className="sectionSubtitle">Employers can post job opportunities in the construction and water sector.</p>
            </div>

            {token && normalizedMeRole === 'employer' ? (
              <div className="formCard">
                <form onSubmit={submitPostJob} className="formBody">
                  <div className="formRow2">
                    <label className="field">
                      <span className="fieldLabel">Job category</span>
                      <select className="fieldInput" value={postJob.category_id} onChange={(e) => setPostJob((p) => ({ ...p, category_id: e.target.value }))} required>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.category_id} value={c.category_id}>
                            {c.category_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Location</span>
                      <input className="fieldInput" value={postJob.location} onChange={(e) => setPostJob((p) => ({ ...p, location: e.target.value }))} required />
                    </label>
                  </div>

                  <label className="field">
                    <span className="fieldLabel">Title</span>
                    <input className="fieldInput" value={postJob.title} onChange={(e) => setPostJob((p) => ({ ...p, title: e.target.value }))} required />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Description</span>
                    <textarea className="fieldInput textarea" value={postJob.description} onChange={(e) => setPostJob((p) => ({ ...p, description: e.target.value }))} required />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Salary</span>
                    <input className="fieldInput" value={postJob.salary} onChange={(e) => setPostJob((p) => ({ ...p, salary: e.target.value }))} />
                  </label>

                  <label className="checkRow">
                    <input type="checkbox" checked={Boolean(postJob.terms_accepted)} onChange={(e) => setPostJob((p) => ({ ...p, terms_accepted: e.target.checked }))} />
                    <span>I agree to the terms and conditions.</span>
                  </label>

                  <button className="btn btnGreen formSubmit" type="submit" disabled={postJobBusy}>
                    {postJobBusy ? 'Posting...' : 'Post job'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="formCard">
                <div className="emptyStateTitle">Login as Employer to post a job</div>
                <div className="emptyStateText">
                  Your account role must be <b>Employer</b> to create jobs.
                </div>
                <div className="spacer10" />
                <AuthCard initialMode="login" />
              </div>
            )}
          </div>
        </section>

        <section id="rent-equipment" className="section sectionForm">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Rent Equipment</h2>
              <p className="sectionSubtitle">Book reliable equipment for your plumbing and construction projects.</p>
            </div>

            <div className="formCard">
              <form onSubmit={submitRent} className="formBody">
                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Equipment</span>
                    <select className="fieldInput" value={rent.equipment_id} onChange={(e) => setRent((r) => ({ ...r, equipment_id: e.target.value }))} required>
                      <option value="">Select equipment</option>
                      {equipment.map((eq) => (
                        <option key={eq.equipment_id} value={eq.equipment_id} disabled={!eq.availability}>
                          {eq.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Customer name</span>
                    <input className="fieldInput" value={rent.customer_name} onChange={(e) => setRent((r) => ({ ...r, customer_name: e.target.value }))} required />
                  </label>
                </div>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Phone</span>
                    <input className="fieldInput" value={rent.phone} onChange={(e) => setRent((r) => ({ ...r, phone: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Total price</span>
                    <input className="fieldInput" value={rent.total_price} onChange={(e) => setRent((r) => ({ ...r, total_price: e.target.value }))} required />
                  </label>
                </div>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Start date</span>
                    <input className="fieldInput" type="date" value={rent.start_date} onChange={(e) => setRent((r) => ({ ...r, start_date: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">End date</span>
                    <input className="fieldInput" type="date" value={rent.end_date} onChange={(e) => setRent((r) => ({ ...r, end_date: e.target.value }))} required />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Payment proof</span>
                  <input
                    className="fieldInput"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setRent((r) => ({ ...r, payment_proof: e.target.files?.[0] || null }))}
                    required
                  />
                </label>

                <button className="btn btnBlue formSubmit" type="submit" disabled={rentBusy}>
                  {rentBusy ? 'Booking...' : 'Submit booking'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section id="material-supply" className="section sectionForm">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Material Supply</h2>
              <p className="sectionSubtitle">Order water materials for your projects.</p>
            </div>

            <div className="formCard">
              <form onSubmit={submitMaterialOrder} className="formBody">
                <label className="field">
                  <span className="fieldLabel">Material</span>
                  <select
                    className="fieldInput"
                    value={materialOrder.material_id}
                    onChange={(e) => setMaterialOrder((m) => ({ ...m, material_id: e.target.value }))}
                    required
                  >
                    <option value="">Select material</option>
                    {materials.map((m) => (
                      <option key={m.material_id} value={m.material_id} disabled={m.stock !== undefined && Number(m.stock) <= 0}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Customer name</span>
                    <input
                      className="fieldInput"
                      value={materialOrder.customer_name}
                      onChange={(e) => setMaterialOrder((m) => ({ ...m, customer_name: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Phone</span>
                    <input
                      className="fieldInput"
                      value={materialOrder.phone}
                      onChange={(e) => setMaterialOrder((m) => ({ ...m, phone: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Delivery address</span>
                  <textarea
                    className="fieldInput textarea"
                    value={materialOrder.delivery_address}
                    onChange={(e) => setMaterialOrder((m) => ({ ...m, delivery_address: e.target.value }))}
                    required
                  />
                </label>

                <div className="formRow2">
                  <label className="field">
                    <span className="fieldLabel">Quantity</span>
                    <input
                      className="fieldInput"
                      type="number"
                      min="1"
                      value={materialOrder.quantity}
                      onChange={(e) => setMaterialOrder((m) => ({ ...m, quantity: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Total price</span>
                    <input
                      className="fieldInput"
                      value={materialOrder.total_price}
                      onChange={(e) => setMaterialOrder((m) => ({ ...m, total_price: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Payment proof</span>
                  <input
                    className="fieldInput"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setMaterialOrder((m) => ({ ...m, payment_proof: e.target.files?.[0] || null }))}
                    required
                  />
                </label>

                <button className="btn btnBlue formSubmit" type="submit" disabled={materialOrderBusy || !materials.length}>
                  {materialOrderBusy ? 'Submitting...' : 'Submit order'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section id="find-job" className="section sectionForm">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Find a Job</h2>
              <p className="sectionSubtitle">Browse available jobs and apply with your CV.</p>
            </div>

            {token && normalizedMeRole === 'job_seeker' ? (
              <div className="formCard">
                <form onSubmit={submitApply} className="formBody">
                  <label className="field">
                    <span className="fieldLabel">Select job</span>
                    <select className="fieldInput" value={apply.job_id} onChange={(e) => setApply((a) => ({ ...a, job_id: e.target.value }))} required>
                      <option value="">Choose a job</option>
                      {jobs.map((j) => (
                        <option key={j.job_id} value={j.job_id}>
                          {j.title} - {j.location}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Skills</span>
                    <textarea className="fieldInput textarea" value={apply.cover_message} onChange={(e) => setApply((a) => ({ ...a, cover_message: e.target.value }))} required />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">CV file</span>
                    <input
                      className="fieldInput"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setApply((a) => ({ ...a, cv_file: e.target.files?.[0] || null }))}
                      required
                    />
                  </label>

                  <label className="checkRow">
                    <input type="checkbox" checked={Boolean(apply.agree)} onChange={(e) => setApply((a) => ({ ...a, agree: e.target.checked }))} />
                    <span>I accept the terms and conditions (including payment terms if selected).</span>
                  </label>

                  <button className="btn btnGreen formSubmit" type="submit" disabled={applyBusy}>
                    {applyBusy ? 'Applying...' : 'Submit application'}
                  </button>

                  {!currentJobSeeker && <div className="hintText">Your account needs a job seeker profile to apply.</div>}
                </form>
              </div>
            ) : (
              <div className="formCard">
                <div className="emptyStateTitle">Login as Job Seeker to apply</div>
                <div className="emptyStateText">
                  Your account role must be <b>Job Seeker</b>.
                </div>
                <div className="spacer10" />
                <AuthCard initialMode="login" />
              </div>
            )}
          </div>
        </section>

        <section id="admin-approvals" className="section dashSection">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Admin Approvals</h2>
              <p className="sectionSubtitle">Approve/Reject job applications, equipment bookings, material orders and service requests.</p>
            </div>

            {token && normalizedMeRole === 'admin' ? (
              <div className="dashGrid2">
                <div className="dashCard">
                  <div className="dashHeadRow">
                    <div>
                      <div className="dashTitle">Job Applications</div>
                      <div className="dashSubtle">Update `jobseeker_status` after employer approval.</div>
                    </div>
                    <div className="dashSubtle">{dashBusy ? 'Loading...' : `${adminJobApplications.length} items`}</div>
                  </div>

                  <div className="dashList">
                    {adminJobApplications.map((a) => {
                      const employerApproved = isApprovedStatus(a.employer_status)
                      const jobSeekerApproved = isApprovedStatus(a.jobseeker_status)

                      return (
                        <div key={a.application_id} className="dashItem">
                          <div className="dashItemTitle">
                            {a.job_title} - {a.job_location}
                          </div>

                          <div className="dashItemMeta">
                            <span className={`statusPill ${statusTone(a.jobseeker_status)}`}>
                              <span className="statusDot" aria-hidden="true" />
                              JobSeeker: {a.jobseeker_status || 'pending'}
                            </span>
                            <span className={`statusPill ${statusTone(a.employer_status)}`}>
                              <span className="statusDot" aria-hidden="true" />
                              Employer: {a.employer_status || 'pending'}
                            </span>
                          </div>

                          <div className="dashItemMeta" style={{ marginTop: 10 }}>
                            <span>Applicant: <b>{a.jobseeker_name || '-'}</b></span>
                            <span>Contact: <b>{a.jobseeker_phone || 'hidden'}</b></span>
                            <span>Email: <b>{a.jobseeker_email || 'hidden'}</b></span>
                            <span>Skills: <b>{a.skills || '-'}</b></span>
                          </div>

                          <div className="dashActions">
                            <button
                              type="button"
                              className="btn btnGreen btnSm"
                              disabled={!employerApproved || jobSeekerApproved}
                              onClick={async () => {
                                try {
                                  await adminSetJobSeekerStatus(a.application_id, 'approved')
                                  showToast('success', 'Job seeker approved.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to approve.')
                                }
                              }}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="btn btnOutline btnSm"
                              disabled={!employerApproved || jobSeekerApproved}
                              onClick={async () => {
                                try {
                                  await adminSetJobSeekerStatus(a.application_id, 'rejected')
                                  showToast('success', 'Job seeker rejected.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to reject.')
                                }
                              }}
                            >
                              Reject
                            </button>

                            {!employerApproved ? (
                              <span className="dashSubtle">Waiting for employer approval</span>
                            ) : jobSeekerApproved ? (
                              <span className="dashSubtle">Already decided</span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                    {!dashBusy && adminJobApplications.length === 0 ? <div className="dashSubtle">No job applications found.</div> : null}
                  </div>
                </div>

                <div className="dashCard">
                  <div className="dashHeadRow">
                    <div>
                      <div className="dashTitle">Equipment / Materials / Services</div>
                      <div className="dashSubtle">Approve/Reject `status` (Admin only).</div>
                    </div>
                  </div>

                  <div className="dashList">
                    <div className="dashItem">
                      <div className="dashItemTitle">Equipment Bookings</div>
                      {adminEquipmentBookings.map((b) => (
                        <div key={b.booking_id} className="dashItemMeta" style={{ marginTop: 10 }}>
                          <span className={`statusPill ${statusTone(b.status)}`}>
                            <span className="statusDot" aria-hidden="true" />
                            {b.status || 'pending'}
                          </span>
                          <div className="dashActions" style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="btn btnGreen btnSm"
                              disabled={b.status && isApprovedStatus(b.status)}
                              onClick={async () => {
                                try {
                                  await adminSetBookingStatus(b.booking_id, 'approved')
                                  showToast('success', 'Booking approved.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to approve.')
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btnOutline btnSm"
                              disabled={b.status && normalizeAnyStatus(b.status) === 'rejected'}
                              onClick={async () => {
                                try {
                                  await adminSetBookingStatus(b.booking_id, 'rejected')
                                  showToast('success', 'Booking rejected.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to reject.')
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                          <div className="dashSubtle" style={{ marginTop: 8 }}>
                            Customer: <b>{b.customer_name || '-'}</b> | Phone: <b>{b.phone || '-'}</b> | Range: {b.start_date} - {b.end_date} | Equipment ID: {b.equipment_id}
                          </div>
                        </div>
                      ))}
                      {!dashBusy && adminEquipmentBookings.length === 0 ? <div className="dashSubtle">No bookings found.</div> : null}
                    </div>

                    <div className="dashItem">
                      <div className="dashItemTitle">Material Orders</div>
                      {adminMaterialOrders.map((o) => (
                        <div key={o.order_id} className="dashSubtle" style={{ marginTop: 10 }}>
                          <span className={`statusPill ${statusTone(o.status)}`}>
                            <span className="statusDot" aria-hidden="true" />
                            {o.status || 'pending'}
                          </span>
                          <div className="dashActions" style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="btn btnGreen btnSm"
                              disabled={o.status && isApprovedStatus(o.status)}
                              onClick={async () => {
                                try {
                                  await adminSetOrderStatus(o.order_id, 'approved')
                                  showToast('success', 'Order approved.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to approve.')
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btnOutline btnSm"
                              disabled={o.status && normalizeAnyStatus(o.status) === 'rejected'}
                              onClick={async () => {
                                try {
                                  await adminSetOrderStatus(o.order_id, 'rejected')
                                  showToast('success', 'Order rejected.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to reject.')
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            Customer: <b>{o.customer_name || '-'}</b> | Phone: <b>{o.phone || '-'}</b> | Qty: <b>{o.quantity}</b> | Material ID: {o.material_id}
                          </div>
                        </div>
                      ))}
                      {!dashBusy && adminMaterialOrders.length === 0 ? <div className="dashSubtle">No material orders found.</div> : null}
                    </div>

                    <div className="dashItem">
                      <div className="dashItemTitle">Service Requests</div>
                      {adminServiceRequests.map((r) => (
                        <div key={r.request_id} className="dashSubtle" style={{ marginTop: 10 }}>
                          <span className={`statusPill ${statusTone(r.status)}`}>
                            <span className="statusDot" aria-hidden="true" />
                            {r.status || 'pending'}
                          </span>
                          <div className="dashActions" style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="btn btnGreen btnSm"
                              disabled={r.status && isApprovedStatus(r.status)}
                              onClick={async () => {
                                try {
                                  await adminSetRequestStatus(r.request_id, 'approved')
                                  showToast('success', 'Request approved.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to approve.')
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btnOutline btnSm"
                              disabled={r.status && normalizeAnyStatus(r.status) === 'rejected'}
                              onClick={async () => {
                                try {
                                  await adminSetRequestStatus(r.request_id, 'rejected')
                                  showToast('success', 'Request rejected.')
                                } catch (e) {
                                  showToast('error', e.message || 'Failed to reject.')
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            Customer: <b>{r.customer_name || '-'}</b> | Phone: <b>{r.phone || '-'}</b> | Service: <b>{r.service_type || '-'}</b> | Location: <b>{r.location || '-'}</b>
                          </div>
                        </div>
                      ))}
                      {!dashBusy && adminServiceRequests.length === 0 ? <div className="dashSubtle">No service requests found.</div> : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="formCard">
                <div className="emptyStateTitle">{token ? 'Admin only' : 'Login required'}</div>
                <div className="emptyStateText">
                  {token ? 'Your role is not Admin, so you cannot access approvals.' : 'Please login as Admin to manage approvals.'}
                </div>
                <div className="spacer10" />
                <AuthCard initialMode="login" />
              </div>
            )}
          </div>
        </section>

        <section id="employer-dashboard" className="section dashSection">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Employer Dashboard</h2>
              <p className="sectionSubtitle">Review applicants for your jobs and set `employer_status`.</p>
            </div>

            {token && normalizedMeRole === 'employer' ? (
              <div className="dashCard">
                <div className="dashHeadRow">
                  <div>
                    <div className="dashTitle">My Applicants</div>
                    <div className="dashSubtle">Contact info is visible only after admin approval.</div>
                  </div>
                  <div className="dashSubtle">{dashBusy ? 'Loading...' : `${employerJobApplications.length} items`}</div>
                </div>

                <div className="dashList">
                  {employerJobApplications.map((a) => {
                    const already = normalizeAnyStatus(a.employer_status) === 'approved' || normalizeAnyStatus(a.employer_status) === 'accepted'
                    return (
                      <div key={a.application_id} className="dashItem">
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

                        <div className="dashItemMeta" style={{ marginTop: 10 }}>
                          <span>Applicant: <b>{a.jobseeker_name || '-'}</b></span>
                          <span>Skills: <b>{a.skills || '-'}</b></span>
                          <span>Phone: <b>{a.jobseeker_phone || 'hidden'}</b></span>
                        </div>

                        <div className="dashActions">
                          <button
                            type="button"
                            className="btn btnGreen btnSm"
                            disabled={already}
                            onClick={async () => {
                              try {
                                await employerSetEmployerStatus(a.application_id, 'approved')
                                showToast('success', 'Applicant approved for admin review.')
                              } catch (e) {
                                showToast('error', e.message || 'Failed to approve.')
                              }
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btnOutline btnSm"
                            disabled={already}
                            onClick={async () => {
                              try {
                                await employerSetEmployerStatus(a.application_id, 'rejected')
                                showToast('success', 'Applicant rejected.')
                              } catch (e) {
                                showToast('error', e.message || 'Failed to reject.')
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {!dashBusy && employerJobApplications.length === 0 ? (
                    <div className="dashSubtle">No applications found for your jobs.</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="formCard">
                <div className="emptyStateTitle">{token ? 'Employer only' : 'Login required'}</div>
                <div className="emptyStateText">
                  {token ? 'Your role is not Employer, so you cannot access applicant reviews.' : 'Please login as Employer.'}
                </div>
                <div className="spacer10" />
                <AuthCard initialMode="login" />
              </div>
            )}
          </div>
        </section>

        <section id="jobseeker-dashboard" className="section dashSection">
          <div className="container">
            <div className="sectionHead">
              <h2 className="sectionTitle">Job Seeker Dashboard</h2>
              <p className="sectionSubtitle">Track your job applications and decisions.</p>
            </div>

            {token && normalizedMeRole === 'job_seeker' ? (
              <div className="dashCard">
                <div className="dashHeadRow">
                  <div>
                    <div className="dashTitle">My Applications</div>
                    <div className="dashSubtle">Employer and Admin decisions show your final progress.</div>
                  </div>
                  <div className="dashSubtle">{dashBusy ? 'Loading...' : `${jobSeekerJobApplications.length} items`}</div>
                </div>

                <div className="dashList">
                  {jobSeekerJobApplications.map((a) => (
                    <div key={a.application_id} className="dashItem">
                      <div className="dashItemTitle">{a.job_title} - {a.job_location}</div>
                      <div className="dashItemMeta">
                        <span className={`statusPill ${statusTone(a.jobseeker_status)}`}>
                          <span className="statusDot" aria-hidden="true" />
                          Admin: {a.jobseeker_status || 'pending'}
                        </span>
                        <span className={`statusPill ${statusTone(a.employer_status)}`}>
                          <span className="statusDot" aria-hidden="true" />
                          Employer: {a.employer_status || 'pending'}
                        </span>
                      </div>

                      <div className="dashItemMeta" style={{ marginTop: 10 }}>
                        <span>Job status: <b>{a.job_status || '-'}</b></span>
                        <span>Salary: <b>{a.job_salary || '-'}</b></span>
                        <span>Applied for: <b>{a.cover_message ? 'Yes' : 'Saved'}</b></span>
                      </div>
                    </div>
                  ))}

                  {!dashBusy && jobSeekerJobApplications.length === 0 ? (
                    <div className="dashSubtle">You have no job applications yet.</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="formCard">
                <div className="emptyStateTitle">{token ? 'Job Seeker only' : 'Login required'}</div>
                <div className="emptyStateText">
                  {token ? 'Your role is not Job Seeker, so you cannot access your applications.' : 'Please login as Job Seeker.'}
                </div>
                <div className="spacer10" />
                <AuthCard initialMode="login" />
              </div>
            )}
          </div>
        </section>

        <section id="contact" className="section sectionContact">
          <div className="container contactGrid">
            <div>
              <h2 className="sectionTitle">Contact</h2>
              <p className="sectionSubtitle">Call us, email us, or start a WhatsApp chat.</p>

              <div className="contactBox">
                <div className="contactRow">
                  <div className="contactLabel">Phone</div>
                  <a className="contactValue" href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                </div>
                <div className="contactRow">
                  <div className="contactLabel">Email</div>
                  <a className="contactValue" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </div>
                <div className="contactRow">
                  <div className="contactLabel">WhatsApp</div>
                  <a className="contactValue" href="https://wa.me/250788599614" target="_blank" rel="noreferrer">
                    Chat now
                  </a>
                </div>
                <div className="contactRow">
                  <div className="contactLabel">Office location</div>
                  <div className="contactValue">{contact.address}</div>
                </div>
              </div>

              <div className="contactPrimaryCtas">
                <a className="btn btnGreen" href="https://wa.me/250788599614" target="_blank" rel="noreferrer">
                  WhatsApp Us
                </a>
                <a className="btn btnBlue" href="mailto:verderwanda@gmail.com">
                  Email Us
                </a>
              </div>

              <div className="contactFormWrap">
                <div className="formTitle">Send us a message</div>
                <form onSubmit={submitContactMsg} className="contactForm">
                  <div className="formRow2">
                    <label className="field">
                      <span className="fieldLabel">Name</span>
                      <input
                        className="fieldInput"
                        value={contactMsg.name}
                        onChange={(e) => setContactMsg((m) => ({ ...m, name: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Phone</span>
                      <input
                        className="fieldInput"
                        value={contactMsg.phone}
                        onChange={(e) => setContactMsg((m) => ({ ...m, phone: e.target.value }))}
                        placeholder="e.g. +250 788 599 614"
                        required
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span className="fieldLabel">Email</span>
                    <input
                      className="fieldInput"
                      type="email"
                      value={contactMsg.email}
                      onChange={(e) => setContactMsg((m) => ({ ...m, email: e.target.value }))}
                      placeholder="Enter your email address"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Subject</span>
                    <input
                      className="fieldInput"
                      value={contactMsg.subject}
                      onChange={(e) => setContactMsg((m) => ({ ...m, subject: e.target.value }))}
                      placeholder="What is your message about?"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Message</span>
                    <textarea
                      className="fieldInput textarea"
                      value={contactMsg.message}
                      onChange={(e) => setContactMsg((m) => ({ ...m, message: e.target.value }))}
                      placeholder="Tell us how we can help — project details, timeline, or questions."
                      required
                    />
                  </label>
                  <button className="btn btnBlue formSubmit" type="submit" disabled={contactBusy}>
                    {contactBusy ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              </div>
            </div>

            <div className="mapCard">
              <div className="mapTitle">Our Location</div>
              <div className="mapFrameWrap">
                <iframe
                  title="Verde Rwanda location map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.366554272768!2d30.096379874487624!3d-2.0087358368414603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca6262f5e285b%3A0x29563196d611ebf4!2sKK%2015%20Rd%2C%20Kigali!5e0!3m2!1sen!2srw!4v1773989385653!5m2!1sen!2srw"
                  width="600"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container footerInner">
            <div className="footerBrand">
              <span className="footerDot" aria-hidden="true" />
              Verde Rwanda Ltd
            </div>
            <div className="footerText">Professional plumbing and water systems solutions across Rwanda.</div>
          </div>
        </footer>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <div className="toastMsg">{toast.message}</div>
        </div>
      )}
    </div>
  )
}
