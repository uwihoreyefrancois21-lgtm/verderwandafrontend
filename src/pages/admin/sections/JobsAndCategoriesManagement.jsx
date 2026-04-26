import { useEffect, useState } from 'react'
import AdminDatasetView from '../AdminDatasetView'
import { ADMIN_LS } from '../../../utils/adminNavigation'

const TAB_LS = ADMIN_LS.JOBS_TAB

export default function JobsAndCategoriesManagement() {
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_LS) || 'jobs')

  useEffect(() => {
    localStorage.setItem(TAB_LS, tab)
  }, [tab])

  return (
    <div>
      <div className="adminShellTabRow" role="tablist" aria-label="Jobs and categories">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'jobs'}
          className={`adminShellTabBtn ${tab === 'jobs' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('jobs')}
        >
          Jobs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'job_categories'}
          className={`adminShellTabBtn ${tab === 'job_categories' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('job_categories')}
        >
          Categories
        </button>
      </div>
      <AdminDatasetView datasetKey={tab} />
    </div>
  )
}
