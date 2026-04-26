import { useEffect, useState } from 'react'
import AdminDatasetView from '../AdminDatasetView'
import { ADMIN_LS } from '../../../utils/adminNavigation'
import AdminUserManagementPage from '../AdminUserManagementPage'

const TAB_LS = ADMIN_LS.USERS_TAB

export default function UsersManagement() {
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_LS) || 'directory')

  useEffect(() => {
    localStorage.setItem(TAB_LS, tab)
  }, [tab])

  return (
    <div className="adminUserSection">
      <div className="adminShellTabRow" role="tablist" aria-label="Users views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'directory'}
          className={`adminShellTabBtn ${tab === 'directory' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('directory')}
        >
          Directory
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'records'}
          className={`adminShellTabBtn ${tab === 'records' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('records')}
        >
          All records
        </button>
      </div>
      {tab === 'directory' ? (
        <AdminUserManagementPage />
      ) : (
        <AdminDatasetView datasetKey="users" enabled={tab === 'records'} />
      )}
    </div>
  )
}
