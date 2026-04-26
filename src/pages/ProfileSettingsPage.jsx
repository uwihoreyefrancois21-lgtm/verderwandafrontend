import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../services/api'

export default function ProfileSettingsPage() {
  const { token, role, me } = useAuth()
  const [profileBusy, setProfileBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  useEffect(() => {
    setProfile({
      name: me?.name || '',
      phone: me?.phone || '',
    })
  }, [me?.name, me?.phone])

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Login required</div>
          <div className="emptyStateText">Please sign in to manage profile settings.</div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btnBlue btnSm" to="/auth?next=%2Fsettings%2Fprofile">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (role !== 'employer' && role !== 'job_seeker') {
    return (
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="formCard">
          <div className="emptyStateTitle">Not available</div>
          <div className="emptyStateText">Profile settings are available for Employer and Job Seeker accounts.</div>
        </div>
      </div>
    )
  }

  async function saveProfile(e) {
    e.preventDefault()
    setProfileMsg('')
    if (!me?.user_id) return setProfileMsg('User account not loaded.')
    if (!profile.name.trim()) return setProfileMsg('Name is required.')
    setProfileBusy(true)
    try {
      await apiFetch(`/users/${me.user_id}`, {
        method: 'PATCH',
        token,
        jsonBody: { name: profile.name.trim(), phone: profile.phone.trim() },
      })
      setProfileMsg('Profile updated successfully.')
    } catch (err) {
      setProfileMsg(err.message || 'Failed to update profile.')
    } finally {
      setProfileBusy(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPasswordMsg('')
    if (!pwd.currentPassword || !pwd.newPassword) return setPasswordMsg('All password fields are required.')
    if (pwd.newPassword.length < 6) return setPasswordMsg('New password must be at least 6 characters.')
    if (pwd.newPassword !== pwd.confirmPassword) return setPasswordMsg('Password confirmation does not match.')
    setPasswordBusy(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'PATCH',
        token,
        jsonBody: { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword },
      })
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMsg('Password updated successfully.')
    } catch (err) {
      setPasswordMsg(err.message || 'Failed to update password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Profile settings</h2>
        <p className="sectionSubtitle">Update your account details and change your password securely.</p>
      </div>

      <div className="dashGrid2" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <div className="dashTitle">Account profile</div>
          <form className="formBody profileAccountForm" style={{ marginTop: 10 }} onSubmit={saveProfile}>
            <label className="field">
              <span className="fieldLabel">Full name</span>
              <input
                className="fieldInput"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                required
                maxLength={120}
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Phone</span>
              <input
                className="fieldInput"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                maxLength={20}
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Email</span>
              <input className="fieldInput" value={me?.email || ''} disabled readOnly />
            </label>
            <button className="btn btnGreen formSubmit" type="submit" disabled={profileBusy}>
              {profileBusy ? 'Saving…' : 'Save profile'}
            </button>
            {profileMsg ? (
              <div className={`toast ${profileMsg.toLowerCase().includes('success') || profileMsg.toLowerCase().includes('updated') ? 'success' : 'error'}`} style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}>
                {profileMsg}
              </div>
            ) : null}
          </form>
        </div>

        <div className="dashCard">
          <div className="dashTitle">Change password</div>
          <form className="formBody profilePasswordForm" style={{ marginTop: 10 }} onSubmit={changePassword}>
            <label className="field">
              <span className="fieldLabel">Current password</span>
              <div className="passwordInputWrap">
                <input
                  className="fieldInput passwordFieldInput"
                  type={showPwd.currentPassword ? 'text' : 'password'}
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="passwordIconBtn"
                  aria-label={showPwd.currentPassword ? 'Hide current password' : 'Show current password'}
                  title={showPwd.currentPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPwd((s) => ({ ...s, currentPassword: !s.currentPassword }))}
                >
                  {showPwd.currentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="field">
              <span className="fieldLabel">New password</span>
              <div className="passwordInputWrap">
                <input
                  className="fieldInput passwordFieldInput"
                  type={showPwd.newPassword ? 'text' : 'password'}
                  value={pwd.newPassword}
                  onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="passwordIconBtn"
                  aria-label={showPwd.newPassword ? 'Hide new password' : 'Show new password'}
                  title={showPwd.newPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPwd((s) => ({ ...s, newPassword: !s.newPassword }))}
                >
                  {showPwd.newPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="field">
              <span className="fieldLabel">Confirm new password</span>
              <div className="passwordInputWrap">
                <input
                  className="fieldInput passwordFieldInput"
                  type={showPwd.confirmPassword ? 'text' : 'password'}
                  value={pwd.confirmPassword}
                  onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="passwordIconBtn"
                  aria-label={showPwd.confirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  title={showPwd.confirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPwd((s) => ({ ...s, confirmPassword: !s.confirmPassword }))}
                >
                  {showPwd.confirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button className="btn btnBlue formSubmit" type="submit" disabled={passwordBusy}>
              {passwordBusy ? 'Updating…' : 'Update password'}
            </button>
            {passwordMsg ? (
              <div className={`toast ${passwordMsg.toLowerCase().includes('success') || passwordMsg.toLowerCase().includes('updated') ? 'success' : 'error'}`} style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}>
                {passwordMsg}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  )
}
