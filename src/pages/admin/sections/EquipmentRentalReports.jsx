import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/useAuth'
import { useToast } from '../../../context/ToastContext.jsx'

function isoToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseDateOnly(iso) {
  if (!iso) return null
  const s = String(iso).slice(0, 10)
  const t = Date.parse(`${s}T00:00:00`)
  return Number.isFinite(t) ? new Date(t) : null
}

function toMoney(n) {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x)) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(x)
}

function safeLower(s) {
  return String(s || '').trim().toLowerCase()
}

function isReturnedBooking(b) {
  return safeLower(b?.status) === 'returned' || b?.returned === true
}

function isRentedBooking(b) {
  const status = safeLower(b?.status)
  return (status === 'approved' || status === 'accepted' || status === 'accept') && !isReturnedBooking(b)
}

function overlapsRange(booking, startDate, endDate) {
  const s = parseDateOnly(booking?.start_date)
  const e = parseDateOnly(booking?.end_date)
  if (!s || !e) return false
  if (!startDate && !endDate) return true
  const a = startDate ? startDate.getTime() : -Infinity
  const b = endDate ? endDate.getTime() : Infinity
  return s.getTime() <= b && e.getTime() >= a
}

function pointInRange(dateIso, startDate, endDate) {
  const d = parseDateOnly(dateIso)
  if (!d) return false
  const a = startDate ? startDate.getTime() : -Infinity
  const b = endDate ? endDate.getTime() : Infinity
  const x = d.getTime()
  return x >= a && x <= b
}

function reportFilename(ext, { fromIso, toIso, equipmentName }) {
  const parts = ['rental-equipment-report']
  if (fromIso || toIso) parts.push(`${fromIso || 'start'}_to_${toIso || 'end'}`)
  if (equipmentName && equipmentName !== 'All equipment') parts.push(equipmentName.replace(/[^\w-]+/g, '_').slice(0, 40))
  return `${parts.join('-')}.${ext}`
}

