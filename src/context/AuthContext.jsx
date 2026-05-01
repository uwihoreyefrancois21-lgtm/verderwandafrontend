import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../services/api'
import { AuthContext } from './AuthContextCore'

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase()
  if (r === 'admin') return 'admin'
  if (r === 'employer') return 'employer'
  if (r === 'job seeker' || r === 'jobseeker' || r === 'job_seeker' || r === 'job-seeker') return 'job_seeker'
  return r
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('verde_token') || '')
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('verde_token')))

  const role = useMemo(() => normalizeRole(me?.role), [me])

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      if (!token) {
        setMe(null)
        return
      }
      setLoading(true)
      try {
        const data = await apiFetch('/auth/me', { token })
        if (!cancelled) setMe(data)
      } catch {
        if (!cancelled) {
          setToken('')
          localStorage.removeItem('verde_token')
          setMe(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadMe()
    return () => {
      cancelled = true
    }
  }, [token])

  async function hydrateUser(nextToken) {
    const data = await apiFetch('/auth/me', { token: nextToken })
    setMe(data)
    return data
  }

  async function login({ email, password }) {
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', jsonBody: { email, password } })
      const nextToken = data?.token
      if (!nextToken) throw new Error('Missing token in response')
      localStorage.setItem('verde_token', nextToken)
      setToken(nextToken)
      const meData = await hydrateUser(nextToken)
      return { ...data, user: data?.user || meData }
    } catch (error) {
      localStorage.removeItem('verde_token')
      setToken('')
      setMe(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function register({
    name,
    email,
    phone,
    role,
    password,
    paymentProofFile,
    userDetails,
    guarantor,
  }) {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('email', email)
    formData.append('phone', phone || '')
    formData.append('role', role)
    formData.append('password', password)
    if (paymentProofFile) formData.append('payment_proof', paymentProofFile)
    if (userDetails) {
      formData.append('user_details', JSON.stringify(userDetails))
      if (userDetails.passport_photo instanceof File) formData.append('passport_photo', userDetails.passport_photo)
      if (userDetails.full_photo instanceof File) formData.append('full_photo', userDetails.full_photo)
    }
    if (guarantor) {
      formData.append('guarantor', JSON.stringify(guarantor))
    }

    const data = await apiFetch('/auth/register', {
      method: 'POST',
      formData,
    })
    return data
  }

  function logout() {
    localStorage.removeItem('verde_token')
    setToken('')
    setMe(null)
  }

  const value = useMemo(
    () => ({
      token,
      me,
      role,
      loading,
      login,
      register,
      logout,
    }),
    [token, me, role, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// AuthContext is exported from AuthContextCore to keep Fast Refresh happy.

