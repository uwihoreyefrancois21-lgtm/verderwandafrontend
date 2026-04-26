import { Bell } from 'lucide-react'

/**
 * Three notification bell buttons (request quotes, service requests, contact messages).
 * @param {{ quotes: number, service: number, contact: number, onOpenSection: (sectionId: string) => void }} props
 */
export default function AdminShellInboxTray({ quotes, service, contact, onOpenSection }) {
  const items = [
    {
      sectionId: 'Request Quotes',
      count: quotes,
      title: 'Open request quotes — unread items',
    },
    {
      sectionId: 'Service Requests',
      count: service,
      title: 'Open service requests — unread items',
    },
    {
      sectionId: 'Contact Messages',
      count: contact,
      title: 'Open contact messages — unread items',
    },
  ]

  return (
    <nav className="adminShellInboxTray" aria-label="Unread queues">
      {items.map(({ sectionId, count, title }) => (
        <button
          key={sectionId}
          type="button"
          className="adminShellInboxBtn"
          onClick={() => onOpenSection(sectionId)}
          title={title}
          aria-label={`${sectionId}: ${count} unread`}
        >
          <Bell className="adminShellInboxBellIcon" size={18} strokeWidth={2.25} aria-hidden />
          {count > 0 ? (
            <span className="adminShellInboxBadge">{count > 99 ? '99+' : count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}
