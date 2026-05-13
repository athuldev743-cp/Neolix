import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  // ✅ Fixed: React Router v6 uses <Outlet /> not {children}
  // The parent <Route element={<Layout />}> renders child routes via Outlet
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}