import { useEffect, useState } from 'react'
import AdminDatasetView from '../AdminDatasetView'
import JobPaymentsReports from './JobPaymentsReports'

export default function JobPaymentsManagement() {
  const TAB_LS = 'verde_admin_job_payments_tab'
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_LS) || 'payments')

  useEffect(() => {
    localStorage.setItem(TAB_LS, tab)
  }, [tab])

  return (
    <div>
      <div className="adminShellTabRow" role="tablist" aria-label="Job payments">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'payments'}
          className={`adminShellTabBtn ${tab === 'payments' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('payments')}
        >
          Payments
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reports'}
          className={`adminShellTabBtn ${tab === 'reports' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
      </div>
      {tab === 'reports' ? <JobPaymentsReports /> : <AdminDatasetView datasetKey="job_payments" />}
    </div>
  )
}
