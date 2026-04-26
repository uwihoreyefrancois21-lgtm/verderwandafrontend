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

function reportFilename(ext, { fromIso, toIso, jobName }) {
  const parts = ['job-payments-report']
  if (fromIso || toIso) parts.push(`${fromIso || 'start'}_to_${toIso || 'end'}`)
  if (jobName && jobName !== 'All jobs') parts.push(jobName.replace(/[^\w-]+/g, '_').slice(0, 40))
  return `${parts.join('-')}.${ext}`
}

export default function JobPaymentsReports() {
  const { token } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()
  const [busy, setBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [rows, setRows] = useState([])
  const [fromIso, setFromIso] = useState('')
  const [toIso, setToIso] = useState(() => isoToday())
  const [jobId, setJobId] = useState('all')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!token) return
      setBusy(true)
      try {
        const data = await apiFetch('/job-payments', { token }).catch(() => [])
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) toastError(e?.message || 'Failed to load job payments report data.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, toastError])

  const jobOptions = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const id = Number(r?.job_id)
      if (!Number.isFinite(id) || map.has(id)) continue
      const title = String(r?.job_title || `Job #${id}`)
      const employer = String(r?.employer_name || '').trim()
      map.set(id, {
        id: String(id),
        label: employer ? `${title} - ${employer}` : title,
      })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const selectedJobName = useMemo(() => {
    if (jobId === 'all') return 'All jobs'
    return jobOptions.find((x) => x.id === jobId)?.label || `Job #${jobId}`
  }, [jobId, jobOptions])

  const range = useMemo(() => {
    const start = fromIso ? parseDateOnly(fromIso) : null
    const end = toIso ? parseDateOnly(toIso) : null
    if (start && end && start.getTime() > end.getTime()) {
      return { start: end, end: start, swapped: true }
    }
    return { start, end, swapped: false }
  }, [fromIso, toIso])

  const filtered = useMemo(() => {
    const selectedJob = jobId === 'all' ? null : Number(jobId)
    return rows
      .filter((r) => {
        if (!selectedJob) return true
        return Number(r?.job_id) === selectedJob
      })
      .filter((r) => {
        const d = parseDateOnly(r?.created_at)
        if (!d) return false
        const t = d.getTime()
        const a = range.start ? range.start.getTime() : -Infinity
        const b = range.end ? range.end.getTime() : Infinity
        return t >= a && t <= b
      })
      .sort((a, b) => String(a?.created_at || '').localeCompare(String(b?.created_at || '')))
  }, [rows, jobId, range.start, range.end])

  const totals = useMemo(() => {
    let count = 0
    let totalAmount = 0
    let totalServiceFee = 0
    const byStatus = new Map()
    const byEmployer = new Map()

    for (const r of filtered) {
      count += 1
      const amount = Number(r?.amount)
      const serviceFee = Number(r?.service_fee_amount)
      if (Number.isFinite(amount)) totalAmount += amount
      if (Number.isFinite(serviceFee)) totalServiceFee += serviceFee

      const status = String(r?.status || 'unknown')
      byStatus.set(status, (byStatus.get(status) || 0) + 1)

      const employer = String(r?.employer_name || 'Employer')
      const agg = byEmployer.get(employer) || { employer, count: 0, amount: 0 }
      agg.count += 1
      if (Number.isFinite(amount)) agg.amount += amount
      byEmployer.set(employer, agg)
    }

    return {
      count,
      totalAmount,
      totalServiceFee,
      statusRows: Array.from(byStatus.entries()).map(([status, qty]) => ({ status, qty })),
      employerRows: Array.from(byEmployer.values()).sort((a, b) => b.amount - a.amount || b.count - a.count),
    }
  }, [filtered])

  async function exportPdf() {
    setExportBusy(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Job Payments Report', 40, 42)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Job: ${selectedJobName}`, 40, 60)
      doc.text(`Date range: ${fromIso || '—'} to ${toIso || '—'}${range.swapped ? ' (swapped)' : ''}`, 40, 74)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 88)

      autoTable(doc, {
        startY: 102,
        head: [['Payments', 'Amount', 'Service fee']],
        body: [[String(totals.count), toMoney(totals.totalAmount), toMoney(totals.totalServiceFee)]],
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      const y1 = doc.lastAutoTable?.finalY ?? 150
      autoTable(doc, {
        startY: y1 + 12,
        head: [['Status', 'Count']],
        body: totals.statusRows.map((r) => [r.status, String(r.qty)]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 64, 175] },
        theme: 'grid',
        tableWidth: 280,
        margin: { left: 40 },
      })

      const y2 = doc.lastAutoTable?.finalY ?? y1 + 80
      autoTable(doc, {
        startY: y2 + 12,
        head: [['Employer', 'Payments', 'Amount']],
        body: totals.employerRows.map((r) => [r.employer, String(r.count), toMoney(r.amount)]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [2, 132, 199] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      const y3 = doc.lastAutoTable?.finalY ?? y2 + 100
      autoTable(doc, {
        startY: y3 + 14,
        head: [['ID', 'Date', 'Job', 'Salary', 'Employer', 'Method', 'Amount', 'Service fee', 'Status']],
        body: filtered.map((r) => [
          String(r?.payment_id ?? ''),
          String(r?.created_at || '').slice(0, 10),
          String(r?.job_title ?? ''),
          toMoney(r?.salary_amount),
          String(r?.employer_name ?? ''),
          String(r?.payment_method ?? ''),
          toMoney(r?.amount),
          toMoney(r?.service_fee_amount),
          String(r?.status ?? ''),
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 23, 42] },
        theme: 'grid',
        tableWidth: pageW - 80,
        margin: { left: 40, right: 40 },
      })

      doc.save(reportFilename('pdf', { fromIso, toIso, jobName: selectedJobName }))
      toastSuccess('Job payment PDF report downloaded.')
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
        children: [new TextRun({ text: 'Job Payments Report', bold: true, size: 32 })],
        spacing: { after: 240 },
      })
      const meta = new Paragraph({
        children: [
          new TextRun({ text: `Job: ${selectedJobName}\n`, size: 22 }),
          new TextRun({ text: `Date range: ${fromIso || '—'} to ${toIso || '—'}${range.swapped ? ' (swapped)' : ''}\n`, size: 22 }),
          new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 22 }),
        ],
        spacing: { after: 240 },
      })

      const summary = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Payments', 'Amount', 'Service fee'].map((x) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: x, bold: true })] })] })),
          }),
          new TableRow({
            children: [String(totals.count), toMoney(totals.totalAmount), toMoney(totals.totalServiceFee)].map((x) => new TableCell({ children: [new Paragraph(x)] })),
          }),
        ],
      })

      const rowsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['ID', 'Date', 'Job', 'Salary', 'Employer', 'Method', 'Amount', 'Service fee', 'Status'].map(
              (x) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: x, bold: true })] })] }),
            ),
          }),
          ...filtered.map((r) => new TableRow({
            children: [
              String(r?.payment_id ?? ''),
              String(r?.created_at || '').slice(0, 10),
              String(r?.job_title ?? ''),
              toMoney(r?.salary_amount),
              String(r?.employer_name ?? ''),
              String(r?.payment_method ?? ''),
              toMoney(r?.amount),
              toMoney(r?.service_fee_amount),
              String(r?.status ?? ''),
            ].map((x) => new TableCell({ children: [new Paragraph(x)] })),
          })),
        ],
      })

      const doc = new Document({
        sections: [{ properties: {}, children: [title, meta, summary, new Paragraph({ text: '' }), rowsTable] }],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = reportFilename('docx', { fromIso, toIso, jobName: selectedJobName })
        document.body.appendChild(a)
        a.click()
        a.remove()
      } finally {
        URL.revokeObjectURL(url)
      }

      toastSuccess('Job payment Word report downloaded.')
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
          <h2 className="adminPanelTitle">Job payments reports</h2>
          <p className="dashSubtle" style={{ margin: 0 }}>
            Filter by job and date, then export payment report as PDF or Word.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="dashSubtle" style={{ fontSize: 12 }}>From</span>
          <input type="date" className="adminMgmtSearchInput" value={fromIso} onChange={(e) => setFromIso(e.target.value)} disabled={busy || exportBusy} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="dashSubtle" style={{ fontSize: 12 }}>To</span>
          <input type="date" className="adminMgmtSearchInput" value={toIso} onChange={(e) => setToIso(e.target.value)} disabled={busy || exportBusy} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="dashSubtle" style={{ fontSize: 12 }}>Job</span>
          <select className="adminMgmtSearchInput" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={busy || exportBusy}>
            <option value="all">All jobs</option>
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <span className="adminPanelBadge">Payments: {busy ? '…' : totals.count}</span>
        <span className="adminPanelBadge">Amount: {busy ? '…' : toMoney(totals.totalAmount)}</span>
        <span className="adminPanelBadge">Service fee: {busy ? '…' : toMoney(totals.totalServiceFee)}</span>
        <span className="adminPanelBadge">Average salary: {busy || totals.count === 0 ? '…' : toMoney(filtered.reduce((sum, r) => sum + (Number.isFinite(Number(r?.salary_amount)) ? Number(r.salary_amount) : 0), 0) / totals.count)}</span>
      </div>
    </section>
  )
}
