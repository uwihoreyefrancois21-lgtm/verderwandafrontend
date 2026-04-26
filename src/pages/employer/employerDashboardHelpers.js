export function normalizeAnyStatus(s) {
  return String(s || '').trim().toLowerCase()
}

export function isApprovedStatus(s) {
  const v = normalizeAnyStatus(s)
  return v === 'approved' || v === 'accepted' || v === 'accept'
}

export function statusTone(status) {
  const v = normalizeAnyStatus(status)
  if (isApprovedStatus(v)) return 'green'
  if (v === 'rejected' || v === 'reject' || v === 'declined') return 'red'
  if (!v || v === 'pending' || v === 'new' || v === 'submitted') return 'blue'
  return 'blue'
}
