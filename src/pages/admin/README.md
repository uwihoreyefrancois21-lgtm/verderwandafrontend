# Admin area

## Shell: `AdminDashboard.jsx` + `AdminDashboard.css`

- Blue / green / white theme (gradient canvas, navy sidebar, white content cards).
- **Sidebar** — Lucide icons, active row highlight, **Log out**
- **Top bar** — Gradient accent border, title, avatar
- **Main** — One section component; overview & tables use white rounded panels

Active section: `localStorage` key `verde_admin_active_section`.

## Dataset CRUD: `AdminDatasetView.jsx`

Single file under `pages/admin/` holds all logic + UI for listing/editing API datasets (no separate “panel” file). Each `sections/*Management.jsx` imports it:

```jsx
import AdminDatasetView from '../AdminDatasetView'
export default function EmployersManagement() {
  return <AdminDatasetView datasetKey="employers" />
}
```

- Tabbed sections pass `datasetKey={tab}`.
- **Users** → “All records” uses `<AdminDatasetView datasetKey="users" enabled={tab === 'records'} />`.

## Section files (`sections/`)

Each sidebar item has its own file; most only render `AdminDatasetView` with the right key. **Overview** uses `DashboardAdminApprovalsPage` via `OverviewManagement.jsx`.

## Deep links

`utils/adminNavigation.js` + legacy routes under `/dashboard/admin/*`.
