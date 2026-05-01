import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext.jsx'

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.366554272768!2d30.096379874487624!3d-2.0087358368414603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca6262f5e285b%3A0x29563196d611ebf4!2sKK%2015%20Rd%2C%20Kigali!5e0!3m2!1sen!2srw!4v1773989385653!5m2!1sen!2srw'

const PHONE = '+250788599614/0799512923'
const EMAIL = 'verderwanda@gmail.com'
const ADDRESS = 'Kicukiro, Kicukiro, Kigali City, RWANDA'
const WA_URL = 'https://wa.me/250788599614'

/** Optional in `.env`: `VITE_SOCIAL_FACEBOOK_URL`, `VITE_SOCIAL_INSTAGRAM_URL`, … */
function socialUrl(key, fallback) {
  const envKey = `VITE_SOCIAL_${key}_URL`
  const v = import.meta.env[envKey]
  return (typeof v === 'string' && v.trim()) || fallback
}

/** Inline SVGs (24×24, currentColor) for footer social buttons */
function SocialIcon({ name }) {
  const common = { className: 'footerSocialSvg', viewBox: '0 0 24 24', 'aria-hidden': true }
  switch (name) {
    case 'facebook':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.881 0 1.44 1.44 0 012.881 0z"
          />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      )
    case 'twitter':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg className="footerSocialSvg" viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.07 18.03c-.12-.06-.71-.35-1.64-.8c-.2-.1-.36-.15-.52.1c-.16.2-.6.8-.74.96c-.14.16-.27.18-.49.08c-.22-.1-.92-.34-1.75-1.08c-.65-.58-1.09-1.31-1.22-1.53c-.13-.22-.01-.34.09-.44c.1-.1.22-.27.33-.4c.11-.14.14-.22.21-.37c.07-.15.03-.28-.02-.4c-.05-.12-.52-1.28-.7-1.74c-.18-.44-.37-.38-.52-.39h-.45c-.15 0-.39.06-.59.28c-.2.22-.77.75-.77 1.82c0 1.07.79 2.1.9 2.24c.11.14 1.55 2.37 3.76 3.32c.53.23.95.36 1.27.46c.53.17 1.01.15 1.39.1c.43-.06 1.32-.54 1.5-1.06c.19-.53.19-.99.13-1.06c-.06-.08-.22-.13-.34-.2Z"
          />
          <path
            fill="currentColor"
            d="M16 3.5C9.9 3.5 5 8.38 5 14.5c0 2.04.55 3.95 1.56 5.6L5.1 28.5l8.66-1.46c1.55.84 3.31 1.46 5.32 1.46c6.1 0 11-4.88 11-11c0-6.12-4.9-11-11-11Zm0 19.5c-1.67 0-3.19-.47-4.53-1.28l-.31-.19l-5.36.9l.88-5.3l-.2-.31C6.99 15.46 6.5 14.02 6.5 13c0-5.1 4.1-9 9.5-9s9.5 3.9 9.5 9s-4.1 10-9.5 10Z"
          />
        </svg>
      )
    default:
      return null
  }
}

const SOCIAL_ITEMS = [
  { id: 'facebook', label: 'Facebook', icon: 'facebook', href: () => socialUrl('FACEBOOK', 'https://www.facebook.com/share/1AdU4kGX4Y/') },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', href: () => socialUrl('INSTAGRAM', 'https://www.instagram.com/verderwanda/') },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: () => socialUrl('LINKEDIN', 'https://www.linkedin.com/company/verde-rwanda-ltd/?viewAsMember=true') },
  { id: 'twitter', label: 'X (Twitter)', icon: 'twitter', href: () => socialUrl('TWITTER', 'https://x.com/Verderwanda') },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', href: () => socialUrl('YOUTUBE', 'https://www.youtube.com/') },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', href: () => socialUrl('WHATSAPP', WA_URL) },
]