export default function EquipmentRentalReports() {
  const { token } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const [busy, setBusy] = useState(false)
  const [equipment, setEquipment] = useState([])
  const [bookings, setBookings] = useState([])

  const [fromIso, setFromIso] = useState('')
  const [toIso, setToIso] = useState(() => isoToday())
  const [equipmentId, setEquipmentId] = useState('all')
  const [viewFilter, setViewFilter] = useState('all') // all | returned | rented | available
  const [q, setQ] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!token) return
      setBusy(true)
      try {
        const [eq, bk] = await Promise.all([
          apiFetch('/equipment', { token }).catch(() => []),
          apiFetch('/equipment-bookings', { token }).catch(() => []),
        ])
        if (cancelled) return
        setEquipment(Array.isArray(eq) ? eq : [])
        setBookings(Array.isArray(bk) ? bk : [])
      } catch (e) {
        if (!cancelled) toastError(e?.message || 'Failed to load report data.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, toastError])

  const equipmentOptions = useMemo(() => {
    const rows = equipment
      .map((e) => {
        const id = Number(e?.equipment_id)
        if (!Number.isFinite(id)) return null
        const name = String(e?.name || `Equipment #${id}`)
        return { id: String(id), name }
      })
      .filter(Boolean)
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows
  }, [equipment])

  const selectedEquipmentName = useMemo(() => {
    if (equipmentId === 'all') return 'All equipment'
    const hit = equipmentOptions.find((o) => o.id === equipmentId)
    return hit?.name || 'Selected equipment'
  }, [equipmentId, equipmentOptions])

  const range = useMemo(() => {
    const start = fromIso ? parseDateOnly(fromIso) : null
    const end = toIso ? parseDateOnly(toIso) : null
    if (start && end && start.getTime() > end.getTime()) {
      return { start: end, end: start, swapped: true }
    }
    return { start, end, swapped: false }
  }, [fromIso, toIso])

  const filteredBookings = useMemo(() => {
    const qq = safeLower(q)
    const eqIdNum = equipmentId === 'all' ? null : Number(equipmentId)
    const availableEquipmentIds = new Set(
      (Array.isArray(equipment) ? equipment : [])
        .filter((e) => (Number.parseInt(String(e?.current_stock ?? 0), 10) || 0) > 0)
        .map((e) => Number(e?.equipment_id))
        .filter((id) => Number.isFinite(id)),
    )

    return (Array.isArray(bookings) ? bookings : [])
      .filter((b) => {
        // Include bookings that overlap rental dates OR were returned in range.
        return overlapsRange(b, range.start, range.end) || pointInRange(b?.returned_at, range.start, range.end)
      })
      .filter((b) => {
        if (!eqIdNum) return true
        const id = Number(b?.equipment_id)
        return Number.isFinite(id) && id === eqIdNum
      })
      .filter((b) => {
        if (viewFilter === 'returned') return isReturnedBooking(b)
        if (viewFilter === 'rented') return isRentedBooking(b)
        if (viewFilter === 'available') {
          const id = Number(b?.equipment_id)
          return Number.isFinite(id) && availableEquipmentIds.has(id)
        }
        return true
      })
      .filter((b) => {
        if (!qq) return true
        const hay = [
          b?.equipment_name,
          b?.customer_name,
          b?.customer_email,
          b?.phone,
          b?.status,
          b?.booking_id,
        ]
          .map((x) => String(x || '').toLowerCase())
          .join(' · ')
        return hay.includes(qq)
      })
      .slice()
      .sort((a, b) => {
        const as = safeLower(a?.start_date)
        const bs = safeLower(b?.start_date)
        return as.localeCompare(bs) || Number(a?.booking_id) - Number(b?.booking_id)
      })
  }, [bookings, equipment, equipmentId, q, range.end, range.start, viewFilter])

  const totals = useMemo(() => {
    let bookingsCount = 0
    let units = 0
    let revenue = 0
    let returnedBookings = 0
    let returnedUnits = 0
    const byEquipment = new Map()

    for (const b of filteredBookings) {
      bookingsCount += 1
      const qty = Math.max(0, Number.parseInt(String(b?.quantity ?? 0), 10) || 0)
      const price = Number(b?.total_price)
      const status = safeLower(b?.status)
      const isReturned = status === 'returned' || b?.returned === true
      units += qty
      revenue += Number.isFinite(price) ? price : 0
      if (isReturned) {
        returnedBookings += 1
        returnedUnits += qty
      }

      const key = String(b?.equipment_name || b?.equipment_id || 'Unknown')
      const agg = byEquipment.get(key) || {
        equipment: key,
        bookings: 0,
        units: 0,
        returnedBookings: 0,
        returnedUnits: 0,
        revenue: 0,
      }
      agg.bookings += 1
      agg.units += qty
      if (isReturned) {
        agg.returnedBookings += 1
        agg.returnedUnits += qty
      }
      agg.revenue += Number.isFinite(price) ? price : 0
      byEquipment.set(key, agg)
    }

    const equipmentRows = Array.from(byEquipment.values()).sort((a, b) => b.revenue - a.revenue || b.units - a.units || a.equipment.localeCompare(b.equipment))

    return { bookingsCount, units, revenue, returnedBookings, returnedUnits, equipmentRows }
  }, [filteredBookings])

  async function exportPdf() {
    setExportBusy(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Rental Equipment Report', 40, 48)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const metaLines = [
        `Equipment: ${selectedEquipmentName}`,
        `View filter: ${viewFilter}`,
        `Date range: ${fromIso || '—'} to ${toIso || '—'}${range.swapped ? ' (swapped)' : ''}`,
        `Generated: ${new Date().toLocaleString()}`,
      ]
      let y = 68
      for (const line of metaLines) {
        doc.text(line, 40, y)
        y += 14
      }

      autoTable(doc, {
        startY: y + 8,
        head: [['Bookings', 'Units', 'Returned bookings', 'Returned units', 'Revenue']],
        body: [[
          String(totals.bookingsCount),
          String(totals.units),
          String(totals.returnedBookings),
          String(totals.returnedUnits),
          toMoney(totals.revenue),
        ]],
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      const afterSummaryY = doc.lastAutoTable?.finalY ?? y + 60

      autoTable(doc, {
        startY: afterSummaryY + 14,
        head: [['Equipment', 'Bookings', 'Units', 'Returned', 'Returned units', 'Revenue']],
        body: totals.equipmentRows.map((r) => [
          r.equipment,
          String(r.bookings),
          String(r.units),
          String(r.returnedBookings),
          String(r.returnedUnits),
          toMoney(r.revenue),
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 64, 175] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      const afterBreakdownY = doc.lastAutoTable?.finalY ?? afterSummaryY + 40

      autoTable(doc, {
        startY: afterBreakdownY + 18,
        head: [['ID', 'Equipment', 'Customer', 'Start', 'End', 'Returned', 'Qty', 'Total', 'Status']],
        body: filteredBookings.map((b) => [
          String(b?.booking_id ?? ''),
          String(b?.equipment_name ?? ''),
          String(b?.customer_name ?? ''),
          String(b?.start_date ?? '').slice(0, 10),
          String(b?.end_date ?? '').slice(0, 10),
          String(b?.returned_at ?? '').slice(0, 10) || '—',
          String(b?.quantity ?? ''),
          toMoney(b?.total_price),
          String(b?.status ?? ''),
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 23, 42] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      doc.save(reportFilename('pdf', { fromIso, toIso, equipmentName: selectedEquipmentName }))
      toastSuccess('PDF report downloaded.')
    } catch (e) {
      toastError(e?.message || 'Failed to generate PDF report.')
    } finally {
      setExportBusy(false)
    }
  }

  async function exportWord() {
    setExportBusy(true)
    try {
      const title = new Paragraph({
        children: [new TextRun({ text: 'Rental Equipment Report', bold: true, size: 32 })],
        spacing: { after: 240 },
      })

      const meta = new Paragraph({
        children: [
          new TextRun({ text: `Equipment: ${selectedEquipmentName}\n`, size: 22 }),
          new TextRun({ text: `View filter: ${viewFilter}\n`, size: 22 }),
          new TextRun({ text: `Date range: ${fromIso || '—'} to ${toIso || '—'}${range.swapped ? ' (swapped)' : ''}\n`, size: 22 }),
          new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 22 }),
        ],
        spacing: { after: 240 },
      })

      const summaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Bookings', 'Units', 'Returned bookings', 'Returned units', 'Revenue'].map(
              (t) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
                }),
            ),
          }),
          new TableRow({
            children: [
              String(totals.bookingsCount),
              String(totals.units),
              String(totals.returnedBookings),
              String(totals.returnedUnits),
              toMoney(totals.revenue),
            ].map(
              (t) => new TableCell({ children: [new Paragraph(String(t))] }),
            ),
          }),
        ],
      })

      const breakdownTitle = new Paragraph({
        children: [new TextRun({ text: 'Breakdown by equipment', bold: true, size: 26 })],
        spacing: { before: 240, after: 120 },
      })

      const breakdownTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Equipment', 'Bookings', 'Units', 'Returned', 'Returned units', 'Revenue'].map(
              (t) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
                }),
            ),
          }),
          ...totals.equipmentRows.map(
            (r) =>
              new TableRow({
                children: [
                  r.equipment,
                  String(r.bookings),
                  String(r.units),
                  String(r.returnedBookings),
                  String(r.returnedUnits),
                  toMoney(r.revenue),
                ].map(
                  (t) => new TableCell({ children: [new Paragraph(String(t))] }),
                ),
              }),
          ),
        ],
      })

      const bookingsTitle = new Paragraph({
        children: [new TextRun({ text: 'Bookings', bold: true, size: 26 })],
        spacing: { before: 240, after: 120 },
      })

      const bookingsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['ID', 'Equipment', 'Customer', 'Start', 'End', 'Returned', 'Qty', 'Total', 'Status'].map(
              (t) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
                }),
            ),
          }),
          ...filteredBookings.map(
            (b) =>
              new TableRow({
                children: [
                  String(b?.booking_id ?? ''),
                  String(b?.equipment_name ?? ''),
                  String(b?.customer_name ?? ''),
                  String(b?.start_date ?? '').slice(0, 10),
                  String(b?.end_date ?? '').slice(0, 10),
                  String(b?.returned_at ?? '').slice(0, 10) || '—',
                  String(b?.quantity ?? ''),
                  toMoney(b?.total_price),
                  String(b?.status ?? ''),
                ].map((t) => new TableCell({ children: [new Paragraph(String(t))] })),
              }),
          ),
        ],
      })

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [title, meta, summaryTable, breakdownTitle, breakdownTable, bookingsTitle, bookingsTable],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = reportFilename('docx', { fromIso, toIso, equipmentName: selectedEquipmentName })
        document.body.appendChild(a)
        a.click()
        a.remove()
      } finally {
        URL.revokeObjectURL(url)
      }

      toastSuccess('Word report downloaded.')
    } catch (e) {
      toastError(e?.message || 'Failed to generate Word report.')
    } finally {
      setExportBusy(false)
    }
  }

  return (
    <section className="adminPanel adminPanel--muted">
      <div className="adminPanelHead" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <h2 className="adminPanelTitle">Rental equipment reports</h2>
          <p className="dashSubtle" style={{ margin: 0 }}>
            Filter by date range and equipment, then export as PDF or Word.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btnOutline btnSm" onClick={() => void exportPdf()} disabled={busy || exportBusy}>
            {exportBusy ? 'Generating…' : 'Export PDF'}
          </button>
          <button type="button" className="btn btnGreen btnSm" onClick={() => void exportWord()} disabled={busy || exportBusy}>
            {exportBusy ? 'Generating…' : 'Export Word'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="dashSubtle" style={{ fontSize: 12 }}>
              From
            </span>
            <input
              type="date"
              className="adminMgmtSearchInput"
              value={fromIso}
              onChange={(e) => setFromIso(e.target.value)}
              disabled={busy || exportBusy}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="dashSubtle" style={{ fontSize: 12 }}>
              To
            </span>
            <input
              type="date"
              className="adminMgmtSearchInput"
              value={toIso}
              onChange={(e) => setToIso(e.target.value)}
              disabled={busy || exportBusy}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="dashSubtle" style={{ fontSize: 12 }}>
              Equipment
            </span>
            <select
              className="adminMgmtSearchInput"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              disabled={busy || exportBusy}
            >
              <option value="all">All equipment</option>
              {equipmentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="dashSubtle" style={{ fontSize: 12 }}>
              Search
            </span>
            <input
              type="search"
              className="adminMgmtSearchInput"
              placeholder="Customer, email, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={busy || exportBusy}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="dashSubtle" style={{ fontSize: 12 }}>
              View
            </span>
            <select
              className="adminMgmtSearchInput"
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              disabled={busy || exportBusy}
            >
              <option value="all">All</option>
              <option value="returned">Returned</option>
              <option value="rented">Rented</option>
              <option value="available">Available</option>
            </select>
          </label>
        </div>

        {range.swapped ? (
          <div className="toast error" style={{ position: 'static', transform: 'none', left: 'auto', bottom: 'auto' }}>
            Date range was reversed. Showing results with swapped dates.
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="adminPanelBadge">Bookings: {busy ? '…' : totals.bookingsCount}</span>
          <span className="adminPanelBadge">Units: {busy ? '…' : totals.units}</span>
          <span className="adminPanelBadge">Returned: {busy ? '…' : totals.returnedBookings}</span>
          <span className="adminPanelBadge">Returned units: {busy ? '…' : totals.returnedUnits}</span>
          <span className="adminPanelBadge">Revenue: {busy ? '…' : toMoney(totals.revenue)}</span>
        </div>

        <div className="adminMgmtCardWrap" style={{ marginTop: 6 }}>
          {filteredBookings.length === 0 ? (
            <div className="adminMgmtEmpty adminMgmtEmpty--cards">{busy ? 'Loading…' : 'No bookings match your filters.'}</div>
          ) : (
            <div className="adminMgmtCardGrid">
              {filteredBookings.slice(0, 6).map((b) => (
                <article key={String(b?.booking_id)} className="adminMgmtCard">
                  <div className="adminMgmtCardTop">
                    <h2 className="adminMgmtCardTitle">{String(b?.equipment_name || 'Equipment')}</h2>
                    <span className="adminMgmtStatusPill adminMgmtStatusPill--neutral" title="Status">
                      {String(b?.status || '—')}
                    </span>
                  </div>
                  <ul className="adminMgmtCardMeta">
                    <li>
                      <span className="adminMgmtCardMetaLab">Customer</span>
                      <span className="adminMgmtCardMetaVal">{String(b?.customer_name || '—')}</span>
                    </li>
                    <li>
                      <span className="adminMgmtCardMetaLab">Dates</span>
                      <span className="adminMgmtCardMetaVal">
                        {String(b?.start_date || '').slice(0, 10)} → {String(b?.end_date || '').slice(0, 10)}
                      </span>
                    </li>
                    <li>
                      <span className="adminMgmtCardMetaLab">Returned</span>
                      <span className="adminMgmtCardMetaVal">{String(b?.returned_at || '').slice(0, 10) || '—'}</span>
                    </li>
                    <li>
                      <span className="adminMgmtCardMetaLab">Units</span>
                      <span className="adminMgmtCardMetaVal">{String(b?.quantity ?? '—')}</span>
                    </li>
                    <li>
                      <span className="adminMgmtCardMetaLab">Returned</span>
                      <span className="adminMgmtCardMetaVal">
                        {isReturnedBooking(b) ? 'Yes' : 'No'}
                      </span>
                    </li>
                    <li>
                      <span className="adminMgmtCardMetaLab">Total</span>
                      <span className="adminMgmtCardMetaVal">{toMoney(b?.total_price)}</span>
                    </li>
                  </ul>
                </article>
              ))}
            </div>
          )}
          {filteredBookings.length > 6 ? (
            <p className="dashSubtle" style={{ margin: '10px 0 0', fontSize: 12 }}>
              Showing 6 of {filteredBookings.length} bookings. Export to see the full list in PDF/Word.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

