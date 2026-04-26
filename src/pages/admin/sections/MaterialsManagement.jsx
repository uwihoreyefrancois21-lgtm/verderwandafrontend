import { useEffect, useState } from 'react'
import AdminDatasetView from '../AdminDatasetView'
import { ADMIN_LS } from '../../../utils/adminNavigation'

const TAB_LS = ADMIN_LS.MAT_TAB

export default function MaterialsManagement() {
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_LS) || 'materials')

  useEffect(() => {
    localStorage.setItem(TAB_LS, tab)
  }, [tab])

  return (
    <div>
      <div className="adminShellTabRow" role="tablist" aria-label="Materials and orders">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'materials'}
          className={`adminShellTabBtn ${tab === 'materials' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('materials')}
        >
          Materials
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'material_orders'}
          className={`adminShellTabBtn ${tab === 'material_orders' ? 'adminShellTabBtn--active' : ''}`}
          onClick={() => setTab('material_orders')}
        >
          Orders
        </button>
      </div>
      <AdminDatasetView datasetKey={tab} />
    </div>
  )
}