export default function Footer() {
  const { token } = useAuth()
  const { success, error } = useToast()
  const year = new Date().getFullYear()

  const [msg, setMsg] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await apiFetch('/contact-messages', { method: 'POST', jsonBody: { ...msg, status: 'new' } })
      success('Message sent successfully.')
      setMsg({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      error(err.message || 'Failed to send message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <footer className="footer">
      <div className="container footerOuter">
        <div className="footerGrid">
          <div className="footerCol footerCol--left">
            <div className="footerBrandText">
              <div className="footerBrandName">Verde Rwanda Ltd</div>
              <div className="footerBrandSub">Plumbing &amp; water systems</div>
            </div>
            <p className="footerDesc">
              Professional plumbing and water infrastructure solutions across Rwanda — design, installation, maintenance, equipment rentals,
              and job opportunities.
            </p>
            <div className="footerContact">
              <div className="footerContactRow">
                <span className="footerContactLabel">Phone</span>
                <a className="footerContactValue" href={`tel:${PHONE.replace(/\s/g, '')}`}>
                  {PHONE}
                </a>
              </div>
              <div className="footerContactRow">
                <span className="footerContactLabel">Email</span>
                <a className="footerContactValue" href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </div>
              <div className="footerContactRow">
                <span className="footerContactLabel">Address</span>
                <span className="footerContactValue" style={{ textAlign: 'right' }}>
                  {ADDRESS}
                </span>
              </div>
            </div>
            <div className="footerSocial">
              <div className="footerSocialLabel">Follow us</div>
              <div className="footerSocialIcons">
                {SOCIAL_ITEMS.map(({ id, label, icon, href }) => (
                  <a
                    key={id}
                    className="footerSocialLink"
                    href={href()}
                    target="_blank"
                    rel="noreferrer"
                    title={label}
                    aria-label={label}
                  >
                    <span className="footerSocialIcon">
                      <SocialIcon name={icon} />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="footerQuickLinks">
              <div className="footerQuickLinksTitle">Quick links</div>
              <p className="footerQuickLinksSub">Navigate the site</p>
              <nav className="footerNav footerNav--stack" aria-label="Footer quick links">
                <Link className="footerLink" to="/">
                  Home
                </Link>
                <Link className="footerLink" to="/services">
                  Services
                </Link>
                <Link className="footerLink" to="/projects">
                  Projects
                </Link>
                <Link className="footerLink" to="/jobs">
                  Jobs
                </Link>
                <Link className="footerLink" to="/rent-equipment">
                  Rent equipment
                </Link>
                <Link className="footerLink" to="/service-requests">
                  Request service
                </Link>
                <Link className="footerLink" to="/material-supply">
                  Material supply
                </Link>
                <Link className="footerLink" to="/contact">
                  Contact
                </Link>
                <Link className="footerLink" to="/about-us">
                  About
                </Link>
                <Link className="footerLink" to="/request-quotes">
                  Request quote
                </Link>
                {token ? (
                  <Link className="footerLink" to="/dashboard">
                    Dashboard
                  </Link>
                ) : (
                  <Link className="footerLink" to="/auth">
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          </div>

          <div className="footerCol footerCol--map">
            <div className="footerSectionTitle footerSectionTitle--map">Our location</div>
            <p className="footerSectionSub footerSectionSub--map">Kigali, Rwanda · KK 15 Rd area</p>
            <div className="footerMapFrame footerMapFrame--center">
              <iframe
                title="Verde Rwanda location map"
                src={MAP_EMBED_SRC}
                width="600"
                height="320"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="footerCol footerCol--form" id="footer-contact-form">
            <div className="footerSectionTitle">Send a message</div>
            <p className="footerSectionSub">We’ll get back to you shortly.</p>
            <form className="footerForm contactForm" onSubmit={onSubmit}>
              <div className="formRow2">
                <label className="field">
                  <span className="fieldLabel">Name</span>
                  <input
                    className="fieldInput"
                    value={msg.name}
                    onChange={(e) => setMsg((m) => ({ ...m, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span className="fieldLabel">Phone</span>
                  <input
                    className="fieldInput"
                    value={msg.phone}
                    onChange={(e) => setMsg((m) => ({ ...m, phone: e.target.value }))}
                    placeholder="  +250 788 599 614"
                    required
                    autoComplete="tel"
                  />
                </label>
              </div>
              <label className="field">
                <span className="fieldLabel">Email</span>
                <input
                  className="fieldInput"
                  type="email"
                  value={msg.email}
                  onChange={(e) => setMsg((m) => ({ ...m, email: e.target.value }))}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span className="fieldLabel">Subject</span>
                <input
                  className="fieldInput"
                  value={msg.subject}
                  onChange={(e) => setMsg((m) => ({ ...m, subject: e.target.value }))}
                  placeholder="What is your message about?"
                  required
                />
              </label>
              <label className="field">
                <span className="fieldLabel">Message</span>
                <textarea
                  className="fieldInput textarea footerTextarea"
                  value={msg.message}
                  onChange={(e) => setMsg((m) => ({ ...m, message: e.target.value }))}
                  placeholder="Tell us how we can help — project details, timeline, or questions."
                  required
                  rows={4}
                />
              </label>
              <button className="btn btnBlue footerFormSubmit" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </div>
        </div>

        <div className="footerBottomRow">
          © {year} Verde Rwanda Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
