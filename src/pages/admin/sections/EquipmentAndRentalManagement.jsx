import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminDatasetView from '../AdminDatasetView'
import { ADMIN_LS } from '../../../utils/adminNavigation'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/useAuth'
import EquipmentRentalReports from './EquipmentRentalReports'

const TAB_LS = ADMIN_LS.EQUIP_TAB

export default function EquipmentAndRentalManagement() {
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_LS) || 'equipment')
  const { token } = useAuth()
  const [equipment, setEquipment] = useState([])
  const [bookings, setBookings] = useState([])
  const [inventoryReport, setInventoryReport] = useState(null)
  const [stockSearch, setStockSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [showStockReport, setShowStockReport] = useState(false)
  const [stockEditOpen, setStockEditOpen] = useState(false)
  const [stockEditBusy, setStockEditBusy] = useState(false)
  const [stockEditError, setStockEditError] = useState('')
  const [stockEditTarget, setStockEditTarget] = useState(null)
  const [stockEditTotal, setStockEditTotal] = useState('0')
  const [stockEditCurrent, setStockEditCurrent] = useState('0')
  const [stockEditAvailability, setStockEditAvailability] = useState(true)
  const [stockListShowAll, setStockListShowAll] = useState(false)

  const reloadAll = useCallback(async () => {
    if (!token) return
    setBusy(true)
    try {
      const [eq, bk, rep] = await Promise.all([
        apiFetch('/equipment', { token }).catch(() => []),
        apiFetch('/equipment-bookings', { token }).catch(() => []),
        apiFetch('/equipment/inventory-report', { token }).catch(() => null),
      ])
      setEquipment(Array.isArray(eq) ? eq : [])
      setBookings(Array.isArray(bk) ? bk : [])
      setInventoryReport(Array.isArray(rep) ? rep : null)
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    localStorage.setItem(TAB_LS, tab)
  }, [tab])

  useEffect(() => {
    if (tab !== 'equipment_bookings') setStockListShowAll(false)
  }, [tab])

  useEffect(() => {
    setStockListShowAll(false)
  }, [stockSearch])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!token) return
      if (cancelled) return
      await reloadAll()
    })()
    return () => {
      cancelled = true
    }
  }, [token, reloadAll])

  // Keep owner stock view fresh while reviewing/approving bookings.
  useEffect(() => {
    if (!token) return
    if (tab !== 'equipment_bookings') return
    const t = setInterval(() => {
      void reloadAll()
    }, 5000)
    return () => clearInterval(t)
  }, [tab, token, reloadAll])

  const stockMismatchCount = useMemo(() => {
    if (!Array.isArray(inventoryReport)) return 0
    return inventoryReport.filter((r) => r.stock_math_matches_bookings === false).length
  }, [inventoryReport])

  const stockReportRows = useMemo(() => {
    if (!Array.isArray(inventoryReport)) return []
    const q = stockSearch.trim().toLowerCase()
    const mismatches = inventoryReport.filter((r) => r.stock_math_matches_bookings === false)
    const filtered = q ? mismatches.filter((r) => String(r.name || '').toLowerCase().includes(q)) : mismatches
    return filtered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }, [inventoryReport, stockSearch])

  const stockStats = useMemo(() => {
    const rows = []
    for (const eq of equipment) {
      const id = Number(eq.equipment_id)
      if (!Number.isFinite(id)) continue
      const name = String(eq.name || `Equipment #${id}`)
      const total = Math.max(0, Number.parseInt(eq.total_stock, 10) || 0)
      const available = Math.max(0, Number.parseInt(eq.current_stock, 10) || 0)
      const rented =
        typeof eq.rented_units === 'number'
          ? Math.max(0, eq.rented_units)
          : Math.max(0, total - available)
      rows.push({
        equipment_id: id,
        name,
        total,
        available,
        rented,
        listed: eq.availability !== false,
      })
    }
    rows.sort((a, b) => b.rented - a.rented || a.name.localeCompare(b.name))
    const q = stockSearch.trim().toLowerCase()
    const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
    const totalRentedUnits = rows.reduce((sum, r) => sum + r.rented, 0)
    const totalFleet = rows.reduce((sum, r) => sum + r.total, 0)
    return {
      rows: filtered,
      totalRentedUnits,
      totalFleet,
      pendingBookings: bookings.filter((b) => {
        const s = String(b.status || '').toLowerCase()
        return s === 'pending' || s === '' || s === 'new'
      }).length,
    }
  }, [equipment, bookings, stockSearch])

  const stockRowsToDisplay = useMemo(() => {
    if (stockStats.rows.length === 0) return []
    if (stockListShowAll) return stockStats.rows
    return stockStats.rows.slice(0, 1)
  }, [stockStats.rows, stockListShowAll])

  const stockHasMoreThanOne = stockStats.rows.length > 1

  return (
    <>
      <div>
      {tab === 'equipment_bookings' ? (
        <section className="adminPanel adminPanel--muted" style={{ marginBottom: 12 }}>
          <div className="adminPanelHead" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <h2 className="adminPanelTitle">View stock</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="search"
                className="adminMgmtSearchInput"
                placeholder="Filter equipment..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                style={{ minWidth: 220 }}
              />
              <span className="adminPanelBadge">Fleet units: {busy ? '…' : stockStats.totalFleet}</span>
              <span className="adminPanelBadge">Out on rent: {busy ? '…' : stockStats.totalRentedUnits}</span>
              <span className="adminPanelBadge">Pending bookings: {busy ? '…' : stockStats.pendingBookings}</span>
            </div>
          </div>

          {stockMismatchCount > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => setShowStockReport((v) => !v)}
                disabled={busy}
              >
                {showStockReport ? 'Hide stock report' : 'View stock report'}
              </button>
            </div>
          ) : null}

          {showStockReport ? (
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              {stockReportRows.length === 0 ? (
                <div className="adminEmpty">No mismatches for current filter.</div>
              ) : (
                stockReportRows.map((r) => {
                  const diff = Number(r.rented_units_from_stock) - Number(r.rented_units_from_bookings)
                  return (
                    <div key={r.equipment_id} className="adminModalRow" style={{ alignItems: 'center' }}>
                      <div className="adminModalDt">{r.name}</div>
                      <div className="adminModalDd">
                        <div style={{ fontSize: 13 }}>
                          From fleet: <strong>{r.rented_units_from_stock}</strong> · From bookings:{' '}
                          <strong>{r.rented_units_from_bookings}</strong> · Difference: <strong>{diff}</strong>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : null}

          {stockStats.rows.length === 0 ? (
            <div className="adminEmpty">{busy ? 'Loading stock…' : 'No equipment records.'}</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {stockHasMoreThanOne && !stockListShowAll ? (
                <p className="dashSubtle" style={{ margin: 0, fontSize: 13 }}>
                  Showing 1 of {stockStats.rows.length} equipment rows. Use View all for the full list.
                </p>
              ) : null}
              {stockRowsToDisplay.map((row) => {
                const sum = row.rented + row.available
                const rf = row.total > 0 ? row.rented / row.total : sum > 0 ? row.rented / sum : 0
                const rentedPct = Math.round(rf * 100)
                return (
                  <div key={row.equipment_id} className="adminModalRow" style={{ alignItems: 'center' }}>
                    <div className="adminModalDt">{row.name}</div>
                    <div className="adminModalDd">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 13 }}>
                          <strong>{row.rented}</strong> rented · <strong>{row.available}</strong> available ·{' '}
                          <strong>{row.total}</strong> fleet · {row.listed ? 'Listed' : 'Not listed'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="dashSubtle" style={{ minWidth: 52, fontSize: 11 }}>
                            {row.total > 0 || row.rented > 0 ? `${rentedPct}% rented` : '—'}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: 10,
                              background: 'rgba(148,163,184,.2)',
                              borderRadius: 999,
                              display: 'flex',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              title={`Rented: ${row.rented}`}
                              style={{
                                flex: row.rented > 0 ? Math.max(0.08, row.rented) : 0,
                                minWidth: row.rented > 0 ? 4 : 0,
                                background: 'linear-gradient(90deg,#f59e0b,#ef4444)',
                              }}
                            />
                            <div
                              title={`Available: ${row.available}`}
                              style={{
                                flex: row.available > 0 ? Math.max(0.08, row.available) : 0,
                                minWidth: row.available > 0 ? 4 : 0,
                                background: 'linear-gradient(90deg,#1fbf75,#4f8cff)',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btnOutline btnSm"
                          disabled={busy || stockEditBusy}
                          onClick={() => {
                            setStockEditError('')
                            setStockEditTarget(row)
                            setStockEditTotal(String(row.total ?? 0))
                            setStockEditCurrent(String(row.available ?? 0))
                            setStockEditAvailability(Boolean(row.listed))
                            setStockEditOpen(true)
                          }}
                        >
                          Record / Update stock
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {stockHasMoreThanOne ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                  <button
                    type="button"
                    className="btn btnOutline btnSm"
                    onClick={() => setStockListShowAll((v) => !v)}
                    disabled={busy}
                  >
                    {stockListShowAll ? 'Show less' : `View all equipment (${stockStats.rows.length})`}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <div className="adminShellTabRow" role="tablist" aria-label="Equipment and rentals">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'equipment'}
          className={`adminShellTabBtn ${tab === 'equipment' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('equipment')}
        >
          Equipment
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'equipment_bookings'}
          className={`adminShellTabBtn ${tab === 'equipment_bookings' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('equipment_bookings')}
        >
          Rentals
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'equipment_reports'}
          className={`adminShellTabBtn ${tab === 'equipment_reports' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('equipment_reports')}
        >
          Reports
        </button>
      </div>
      {tab === 'equipment_reports' ? <EquipmentRentalReports /> : <AdminDatasetView datasetKey={tab} />}
    </div>

      {stockEditOpen && stockEditTarget ? (
      <div
        className="adminModalOverlay"
        role="presentation"
        onClick={() => {
          if (stockEditBusy) return
          setStockEditOpen(false)
        }}
      >
        <div
          className="adminModal adminModal--wideGeneric"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="adminModalHead">
            <h2 className="adminModalTitle">Record equipment stock</h2>
            <button
              type="button"
              className="adminModalClose"
              onClick={() => {
                if (stockEditBusy) return
                setStockEditOpen(false)
              }}
              disabled={stockEditBusy}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form
            className="adminModalBody"
            onSubmit={async (e) => {
              e.preventDefault()
              setStockEditError('')

              const tTot = Number.parseInt(String(stockEditTotal || '').trim(), 10)
              const tCur = Number.parseInt(String(stockEditCurrent || '').trim(), 10)
              if (!Number.isFinite(tTot) || tTot < 0) return setStockEditError('Total stock must be >= 0.')
              if (!Number.isFinite(tCur) || tCur < 0) return setStockEditError('Current stock must be >= 0.')
              if (tCur > tTot) return setStockEditError('Current stock cannot exceed total stock.')
              if (!token) return setStockEditError('Missing auth token.')

              setStockEditBusy(true)
              try {
                const fd = new FormData()
                fd.append('total_stock', String(tTot))
                fd.append('current_stock', String(tCur))
                fd.append('availability', stockEditAvailability ? 'true' : 'false')

                await apiFetch(`/equipment/${stockEditTarget.equipment_id}`, {
                  method: 'PATCH',
                  token,
                  formData: fd,
                })

                setStockEditOpen(false)
                await reloadAll()
              } catch (err) {
                setStockEditError(err?.message || 'Failed to update stock.')
              } finally {
                setStockEditBusy(false)
              }
            }}
          >
            {stockEditError ? (
              <div className="toast error" style={{ position: 'static', marginBottom: 12, transform: 'none', left: 'auto', bottom: 'auto' }}>
                {stockEditError}
              </div>
            ) : null}

            <div className="adminModalList">
              <div className="adminModalRow adminModalRow--field">
                <span className="adminModalDt">Equipment</span>
                <div className="adminModalDd" style={{ fontWeight: 600 }}>
                  {stockEditTarget.name}
                </div>
              </div>

              <label className="adminModalRow adminModalRow--field">
                <span className="adminModalDt">Fleet (total units)</span>
                <input
                  type="number"
                  min={0}
                  className="adminMgmtSearchInput"
                  value={stockEditTotal}
                  onChange={(e) => setStockEditTotal(e.target.value)}
                  disabled={stockEditBusy}
                  required
                />
              </label>

              <label className="adminModalRow adminModalRow--field">
                <span className="adminModalDt">Units available now</span>
                <input
                  type="number"
                  min={0}
                  className="adminMgmtSearchInput"
                  value={stockEditCurrent}
                  onChange={(e) => setStockEditCurrent(e.target.value)}
                  disabled={stockEditBusy}
                  required
                />
              </label>

              <label className="adminModalRow adminModalRow--field" style={{ alignItems: 'center' }}>
                <span className="adminModalDt">Listed as available</span>
                <input
                  type="checkbox"
                  checked={Boolean(stockEditAvailability)}
                  onChange={(e) => setStockEditAvailability(e.target.checked)}
                  disabled={stockEditBusy}
                />
              </label>
            </div>

            <div className="adminModalFooter adminModalFooter--solo">
              <button
                type="button"
                className="btn btnOutline btnSm"
                onClick={() => {
                  if (stockEditBusy) return
                  setStockEditOpen(false)
                }}
                disabled={stockEditBusy}
              >
                Cancel
              </button>
              <button type="submit" className="btn btnGreen btnSm" disabled={stockEditBusy}>
                {stockEditBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : null}
    </>
  )
}
